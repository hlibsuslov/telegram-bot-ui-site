import Link from "next/link";
import { ExpandSummary } from "@/components/emoji/expand-summary";
import { LibraryApp } from "@/components/emoji/library-app";
import { JsonLd } from "@/components/emoji/json-ld";
import { SeoGuide, faqJsonLd } from "@/components/emoji/seo-guide";
import { LIBRARY_COPY, type Locale, OG_LOCALE, languages, libraryPath, mosaicPath } from "@/content/emoji-seo";
import { cardPack, getLibrary } from "@/lib/emoji-library";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { emojiMetadata } from "@/lib/emoji-metadata";
import { siteUrl } from "@/lib/site-url";

const LINKS: Record<Locale, { lookup: string; guide: string; api: string; mosaic: string; directory: string; stats: (packs: number, emoji: string) => string }> = {
  en: { lookup: "Find a pack by custom emoji ID", guide: "Use custom emoji in a Telegram bot", api: "Emoji Library JSON API", mosaic: "Make an emoji picture from a photo or video", directory: "Pack directory", stats: (p, e) => `${p} packs · ${e} emoji · hover to play · saved packs stay in this browser` },
  ru: { lookup: "Найти пак по ID эмодзи", guide: "Кастомные эмодзи в боте Telegram", api: "JSON API библиотеки", mosaic: "Сделать картинку из эмодзи по фото или видео", directory: "Каталог паков", stats: (p, e) => `${p} паков · ${e} эмодзи · наведите, чтобы проиграть` },
  uk: { lookup: "Знайти пак за ID емодзі", guide: "Кастомні емодзі в боті Telegram", api: "JSON API бібліотеки", mosaic: "Зробити картинку з емодзі з фото або відео", directory: "Каталог паків", stats: (p, e) => `${p} паків · ${e} емодзі · наведіть, щоб програти` },
};

export function libraryMetadata(locale: Locale) {
  const copy = LIBRARY_COPY[locale];
  return emojiMetadata(libraryPath(locale), copy.title, copy.description, "website", { languages: languages(libraryPath), locale: OG_LOCALE[locale], keywords: copy.keywords });
}

export async function LibraryLanding({ locale }: { locale: Locale }) {
  const library = await getLibrary();
  const copy = LIBRARY_COPY[locale];
  const t = LINKS[locale];
  const emoji = library.packs.reduce((n, p) => n + p.count, 0);
  return (
    <>
      <JsonLd value={{ "@context": "https://schema.org", "@type": "CollectionPage", name: copy.h1, description: copy.description, inLanguage: locale, url: `${siteUrl()}${libraryPath(locale)}` }} />
      <JsonLd value={faqJsonLd(copy, locale)} />
      {locale === "en" ? (
        <h1 className="sr-only">{copy.h1}</h1>
      ) : (
        <header lang={locale} className="mb-4 px-1">
          <h1 className="text-2xl font-semibold tracking-tight">{copy.h1}</h1>
          <p className="tg-hint mt-1 max-w-3xl text-[15px]">{copy.lead}</p>
        </header>
      )}
      <div lang={locale} className="mb-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-1 text-[13px]">
        <p className="tg-hint">{t.stats(library.packs.length, emoji.toLocaleString(locale === "en" ? "en-US" : locale))}</p>
        <Link className="tg-accent underline" href={`${EMOJI_API_DOCS_PATH}#lookup`}>{t.lookup}</Link>
      </div>
      <LibraryApp packs={library.packs.map(cardPack)} categories={library.categories} collections={library.collections} />
      <nav lang={locale} aria-label="Custom emoji help" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm">
        <Link className="tg-accent underline" href={EMOJI_GUIDE_PATH}>{t.guide}</Link>
        <Link className="tg-accent underline" href={EMOJI_API_DOCS_PATH}>{t.api}</Link>
        <Link className="tg-accent underline" href={mosaicPath(locale)}>{t.mosaic}</Link>
      </nav>
      {library.packs.length > 0 && (
        <details className="tg-glass group mt-4 rounded-2xl px-4 py-3 text-sm">
          <ExpandSummary count={library.packs.length}>{t.directory}</ExpandSummary>
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
      <SeoGuide copy={copy} locale={locale} pathFor={libraryPath} />
    </>
  );
}
