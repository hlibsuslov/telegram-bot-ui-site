import Link from "next/link";
import { JsonLd } from "@/components/emoji/json-ld";
import { MosaicStudio } from "@/components/emoji/mosaic-studio";
import { EMOJI_GUIDE_PATH, EMOJI_LIBRARY_PATH, EMOJI_MOSAIC_PATH } from "@/lib/emoji-links";
import { emojiBreadcrumbs, emojiMetadata } from "@/lib/emoji-metadata";

const TITLE = "Telegram emoji mosaic maker: a video as a premium emoji pack";
const DESCRIPTION =
  "Turn a video, GIF or picture into a Telegram premium emoji pack that rebuilds the picture in one message. Pick the grid, crop and the emoji behind each tile.";

export const metadata = emojiMetadata(EMOJI_MOSAIC_PATH, TITLE, DESCRIPTION);

const LIMITS = ["Tiles 100×100", "video up to 3 s, 30 FPS, 256 KB", "up to 100 emoji per message", "8 columns fit every phone"];

export default function EmojiMosaicPage() {
  return (
    <>
      <JsonLd value={emojiBreadcrumbs({ name: "Emoji Library", path: EMOJI_LIBRARY_PATH }, { name: "Emoji mosaic maker", path: EMOJI_MOSAIC_PATH })} />
      <MosaicStudio />

      <footer className="tg-hint mx-auto mt-10 max-w-3xl space-y-1.5 px-4 text-center text-[13px] leading-relaxed">
        <p>{LIMITS.join("  ·  ")} · <a className="tg-accent hover:underline" href="https://core.telegram.org/stickers">Telegram&rsquo;s rules</a></p>
        <p>
          Prefer your own bot? Download the tiles and use the <Link className="tg-accent hover:underline" href="/#install">telegram-bot-ui skill</Link> or the <Link className="tg-accent hover:underline" href={EMOJI_GUIDE_PATH}>custom emoji guide</Link>.
        </p>
      </footer>
    </>
  );
}
