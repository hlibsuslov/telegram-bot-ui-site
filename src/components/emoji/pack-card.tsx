"use client";

import Link, { useLinkStatus } from "next/link";
import { memo, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { fromCardEmoji, type CardPack } from "@/lib/emoji-card";
import { emojiPackPath, telegramPackUrl } from "@/lib/emoji-links";
import { BOT_SLOTS } from "@/lib/emoji-slots";
import { cn } from "@/lib/utils";
import { EmojiMotion, EmojiStill, isMouse } from "./premium-emoji";

const FORMAT_LABEL = { static: "Static", animated: "Animated", video: "Video" } as const;

function PackLinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 aria-hidden="true" className="size-3.5 motion-safe:animate-spin" />;
}

/** Memoized, with a stable onSave(name): typing in search re-renders the page, not every card. */
export const PackCard = memo(function PackCard({ pack, saved, onSave, className }: { pack: CardPack; saved: boolean; onSave: (name: string) => void; className?: string }) {
  const [hot, setHot] = useState(false);
  const href = emojiPackPath(pack.name);
  return (
    <article
      className={cn("tg-glass tg-card flex flex-col rounded-2xl p-3.5", className)}
      onPointerEnter={(e) => isMouse(e) && setHot(true)} onPointerLeave={() => setHot(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && setHot(true)} onBlur={() => setHot(false)}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold"><Link href={href} prefetch={false} className="rounded hover:underline">{pack.title}</Link></h3>
          <p className="tg-hint truncate text-[13px]">
            {pack.count} emoji · {pack.formats.map((f) => FORMAT_LABEL[f]).join(", ")}{pack.adaptiveShare >= 0.5 ? " · ◐ any theme" : ""}{pack.covers >= 6 ? ` · ${pack.covers}/${BOT_SLOTS.length} bot icons` : ""}
          </p>
        </div>
        <button
          type="button" onClick={() => onSave(pack.name)} aria-pressed={saved} aria-label={saved ? `Remove ${pack.title} from saved` : `Save ${pack.title}`}
          className="tg-cell -mt-1 -mr-1 inline-flex size-9 items-center justify-center rounded-full"
        >
          <Star aria-hidden="true" className={cn("size-[18px]", saved ? "fill-amber-400 text-amber-500" : "tg-hint")} />
        </button>
      </div>
      <Link href={href} prefetch={false} tabIndex={-1} aria-hidden="true" className="mt-2.5 grid grid-cols-8 gap-1">
        {pack.sample.map((t) => {
          const e = fromCardEmoji(pack.name, t);
          return <EmojiStill key={e.id} emoji={e} size={28} className="mx-auto">{hot && e.format !== "static" ? <EmojiMotion emoji={e} /> : null}</EmojiStill>;
        })}
      </Link>
      <div className="mt-auto flex items-center gap-4 pt-3">
        <Link href={href} prefetch={false} aria-label={`Open pack ${pack.title}`} className="tg-button inline-flex h-8 items-center rounded-full gap-1.5 px-4 text-sm font-medium">Open pack <PackLinkPending /></Link>
        <a href={telegramPackUrl(pack.name)} target="_blank" rel="noopener noreferrer" aria-label={`Add to Telegram · ${pack.title}`} className="tg-accent rounded text-sm hover:underline">Add to Telegram</a>
        {pack.count > pack.sample.length ? <span className="tg-hint ml-auto text-xs">+{pack.count - pack.sample.length}</span> : null}
      </div>
    </article>
  );
});
