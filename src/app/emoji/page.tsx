import Link from "next/link";
import { LibraryApp } from "@/components/emoji/library-app";
import { JsonLd } from "@/components/emoji/json-ld";
import { cardPack, getLibrary } from "@/lib/emoji-library";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { emojiMetadata } from "@/lib/emoji-metadata";
import { siteUrl } from "@/lib/site-url";

const TITLE = "Telegram Emoji Library: Premium Packs & Custom Emoji IDs";
const DESCRIPTION =
  "Search Telegram premium emoji packs by name, meaning, or emoji. Copy a custom emoji ID, message HTML, or icon_custom_emoji_id for a bot button.";

export const metadata = emojiMetadata("/emoji", TITLE, DESCRIPTION);

export default async function EmojiLibraryPage() {
  const library = await getLibrary();
  const emoji = library.packs.reduce((n, p) => n + p.count, 0);
  return (
    <>
      <JsonLd value={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Telegram Emoji Library", url: `${siteUrl()}/emoji` }} />
      <h1 className="sr-only">Telegram Emoji Library</h1>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-1 text-[13px]">
        <p className="tg-hint">{library.packs.length} packs · {emoji.toLocaleString("en-US")} emoji · hover to play · saved packs stay in this browser</p>
        <Link className="tg-accent underline" href={`${EMOJI_API_DOCS_PATH}#lookup`}>Find a pack by custom emoji ID</Link>
      </div>
      <LibraryApp packs={library.packs.map(cardPack)} categories={library.categories} collections={library.collections} />
      <nav aria-label="Custom emoji help" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm">
        <Link className="tg-accent underline" href={EMOJI_GUIDE_PATH}>Use custom emoji in a Telegram bot</Link>
        <Link className="tg-accent underline" href={EMOJI_API_DOCS_PATH}>Emoji Library JSON API</Link>
      </nav>
      {library.packs.length > 0 && (
        <details className="tg-glass mt-4 rounded-2xl px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Pack directory ({library.packs.length})</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {library.categories.map((category) => (
              <section key={category}>
                <h2 className="mb-1 font-semibold">{category}</h2>
                <ul className="space-y-1">
                  {library.packs.filter((pack) => pack.category === category).map((pack) => (
                    <li key={pack.name}><Link href={emojiPackPath(pack.name)} prefetch={false} className="tg-accent hover:underline">{pack.title}</Link></li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
