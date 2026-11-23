import { Agents } from "@/components/site/agents";
import { Capabilities } from "@/components/site/capabilities";
import { DemoVideo } from "@/components/site/demo-video";
import { Demos } from "@/components/site/demos";
import { EmojiLibraryLink } from "@/components/site/emoji-library-link";
import { EmojiPacks } from "@/components/site/emoji-packs";
import { Faq } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { Install } from "@/components/site/install";
import { Scenarios } from "@/components/site/scenarios";
import { SkillMap } from "@/components/site/skill-map";
import { Studio } from "@/components/site/studio";

export default function Home() {
  return (
    <>
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
        <SkillMap />
        <Studio />
        <EmojiPacks />
        <Demos />
        <Capabilities />
        <Scenarios />
        <Agents />
        <Install />
        <EmojiLibraryLink />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
