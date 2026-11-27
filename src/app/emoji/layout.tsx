import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Disclaimer } from "@/components/emoji/disclaimer";
import { ThemeToggle } from "@/components/site/theme-toggle";
import "./emoji.css";

// The emoji library has its own shell: Telegram's palette and system font on a plain page, so it
// reads as a tool next to the landing rather than another landing section. Wide screens get the
// width: the content grows to 1760 px and the grids add columns.
export default function EmojiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tg relative min-h-svh">
      <div className="tg-wallpaper" aria-hidden="true" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-black">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 2xl:px-8">
        <div className="tg-bar mx-auto flex h-14 max-w-[1760px] items-center gap-2 rounded-2xl px-2 sm:gap-3 sm:px-3">
          <Link href="/" className="tg-cell inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl pr-3 pl-2 text-sm font-medium">
            <ArrowLeft aria-hidden="true" className="tg-accent size-[18px]" />
            <span className="hidden sm:inline">telegram-bot-ui</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <span className="h-6 w-px bg-[var(--tg-sep)]" aria-hidden="true" />
          <Link href="/emoji" className="flex min-w-0 items-center gap-2.5 rounded-lg font-semibold">
            <Image src="/icon.svg" alt="" width={26} height={26} className="rounded-lg" />
            <span className="truncate">Emoji library</span>
          </Link>
          <nav aria-label="Site" className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/emoji/mosaic" className="tg-cell tg-hint hidden rounded-lg px-2.5 py-1.5 sm:inline">Mosaic maker</Link>
            <Link href="/studio" className="tg-cell tg-hint hidden rounded-lg px-2.5 py-1.5 md:inline">Studio</Link>
            <Link href="/#install" className="tg-cell tg-hint hidden rounded-lg px-2.5 py-1.5 md:inline">Install the skill</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1760px] px-3 pt-4 pb-10 sm:px-5 2xl:px-8">{children}</main>
      <footer className="mx-auto max-w-[1760px] px-3 pb-8 sm:px-5 2xl:px-8">
        <div className="tg-glass flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl px-4 py-3">
          <Disclaimer className="tg-hint min-w-0 flex-1 basis-96" />
          <Link href="/" className="tg-accent inline-flex shrink-0 items-center gap-1 rounded text-sm font-medium">
            <ArrowLeft aria-hidden="true" className="size-4" /> Back to telegram-bot-ui
          </Link>
        </div>
      </footer>
    </div>
  );
}
