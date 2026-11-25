import type { Metadata } from "next";
import { Agents } from "@/components/site/agents";
import { Capabilities } from "@/components/site/capabilities";
import { DemoVideo } from "@/components/site/demo-video";
import { Demos } from "@/components/site/demos";
import { EmojiLibrary } from "@/components/site/emoji-library";
import { EmojiPacks } from "@/components/site/emoji-packs";
import { Faq } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { Install } from "@/components/site/install";
import { Releases } from "@/components/site/releases";
import { Scenarios } from "@/components/site/scenarios";
import { SkillMap } from "@/components/site/skill-map";
import { Studio } from "@/components/site/studio";
import { JsonLd } from "@/components/emoji/json-ld";
import { FAQ } from "@/content/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// The FAQ below the page, as schema.org FAQPage; built from static content only.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function Home() {
  return (
    <>
      <JsonLd value={faqJsonLd} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <DemoVideo />
        <Releases />
        <SkillMap />
        <Studio />
        <EmojiLibrary />
        <EmojiPacks />
        <Demos />
        <Capabilities />
        <Scenarios />
        <Agents />
        <Install />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
