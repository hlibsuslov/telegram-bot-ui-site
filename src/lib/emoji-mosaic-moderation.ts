// The content check behind pack creation on the mosaic page. Claude looks at frames of the whole mosaic (not single
// tiles, which hide what the picture shows) and returns a structured verdict. The check fails closed: an error, a
// timeout, a refusal or an unreadable answer all mean "don't publish".
//
// It runs twice: on frames the browser sends before any tile is uploaded (fast, saves the upload), and on frames the
// server rebuilds from the tiles that actually landed in the set (authoritative: a modified client can't swap them).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODERATION_MODEL = "claude-opus-5-5";
const MAX_FRAMES = 6;
const MAX_FRAME_BYTES = 600 * 1024;

const CATEGORIES = [
  "sexual",
  "minors",
  "violence_gore",
  "self_harm",
  "weapons",
  "drugs",
  "hate_extremism",
  "terrorism",
  "personal_data",
  "shock",
] as const;

const Verdict = z.object({
  allowed: z.boolean(),
  categories: z.array(z.enum(CATEGORIES)),
  reason: z.string(),
});
export type ModerationVerdict = { allowed: boolean; categories: string[]; reason: string };

const SYSTEM = `You review frames of an image or short video that a website visitor wants to publish as a public Telegram custom emoji pack. The pack is created by the website's bot, so anything harmful in it is attributed to the website.

Look at every frame together and decide whether the pack may be published. Refuse it (allowed: false) when any frame shows:
- sexual: nudity, sexual acts, sexualised poses or fetish content, including drawn or AI-generated;
- minors: any child or teenager in a sexualised, abusive or exploitative context (always refuse);
- violence_gore: graphic injury, blood, killing, torture, animal cruelty;
- self_harm: self-harm, suicide, eating-disorder promotion;
- weapons: weapons used to threaten people or glorified with intent to harm;
- drugs: illegal drug use, sale or promotion;
- hate_extremism: hate symbols (for example swastikas or other extremist insignia), slurs, dehumanising content about a protected group, extremist propaganda;
- terrorism: terrorist organisations' imagery or propaganda;
- personal_data: readable personal data of a private person (phone numbers, addresses, documents, bank cards) or content targeting a private individual;
- shock: content meant to disgust or frighten (corpses, extreme medical imagery, screamers).

Allow ordinary content: people, faces, pets, food, landscapes, logos, memes, text, games, cartoons, sport, fashion and swimwear without nudity, news-style imagery without gore, toy or sport weapons in harmless contexts.

When a frame is unclear, judge by what a reasonable moderator of a public platform would decide; if you are genuinely unsure whether sexual content involves a minor, refuse. List every category that applies. Write the reason in one short English sentence a visitor can read; never describe explicit details.`;

let client: Anthropic | null = null;

export function moderationEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

/** Frames as JPEG or PNG bytes. Throws when the check can't run; the caller must then refuse to publish. */
export async function moderateFrames(frames: { data: Uint8Array; type: "image/jpeg" | "image/png" }[]): Promise<ModerationVerdict> {
  if (!frames.length) return { allowed: false, categories: [], reason: "No frames to check." };
  const usable = frames.slice(0, MAX_FRAMES).filter((f) => f.data.length > 0 && f.data.length <= MAX_FRAME_BYTES);
  if (usable.length !== Math.min(frames.length, MAX_FRAMES)) return { allowed: false, categories: [], reason: "A frame couldn't be checked." };
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 2 });
  const response = await client.beta.messages.parse({
    model: MODERATION_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(Verdict) },
    messages: [{
      role: "user",
      content: [
        ...usable.map((f) => ({ type: "image" as const, source: { type: "base64" as const, media_type: f.type, data: Buffer.from(f.data).toString("base64") } })),
        { type: "text" as const, text: `${usable.length} frame(s) of one emoji mosaic, in time order. Decide whether it may be published.` },
      ],
    }],
  });
  if (response.stop_reason === "refusal") return { allowed: false, categories: [], reason: "The content check declined to review these frames." };
  const verdict = response.parsed_output;
  if (!verdict) return { allowed: false, categories: [], reason: "The content check gave no clear answer." };
  return { allowed: verdict.allowed && verdict.categories.length === 0, categories: verdict.categories, reason: verdict.reason.slice(0, 200) };
}

// ------------------------------------------------------------------ who was refused

const blocked = new Map<number, number>();
const BLOCK_MS = 24 * 60 * 60 * 1000;

/** A visitor whose pack failed the check can't start another for a day (per server instance). */
export function blockUser(id: number, now = Date.now()): void {
  blocked.set(id, now + BLOCK_MS);
  if (blocked.size > 10_000) for (const [k, until] of blocked) if (until < now) blocked.delete(k);
}

export function isBlocked(id: number, now = Date.now()): boolean {
  const until = blocked.get(id);
  if (until && until > now) return true;
  if (until) blocked.delete(id);
  return false;
}
