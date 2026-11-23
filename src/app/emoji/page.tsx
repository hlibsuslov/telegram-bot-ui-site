import type { Metadata } from "next";
import { LibraryApp } from "@/components/emoji/library-app";
import { cardPack, getLibrary } from "@/lib/emoji-library";

const TITLE = "Premium emoji library for Telegram bots | telegram-bot-ui";
const DESCRIPTION =
  "Browse Telegram premium emoji packs by category and collection, watch the animated ones move, and copy the ids, the HTML and the button field your bot needs.";

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
      <h1 className="sr-only">Premium emoji library</h1>
      <p className="tg-hint mb-3 px-1 text-[13px]">
        {library.packs.length} packs · {emoji.toLocaleString("en-US")} emoji · hover to play · saved packs stay in this browser
      </p>
      <LibraryApp packs={library.packs.map(cardPack)} categories={library.categories} collections={library.collections} />
    </>
  );
}
