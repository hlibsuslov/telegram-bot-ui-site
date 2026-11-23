// Emoji file URLs, and the compact form of a pack card the library page sends to the browser.
// The page lists hundreds of packs: full emoji objects with three URLs each made its payload over
// a megabyte, so a card carries [id, fallback, flags] per sample and the browser rebuilds the rest.
export type Format = "static" | "animated" | "video";

/** One emoji as the browser draws it (premium-emoji.tsx). */
export type EmojiData = {
  id: string; fallback: string; format: Format;
  preview: string | null; animation: string | null;
  /** a video emoji's thumbnail; without it the WEBM itself is the still */
  still?: string | null;
  /** needs_repainting: Telegram draws it in the text color (single-color icon packs) */
  adaptive?: boolean;
};

/** /api/emoji-pack/<pack>/<id>: the picture (WEBP, the WEBM of a video emoji, the thumbnail of a TGS);
 *  /anim: the TGS of an animated emoji; /still: the thumbnail of a video emoji. */
export function emojiFile(pack: string, id: string, kind?: "anim" | "still"): string {
  return `/api/emoji-pack/${pack}/${id}${kind ? `/${kind}` : ""}`;
}

const FORMATS: Format[] = ["static", "animated", "video"];
const ADAPTIVE = 4;
const PREVIEW = 8;
const STILL = 16;

/** [custom emoji id, fallback emoji, flags: format index | adaptive | has preview | has still] */
export type CardEmoji = [string, string, number];

export interface CardPack {
  name: string; title: string; category: string; count: number; formats: Format[];
  /** share of emoji drawn in the text colour, rounded */
  adaptiveShare: number;
  /** how many common bot interface meanings the pack covers */
  covers: number;
  sample: CardEmoji[];
}

export function toCardEmoji(e: { id: string; fallback: string; format: Format; adaptive: boolean; preview: string | null; still: string | null }): CardEmoji {
  return [e.id, e.fallback, FORMATS.indexOf(e.format) | (e.adaptive ? ADAPTIVE : 0) | (e.preview ? PREVIEW : 0) | (e.still ? STILL : 0)];
}

export function fromCardEmoji(pack: string, [id, fallback, flags]: CardEmoji): EmojiData {
  const format = FORMATS[flags & 3] ?? "static";
  return {
    id, fallback, format, adaptive: !!(flags & ADAPTIVE),
    preview: flags & PREVIEW ? emojiFile(pack, id) : null,
    animation: format === "animated" ? emojiFile(pack, id, "anim") : null,
    still: flags & STILL ? emojiFile(pack, id, "still") : null,
  };
}
