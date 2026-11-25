import { previewSrc, type PreviewEmoji } from "@/content/emoji-showcase";
import { cn } from "@/lib/utils";

/** One real custom emoji as a static SVG frame. Adaptive ones follow the text colour, as in Telegram. */
export function EmojiGlyph({ emoji, className, label }: { emoji: PreviewEmoji; className?: string; label?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static SVGs; the image optimizer does not process SVG.
    <img
      src={previewSrc(emoji)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("inline-block size-7 shrink-0 select-none", emoji.adaptive && "dark:invert", className)}
    />
  );
}
