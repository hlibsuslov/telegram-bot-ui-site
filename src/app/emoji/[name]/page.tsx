import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { PackSheet } from "@/components/emoji/pack-sheet";
import { cardPack, getLibrary, getLibraryPack, type LibraryPack } from "@/lib/emoji-library";

// Pack pages render on their first request and are then cached, not at build: prerendering hundreds
// of them in parallel build workers, each reading the whole catalog, floods Telegram and fails the
// deploy. Cache Components needs at least one param at build time; "_" is not a pack and renders 404.
export async function generateStaticParams() {
  return [{ name: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/emoji/[name]">): Promise<Metadata> {
  const { name } = await params;
  const data = await getLibraryPack(name);
  if (!data) return { title: "Emoji pack not found | telegram-bot-ui" };
  const title = `${data.pack.title}: premium emoji pack | telegram-bot-ui`;
  const description = `${data.pack.count} Telegram premium emoji from ${data.pack.title}. Copy the ids, the HTML and the button field for your bot.`;
  return { title, description, alternates: { canonical: `/emoji/${data.pack.name}` }, openGraph: { title, description, url: `/emoji/${data.pack.name}` } };
}

async function Pack({ params }: { params: PageProps<"/emoji/[name]">["params"] }) {
  const { name } = await params;
  const data = await getLibraryPack(name);
  if (!data) notFound();
  const library = await getLibrary();
  const byName = new Map(library.packs.map((p) => [p.name, p]));
  const similar = data.pack.similar.map((n) => byName.get(n)).filter((p): p is LibraryPack => !!p).map(cardPack);
  return <PackSheet pack={data.pack} emoji={data.emoji} similar={similar} />;
}

function PackLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the pack" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="tg-glass h-[28rem] animate-pulse rounded-3xl motion-reduce:animate-none" />
      <div className="tg-glass h-72 animate-pulse rounded-3xl motion-reduce:animate-none" />
    </div>
  );
}

export default function EmojiPackPage({ params }: PageProps<"/emoji/[name]">) {
  return (
    <>
      <Link href="/emoji" className="tg-accent mb-3 inline-flex items-center gap-0.5 rounded px-1 text-[15px]">
        <ChevronLeft aria-hidden="true" className="size-5" /> All packs
      </Link>
      <Suspense fallback={<PackLoading />}>
        <Pack params={params} />
      </Suspense>
    </>
  );
}
