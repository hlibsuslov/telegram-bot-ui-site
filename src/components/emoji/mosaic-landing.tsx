import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/emoji/json-ld";
import { MosaicStudio } from "@/components/emoji/mosaic-studio";
import { SeoGuide, faqJsonLd, howToJsonLd, webAppJsonLd } from "@/components/emoji/seo-guide";
import { type Locale, MOSAIC_COPY, OG_LOCALE, languages, libraryPath, mosaicPath } from "@/content/emoji-seo";
import { EMOJI_GUIDE_PATH } from "@/lib/emoji-links";
import { emojiBreadcrumbs, emojiMetadata } from "@/lib/emoji-metadata";

const LIMITS: Record<Locale, { title: string; rules: string; items: [string, string][]; own: [string, string, string, string] }> = {
  en: {
    title: "Telegram’s limits",
    rules: "The rules",
    items: [["100×100", "pixels per emoji"], ["3 s · 30 FPS", "longest video"], ["64 KB", "per video emoji"], ["100", "emoji per message"], ["≤ 8", "emoji per row"]],
    own: ["Prefer your own bot? Download the tiles and use the ", "telegram-bot-ui skill", " or the ", "custom emoji guide"],
  },
  ru: {
    title: "Ограничения Telegram",
    rules: "Правила",
    items: [["100×100", "пикселей на эмодзи"], ["3 с · 30 FPS", "самое длинное видео"], ["64 КБ", "на видео-эмодзи"], ["100", "эмодзи в сообщении"], ["≤ 8", "эмодзи в ряду"]],
    own: ["Хотите через своего бота? Скачайте кусочки и используйте ", "скилл telegram-bot-ui", " или ", "гайд по кастомным эмодзи"],
  },
  uk: {
    title: "Обмеження Telegram",
    rules: "Правила",
    items: [["100×100", "пікселів на емодзі"], ["3 с · 30 FPS", "найдовше відео"], ["64 КБ", "на відео-емодзі"], ["100", "емодзі в повідомленні"], ["≤ 8", "емодзі в ряду"]],
    own: ["Хочете через власного бота? Завантажте шматочки й використайте ", "скіл telegram-bot-ui", " або ", "гайд з кастомних емодзі"],
  },
};

export function mosaicMetadata(locale: Locale) {
  const copy = MOSAIC_COPY[locale];
  return emojiMetadata(mosaicPath(locale), copy.title, copy.description, "website", { languages: languages(mosaicPath), locale: OG_LOCALE[locale], keywords: copy.keywords });
}

export function MosaicLanding({ locale }: { locale: Locale }) {
  const copy = MOSAIC_COPY[locale];
  const limits = LIMITS[locale];
  const path = mosaicPath(locale);
  const howTo = howToJsonLd(copy, locale, path);
  return (
    <>
      <JsonLd value={emojiBreadcrumbs({ name: locale === "en" ? "Emoji Library" : locale === "ru" ? "Библиотека эмодзи" : "Бібліотека емодзі", path: libraryPath(locale) }, { name: copy.appName, path })} />
      <JsonLd value={webAppJsonLd(copy, locale, path)} />
      {howTo && <JsonLd value={howTo} />}
      <JsonLd value={faqJsonLd(copy, locale)} />
      <div lang={locale}>
        <MosaicStudio copy={{ h1: copy.h1, lead: copy.lead, drop: copy.drop, dropHint: copy.dropHint }} />
      </div>

      <section lang={locale} aria-labelledby="mosaic-limits" className="mx-auto mt-12 max-w-4xl">
        <div className="flex min-h-8 items-end justify-between gap-2 px-4 pb-1.5">
          <h2 id="mosaic-limits" className="tg-section-title uppercase">{limits.title}</h2>
          <a href="https://core.telegram.org/stickers" className="tg-accent inline-flex items-center gap-0.5 rounded text-[13px] hover:underline">
            {limits.rules} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
        <dl className="tg-glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[var(--tg-sep)] sm:grid-cols-5">
          {limits.items.map(([value, label], i) => (
            <div key={label} className={`flex flex-col-reverse gap-0.5 bg-[var(--tg-card)] px-4 py-3 ${i === limits.items.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="tg-hint text-[12px] leading-snug">{label}</dt>
              <dd className="text-[15px] font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="tg-hint px-4 pt-2 text-[13px] leading-snug">
          {limits.own[0]}<Link className="tg-accent hover:underline" href="/#install">{limits.own[1]}</Link>{limits.own[2]}<Link className="tg-accent hover:underline" href={EMOJI_GUIDE_PATH}>{limits.own[3]}</Link>.
        </p>
      </section>

      <SeoGuide copy={copy} locale={locale} pathFor={mosaicPath} />
    </>
  );
}
