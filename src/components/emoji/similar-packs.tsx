"use client";

import type { CardPack } from "@/lib/emoji-card";
import { PackCard } from "./pack-card";
import { useSaved } from "./saved";

export function SimilarPacks({ packs }: { packs: CardPack[] }) {
  const { saved, togglePack } = useSaved();
  if (!packs.length) return null;
  return (
    <section aria-labelledby="similar-title" className="mt-6">
      <h2 id="similar-title" className="mb-2 px-1 text-lg font-semibold">Similar packs</h2>
      <div className="tg-scroll-x -mx-3 flex snap-x scroll-px-3 gap-3 overflow-x-auto px-3 pb-1">
        {packs.map((pack) => (
          <PackCard key={pack.name} pack={pack} saved={saved.packs.includes(pack.name)} onSave={togglePack}
            className="w-[min(19rem,85vw)] shrink-0 snap-start 2xl:w-[22rem]" />
        ))}
      </div>
    </section>
  );
}
