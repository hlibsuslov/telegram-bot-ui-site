import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Disclaimer } from "@/components/emoji/filter-chips";
import { PackBrowser } from "@/components/emoji/pack-browser";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Container } from "@/components/site/section";
import { getLibraryPack, listedPackNames } from "@/lib/emoji-library";

// Cache Components needs at least one param at build time; "_" renders the 404 when the list is empty.
export async function generateStaticParams() {
  const names = await listedPackNames();
  return (names.length ? names : ["_"]).map((name) => ({ name }));
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
  const { pack, emoji } = data;
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{pack.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {pack.name} · {pack.count} emoji{pack.adaptive ? " · some take the text color in Telegram" : ""}
      </p>
      <div className="mt-6">
        <PackBrowser pack={pack} emoji={emoji} />
      </div>
    </>
  );
}

function PackLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the pack" className="mt-4 space-y-3">
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="h-4 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    </div>
  );
}

export default function EmojiPackPage({ params }: PageProps<"/emoji/[name]">) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="py-8 sm:py-12">
        <Container>
          <Link href="/emoji" className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            <ArrowLeft aria-hidden="true" className="size-4" /> All packs
          </Link>
          <Suspense fallback={<PackLoading />}>
            <Pack params={params} />
          </Suspense>
          <Disclaimer className="mt-10 max-w-3xl" />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
