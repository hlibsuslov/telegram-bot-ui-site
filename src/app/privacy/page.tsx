import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Container } from "@/components/site/section";
import { REPO_URL } from "@/content/site";

const TITLE = "Privacy | Telegram Bot UI";
const DESCRIPTION = "What the telegram-bot-ui site measures without cookies, and what stays in your browser.";

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
              <h2>Analytics without cookies</h2>
              <p>
                The site uses Vercel Web Analytics to count page views by page, referrer, country, browser and device
                type, and to see what is searched in the emoji library and which snippets are copied. The data is used
                only to improve the site.
              </p>
              <p className="mt-2">
                Analytics sets no cookies and stores nothing in your browser. Visitors are told apart only within a
                day, by a hash of the request that is discarded after 24 hours, so you are not recognised on a later
                visit.
              </p>
            </section>
            <section>
              <h2>What stays in your browser</h2>
              <p>
                Saved emoji packs and the theme are kept in your browser&apos;s local storage and are not sent anywhere.
              </p>
            </section>
            <section>
              <h2>Emoji mosaic maker</h2>
              <p>
                Your video or picture is cut into tiles in your browser and is never uploaded. If you choose to create a
                pack, you log in with Telegram: the site receives your Telegram id, name and username from Telegram (never
                your phone number or password), keeps them in a signed cookie for two hours, and sends only the finished
                tiles to Telegram to create a pack owned by your account. Before and after the upload, a few still frames of
                the mosaic go to Anthropic&apos;s Claude API for an automatic content check; a pack that fails it is deleted.
                The site logs the pack&apos;s name and the check&apos;s outcome with your Telegram id so that abuse reports can
                be answered. Downloading the tiles as a ZIP needs no login.
              </p>
            </section>
            <section>
              <h2>Questions</h2>
              <p>
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
