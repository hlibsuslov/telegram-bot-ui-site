import type { Metadata } from "next";
import { Disclaimer } from "@/components/emoji/filter-chips";
import { LibraryBrowser } from "@/components/emoji/library-browser";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Container } from "@/components/site/section";
import { getLibrary } from "@/lib/emoji-library";

const TITLE = "Premium emoji library for Telegram bots | telegram-bot-ui";
const DESCRIPTION =
  "Browse Telegram premium emoji packs, watch the animated ones move, and copy the ids, the HTML and the button field your bot needs.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/emoji" },
  openGraph: { type: "website", url: "/emoji", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function EmojiLibraryPage() {
  const library = await getLibrary();
  const emoji = library.packs.reduce((n, p) => n + p.count, 0);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="py-10 sm:py-14">
        <Container>
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-brand">Emoji library</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Premium emoji packs for your bot</h1>
            <p className="mt-4 text-base leading-7 text-pretty text-muted-foreground">
              {library.packs.length} packs, {emoji.toLocaleString("en-US")} emoji. Hover to see the animated ones move, open a pack for
              the ids, and save the ones you like. Your saved packs stay in this browser.
            </p>
          </div>
          <div className="mt-8">
            <LibraryBrowser packs={library.packs} />
          </div>
          <Disclaimer className="mt-10 max-w-3xl" />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
