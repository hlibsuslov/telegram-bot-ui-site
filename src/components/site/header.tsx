import Image from "next/image";
import { Star } from "lucide-react";
import { REPO_URL } from "@/content/site";
import { getStarCount } from "@/lib/github";
import { Container, GithubMark } from "./section";

const NAV = [
  { href: "#demos", label: "Demos" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#agents", label: "Agents" },
  { href: "#install", label: "Install" },
  { href: "#faq", label: "FAQ" },
];

export async function StarButton({ size = "sm" }: { size?: "sm" | "lg" }) {
  const stars = await getStarCount();
  const base =
    size === "lg"
      ? "h-12 gap-2 rounded-xl px-5 text-sm"
      : "h-9 gap-1.5 rounded-lg px-3 text-sm";
  return (
    <a
      href={REPO_URL}
      className={`inline-flex shrink-0 items-center justify-center border border-border bg-card font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${base}`}
    >
      <GithubMark />
      <span>GitHub</span>
      {stars !== null ? (
        <span className="ml-1 inline-flex items-center gap-1 border-l border-border pl-2 text-muted-foreground tabular-nums">
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
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Image src="/icon.svg" alt="" width={28} height={28} className="rounded-md" priority />
          <span>telegram-bot-ui</span>
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <StarButton />
      </Container>
    </header>
  );
}
