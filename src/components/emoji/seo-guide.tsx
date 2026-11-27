import Link from "next/link";
import { LOCALE_NAMES, LOCALES, type Locale, type PageCopy } from "@/content/emoji-seo";
import { siteUrl } from "@/lib/site-url";

/** The how-to steps and the questions people ask, as plain text a search engine or an answer engine can quote,
 *  with links to the same page in the other languages. */
export function SeoGuide({ copy, locale, pathFor }: { copy: PageCopy; locale: Locale; pathFor: (l: Locale) => string }) {
  return (
    <div lang={locale} className="mx-auto mt-12 max-w-4xl space-y-10">
      {copy.steps && copy.howToTitle && (
        <section aria-labelledby="howto">
          <h2 id="howto" className="px-1 text-xl font-semibold tracking-tight">{copy.howToTitle}</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {copy.steps.map((step, i) => (
              <li key={step.name} className="tg-glass rounded-2xl px-4 py-3">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="tg-button inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[13px]">{i + 1}</span>
                  {step.name}
                </p>
                <p className="tg-hint mt-1.5 text-[14px] leading-snug">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section aria-labelledby="faq">
        <h2 id="faq" className="px-1 text-xl font-semibold tracking-tight">{copy.faqTitle}</h2>
        <div className="tg-glass tg-sep mt-4 overflow-hidden rounded-2xl">
          {copy.faq.map((item) => (
            <details key={item.q} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                <h3 className="text-[15px]">{item.q}</h3>
                <span aria-hidden="true" className="tg-hint mt-0.5 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="tg-hint mt-2 text-[14px] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <nav aria-label="Language" className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {LOCALES.map((l) => (
          <Link key={l} href={pathFor(l)} hrefLang={l} lang={l} aria-current={l === locale ? "page" : undefined}
            className={`tg-cell rounded-full px-3 py-1 ${l === locale ? "tg-accent font-medium" : "tg-hint"}`}>{LOCALE_NAMES[l]}</Link>
        ))}
      </nav>
    </div>
  );
}

export function faqJsonLd(copy: PageCopy, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: copy.faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}

export function howToJsonLd(copy: PageCopy, locale: Locale, path: string) {
  if (!copy.steps || !copy.howToTitle) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: copy.howToTitle,
    inLanguage: locale,
    totalTime: "PT2M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
    tool: [{ "@type": "HowToTool", name: "Telegram" }],
    step: copy.steps.map((step, i) => ({ "@type": "HowToStep", position: i + 1, name: step.name, text: step.text, url: `${siteUrl()}${path}#howto` })),
  };
}

export function webAppJsonLd(copy: PageCopy & { appName: string }, locale: Locale, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: copy.appName,
    url: `${siteUrl()}${path}`,
    description: copy.description,
    inLanguage: locale,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires a browser with WebCodecs (Chrome, Edge, Firefox, Safari 17+)",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    keywords: copy.keywords.join(", "),
    featureList: copy.steps?.map((s) => s.name).join("; "),
  };
}
