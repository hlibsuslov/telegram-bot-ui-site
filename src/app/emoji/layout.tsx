import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Disclaimer } from "@/components/emoji/disclaimer";
import { ThemeToggle } from "@/components/site/theme-toggle";
import "./emoji.css";

// The emoji library has its own shell: Telegram's palette, a chat-wallpaper background and glass
// panels, so it reads as a tool next to the landing rather than another landing section.
export default function EmojiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tg relative min-h-svh">
      <div className="tg-wallpaper" aria-hidden="true" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-black">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="tg-glass mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-2xl px-3 sm:px-4">
          <Link href="/emoji" className="flex items-center gap-2.5 rounded-lg font-semibold">
            <Image src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            <span>Emoji</span>
            <span className="tg-hint hidden text-sm font-normal sm:inline">premium packs for bots</span>
          </Link>
          <nav aria-label="Site" className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/" className="tg-cell tg-hint rounded-lg px-2.5 py-1.5">telegram-bot-ui</Link>
            <Link href="/studio" className="tg-cell tg-hint hidden rounded-lg px-2.5 py-1.5 sm:inline">Studio</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-3 pt-4 pb-10 sm:px-5">{children}</main>
      <footer className="mx-auto max-w-7xl px-3 pb-8 sm:px-5">
        <div className="tg-glass rounded-2xl px-4 py-3">
          <Disclaimer className="tg-hint" />
        </div>
      </footer>
    </div>
  );
}
