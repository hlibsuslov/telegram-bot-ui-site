import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { REPO_URL } from "@/content/site";
import { getStarCount } from "@/lib/github";
import { Container, GithubMark } from "./section";
import { ThemeToggle } from "./theme-toggle";

// Absolute paths so the same header works on the home page and on /studio.
const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/#demos", label: "Demos" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#prompts", label: "Prompts" },
  { href: "/#install", label: "Install" },
  { href: "/#faq", label: "FAQ" },
];

export async function StarButton({ size = "sm" }: { size?: "sm" | "lg" }) {
  const stars = await getStarCount();
  const base =
    size === "lg"
      ? "h-12 gap-2 rounded-full px-6 text-sm"
      : "h-9 gap-1.5 rounded-lg px-2 text-sm sm:px-3";
  return (
    <a
      href={REPO_URL}
      className={`inline-flex shrink-0 items-center justify-center border border-border bg-card font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${base}`}
    >
      <GithubMark />
      <span className={size === "sm" ? "sr-only sm:not-sr-only" : undefined}>GitHub</span>
      {stars !== null ? (
        <span className={`ml-1 items-center gap-1 border-l border-border pl-2 text-muted-foreground tabular-nums ${size === "sm" ? "hidden min-[400px]:inline-flex" : "inline-flex"}`}>
          <Star aria-hidden="true" className="size-3.5" />
          <span>
            {stars}
            <span className="sr-only"> stars</span>
          </span>
        </span>
      ) : null}
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href="/#top" className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Image src="/icon.svg" alt="" width={28} height={28} className="rounded-md" priority />
          <span className="whitespace-nowrap">telegram-bot-ui</span>
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/studio" className="rounded-md px-2 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden">
            Studio
          </Link>
          <ThemeToggle />
          <StarButton />
        </div>
      </Container>
    </header>
  );
}
