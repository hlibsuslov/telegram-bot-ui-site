import Link from "next/link";
import type { ReactNode } from "react";

export function EmojiDoc({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <article className="tg-glass mx-auto max-w-3xl space-y-7 rounded-3xl p-5 text-sm leading-relaxed sm:p-8 [&_a]:underline [&_a]:underline-offset-2 [&_a]:text-[var(--tg-accent)] [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold">
      <header>
        <Link href="/emoji">Emoji Library</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="tg-hint mt-2 text-base">{intro}</p>
      </header>
      {children}
    </article>
  );
}

export function EmojiCode({ children }: { children: string }) {
  return <pre className="tg-field my-3 overflow-x-auto rounded-xl p-3 text-[13px]"><code>{children}</code></pre>;
}
