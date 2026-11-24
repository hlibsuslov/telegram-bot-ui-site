import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Container } from "@/components/site/section";
import { CookieSettingsButton } from "@/components/site/cookie-settings-button";
import { REPO_URL } from "@/content/site";

const TITLE = "Privacy | Telegram Bot UI";
const DESCRIPTION = "What the telegram-bot-ui site measures, with your consent, and what stays in your browser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Container className="max-w-2xl py-12 sm:py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
          <div className="mt-8 flex flex-col gap-6 text-sm leading-6 text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
            <section>
              <h2>Analytics, only with your consent</h2>
              <p>
                With your permission the site uses Google Analytics 4 to see which pages are visited, which buttons and
                links are clicked, how far pages are scrolled, how long they stay open, what is searched in the emoji
                library and which snippets are copied. The data is used only to improve the site and is kept for 14
                months. Advertising features are off.
              </p>
              <p className="mt-2">
                Until you choose, Analytics runs in consent mode: no analytics cookies are set and Google receives
                only anonymous signals without identifiers.
              </p>
            </section>
            <section>
              <h2>What stays in your browser</h2>
              <p>
                Your cookie choice, saved emoji packs and the theme are kept in your browser&apos;s local storage and
                are not sent anywhere.
              </p>
            </section>
            <section>
              <h2>Changing your mind</h2>
              <p>
                You can change or withdraw consent at any time: <CookieSettingsButton className="text-foreground" />.
                Questions go to the project&apos;s{" "}
                <a href={`${REPO_URL}/issues`} className="text-foreground underline underline-offset-4">
                  GitHub issues
                </a>
                .
              </p>
            </section>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
