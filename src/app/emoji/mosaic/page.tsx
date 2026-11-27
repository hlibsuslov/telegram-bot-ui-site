import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/emoji/json-ld";
import { MosaicStudio } from "@/components/emoji/mosaic-studio";
import { EMOJI_GUIDE_PATH, EMOJI_LIBRARY_PATH, EMOJI_MOSAIC_PATH } from "@/lib/emoji-links";
import { emojiBreadcrumbs, emojiMetadata } from "@/lib/emoji-metadata";

const TITLE = "Telegram emoji mosaic maker: a video as a premium emoji pack";
const DESCRIPTION =
  "Turn a video, GIF or picture into a Telegram premium emoji pack that rebuilds the picture in one message. Pick the grid, crop and the emoji behind each tile.";

export const metadata = emojiMetadata(EMOJI_MOSAIC_PATH, TITLE, DESCRIPTION);

const LIMITS: [value: string, label: string][] = [
  ["100×100", "pixels per tile"],
  ["3 s · 30 FPS", "longest video"],
  ["256 KB", "per video tile"],
  ["100", "emoji per message"],
  ["≤ 7", "columns for narrow phones"],
];

export default function EmojiMosaicPage() {
  return (
    <>
      <JsonLd value={emojiBreadcrumbs({ name: "Emoji Library", path: EMOJI_LIBRARY_PATH }, { name: "Emoji mosaic maker", path: EMOJI_MOSAIC_PATH })} />
      <MosaicStudio />

      <section aria-labelledby="mosaic-limits" className="mx-auto mt-12 max-w-4xl">
        <div className="flex min-h-8 items-end justify-between gap-2 px-4 pb-1.5">
          <h2 id="mosaic-limits" className="tg-section-title uppercase">Telegram&rsquo;s limits</h2>
          <a href="https://core.telegram.org/stickers" className="tg-accent inline-flex items-center gap-0.5 rounded text-[13px] hover:underline">
            The rules <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
        <dl className="tg-glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[var(--tg-sep)] sm:grid-cols-5">
          {LIMITS.map(([value, label], i) => (
            <div key={label} className={`flex flex-col-reverse gap-0.5 bg-[var(--tg-card)] px-4 py-3 ${i === LIMITS.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="tg-hint text-[12px] leading-snug">{label}</dt>
              <dd className="text-[15px] font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="tg-hint px-4 pt-2 text-[13px] leading-snug">
          Prefer your own bot? Download the tiles and use the <Link className="tg-accent hover:underline" href="/#install">telegram-bot-ui skill</Link> or the <Link className="tg-accent hover:underline" href={EMOJI_GUIDE_PATH}>custom emoji guide</Link>.
        </p>
      </section>
    </>
  );
}
