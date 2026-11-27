import Link from "next/link";
import { ArrowUpRight, Clapperboard, Feather, MessageSquareText, Rows3, SquareDashed, type LucideIcon } from "lucide-react";
import { JsonLd } from "@/components/emoji/json-ld";
import { MosaicStudio } from "@/components/emoji/mosaic-studio";
import { SeoGuide, faqJsonLd, howToJsonLd, webAppJsonLd } from "@/components/emoji/seo-guide";
import { type Locale, MOSAIC_COPY, OG_LOCALE, languages, libraryPath, mosaicPath } from "@/content/emoji-seo";
import { EMOJI_GUIDE_PATH } from "@/lib/emoji-links";
import { emojiBreadcrumbs, emojiMetadata } from "@/lib/emoji-metadata";

/** One icon per limit, in the order of LIMITS[locale].items. */
const LIMIT_ICONS: LucideIcon[] = [SquareDashed, Clapperboard, Feather, MessageSquareText, Rows3];

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
          <a href="https://core.telegram.org/stickers" className="tg-cell tg-accent inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-medium">
            {limits.rules} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
        {/* A stat tile per limit (pattern: 21st.dev "Data Card"): icon, value, label, top-aligned so a label that
            wraps never moves its value. */}
        <dl className="tg-glass grid grid-cols-2 gap-2 rounded-2xl p-2 sm:grid-cols-3 lg:grid-cols-5">
          {limits.items.map(([value, label], i) => {
            const Icon = LIMIT_ICONS[i];
            return (
              <div key={label} className={`tg-field flex flex-col gap-2.5 rounded-xl p-3 ${i === limits.items.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
                <span aria-hidden="true" className="tg-accent inline-flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--tg-accent)_14%,transparent)]">
                  <Icon className="size-[17px]" strokeWidth={2} />
                </span>
                <div className="flex flex-col-reverse justify-end gap-0.5">
                  <dt className="tg-hint text-[12.5px] leading-snug text-pretty">{label}</dt>
                  <dd className="text-[17px] leading-tight font-semibold tracking-tight tabular-nums">{value}</dd>
                </div>
              </div>
            );
          })}
        </dl>
        <p className="tg-hint px-4 pt-2.5 text-[13px] leading-snug">
          {limits.own[0]}<Link className="tg-accent hover:underline" href="/#install">{limits.own[1]}</Link>{limits.own[2]}<Link className="tg-accent hover:underline" href={EMOJI_GUIDE_PATH}>{limits.own[3]}</Link>.
        </p>
      </section>

      <SeoGuide copy={copy} locale={locale} pathFor={mosaicPath} />
    </>
  );
}
