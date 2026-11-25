import Image from "next/image";
import Link from "next/link";
import { CHANGELOG_URL, LICENSE_URL, RELEASES_URL, REPO_URL, VERSION } from "@/content/site";
import { Container, GithubMark } from "./section";

const PROJECT = [
  { title: "GitHub", href: REPO_URL },
  { title: "Releases", href: RELEASES_URL },
  { title: "Changelog", href: CHANGELOG_URL },
  { title: "MIT License", href: LICENSE_URL },
];

const LEARN = [
  { title: "Demos", href: "/#demos" },
  { title: "Studio", href: "/studio" },
  { title: "For agents", href: "/agents" },
  { title: "Capabilities", href: "/#capabilities" },
  { title: "Install", href: "/#install" },
  { title: "FAQ", href: "/#faq" },
  { title: "Privacy", href: "/privacy" },
];

// Adapted from the 21st.dev "Minimal Footer" block.
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="grid grid-cols-6 gap-8 py-12">
        <div className="col-span-6 flex flex-col gap-4 md:col-span-4">
          <Link href="/#top" className="flex w-max items-center gap-2.5 rounded-md font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <Image src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
            telegram-bot-ui
          </Link>
          <p className="max-w-sm text-sm text-balance text-muted-foreground">
            An open-source Agent Skill for Telegram bot UI and UX. Version {VERSION}.
          </p>
          <a
            href={REPO_URL}
            className="inline-flex w-max items-center gap-2 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="telegram-bot-ui on GitHub"
          >
            <GithubMark />
          </a>
        </div>
        <nav aria-label="Project" className="col-span-3 md:col-span-1">
          <p className="mb-2 text-xs text-muted-foreground">Project</p>
          <ul className="flex flex-col gap-1">
            {PROJECT.map((link) => (
              <li key={link.title}>
                <a href={link.href} className="inline-block py-1 text-sm hover:underline">
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Site" className="col-span-3 md:col-span-1">
          <p className="mb-2 text-xs text-muted-foreground">Site</p>
          <ul className="flex flex-col gap-1">
            {LEARN.map((link) => (
              <li key={link.title}>
                <Link href={link.href} className="inline-block py-1 text-sm hover:underline">
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <div className="border-t border-border">
        <Container className="py-6">
          <p className="text-xs leading-5 text-muted-foreground">
            MIT licensed community project; not affiliated with or endorsed by Telegram. Telegram changes the Bot API
            often, so verify current behaviour against the{" "}
            <a href="https://core.telegram.org/bots/api" className="underline underline-offset-4 hover:text-foreground">
              official docs
            </a>
            .
          </p>
        </Container>
      </div>
    </footer>
  );
}
