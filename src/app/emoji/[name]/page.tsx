import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ExpandSummary } from "@/components/emoji/expand-summary";
import { JsonLd } from "@/components/emoji/json-ld";
import { PackDetails } from "@/components/emoji/pack-details";
import { SimilarPacks } from "@/components/emoji/similar-packs";
import { PackSheet } from "@/components/emoji/pack-sheet";
import { toCardEmoji } from "@/lib/emoji-card";
import { getSimilarPackCards } from "@/lib/emoji-recommendations";
import { getLibraryPack } from "@/lib/emoji-library";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { emojiBreadcrumbs, emojiMetadata } from "@/lib/emoji-metadata";
import { siteUrl } from "@/lib/site-url";
import { packAbout } from "@/lib/emoji-pack-about";

// Keep real packs on demand. Prerendering every pack in separate workers floods Telegram.
// Cache Components needs one build-time parameter, so validate with an unlisted name.
export function generateStaticParams() {
  return [{ name: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/emoji/[name]">): Promise<Metadata> {
  const { name } = await params;
  const data = await getLibraryPack(name);
  if (!data) return { title: "Emoji pack not found | Telegram Emoji Library", alternates: { canonical: null }, robots: { index: false } };
  const { pack } = data;
  const title = `${pack.title} | Telegram Emoji Pack`;
  const format = new Intl.ListFormat("en", { type: "conjunction" }).format(pack.formats);
  const what = packAbout(pack.name)?.what;
  const description = what
    ? `${what} Copy the Telegram custom emoji IDs, message HTML, and bot button icons.`
    : `Browse ${pack.count} ${format} Telegram custom emoji in ${pack.title}. Copy IDs, message HTML, and bot button icons.`;
  return emojiMetadata(emojiPackPath(pack.name), title, description);
}

export default async function EmojiPackPage({ params }: PageProps<"/emoji/[name]">) {
  const { name } = await params;
  const data = await getLibraryPack(name);
  if (!data) notFound();
  const { pack, emoji } = data;
  const path = emojiPackPath(pack.name);
  return (
    <>
      <JsonLd value={emojiBreadcrumbs({ name: "Emoji Library", path: "/emoji" }, { name: pack.title, path })} />
      <Link href="/emoji" prefetch={false} className="tg-accent mb-3 inline-flex items-center gap-0.5 rounded px-1 text-[15px]">
        <ChevronLeft aria-hidden="true" className="size-5" /> Emoji Library
      </Link>
      <PackSheet
        key={pack.name}
        pack={{ name: pack.name, title: pack.title, link: pack.link, count: pack.count, formats: pack.formats, meanings: pack.meanings }}
        entries={emoji.map((item) => [toCardEmoji(item), item.search])}
        pageUrl={siteUrl() + path}
      />
      <Suspense fallback={null}>
        <Recommendations name={pack.name} />
      </Suspense>
      <PackDetails name={pack.name} category={pack.category} tags={pack.tags} />
      <details className="tg-glass group mt-5 rounded-2xl px-4 py-3 text-sm">
        <ExpandSummary count={pack.count}>Custom emoji IDs in this pack</ExpandSummary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr><th scope="col">Fallback</th><th scope="col">Custom emoji ID</th><th scope="col">Format</th><th scope="col">Tags</th></tr></thead>
            <tbody>
              {emoji.map((item) => (
                <tr key={item.id} className="border-t border-[var(--tg-sep)]">
                  <td className="py-1 pr-3">{item.fallback || "—"}</td>
                  <td className="pr-3 font-mono"><a className="tg-accent hover:underline" href={`#e=${item.id}`}>{item.id}</a></td>
                  <td className="pr-3 capitalize">{item.format}{item.adaptive ? " · adaptive" : ""}</td>
                  <td className="tg-hint">{item.tags.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <nav aria-label="Custom emoji help" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm">
        <Link className="tg-accent underline" href={EMOJI_GUIDE_PATH}>Use custom emoji in a Telegram bot</Link>
        <Link className="tg-accent underline" href={EMOJI_API_DOCS_PATH}>Emoji Library JSON API</Link>
        <a className="tg-accent underline" href={`/api/emoji-pack/${pack.name}`}>This pack as JSON</a>
      </nav>
    </>
  );
}

async function Recommendations({ name }: { name: string }) {
  return <SimilarPacks packs={await getSimilarPackCards(name)} />;
}
