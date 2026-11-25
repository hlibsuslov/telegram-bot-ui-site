import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { AgentPrompt } from "@/components/site/agent-prompt";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { CommandRow } from "@/components/site/install-window";
import { Container, Section } from "@/components/site/section";
import { AGENT_COMMANDS, AGENT_HOSTS, BOT_API, VERIFIED_ON, VERSION } from "@/content/site";

const TITLE = "For agents | Telegram Bot UI";
const DESCRIPTION =
  "Hand the telegram-bot-ui skill to your coding agent in one sentence. Install commands per host, the list of commands, and the plain-text files agents read: agents.md, llms.txt and llms-full.txt.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/agents", types: { "text/markdown": "/agents.md" } },
  openGraph: { type: "website", url: "/agents", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FILES = [
  { href: "/agents.md", name: "agents.md", note: "Install per host, verify, the commands, project memory and the safety rules." },
  { href: "/llms.txt", name: "llms.txt", note: "The short index in the llms.txt format, with links to the rest." },
  { href: "/llms-full.txt", name: "llms-full.txt", note: "Everything in one file: router, floor and every command playbook." },
];

export default function AgentsPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <section aria-labelledby="agents-heading" className="pt-12 pb-4 sm:pt-16">
          <Container>
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-medium text-brand">
                Version {VERSION} · Bot API {BOT_API} · verified {VERIFIED_ON}
              </p>
              <h1 id="agents-heading" className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
                <span className="whitespace-nowrap">telegram-bot-ui</span> for your agent
              </h1>
              <p className="mt-4 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
                An open-source Agent Skill (MIT) for everything a Telegram bot shows, sends and reacts to: screens, texts,
                keyboards, streaming AI replies, HTML widgets, Mini Apps, payments in Stars, channel posts, an agent’s own
                bot, premium emoji, and offline catalogs of Bot API {BOT_API}. You describe the task in plain words; the
                skill picks the command.
              </p>
            </div>
          </Container>
        </section>

        <Section
          id="prompt"
          eyebrow="One sentence"
          title="Copy this to your agent"
          description="Paste it into Claude Code, Codex, Cursor or any other coding agent, in the project you want to improve. The agent installs the skill, checks it, and asks before it publishes or sends anything."
          className="py-10 sm:py-12"
        >
          <AgentPrompt />
        </Section>

        <Section
          id="install"
          eyebrow="Install"
          title="Or install it yourself"
          description={
            <>
              Pick your host and run the commands. The agent’s own steps, including how to verify the install, are in{" "}
              <a href="/agents.md" className="text-brand underline underline-offset-4 hover:no-underline">
                agents.md
              </a>
              .
            </>
          }
          className="py-10 sm:py-12"
        >
          <ul className="grid max-w-3xl gap-4">
            {AGENT_HOSTS.map((host) => (
              <li key={host.host} className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
                <h3 className="font-semibold">{host.host}</h3>
                <div className="mt-3 space-y-3">
                  {host.commands.map((command, i) => (
                    <CommandRow
                      key={command}
                      step={{ label: host.commands.length > 1 ? `Step ${i + 1}` : "Command", command }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="commands"
          eyebrow="Use it"
          title="Say what you want"
          description="The skill picks one of its commands from the request. With no request it looks at the project and suggests the next two or three steps."
          className="py-10 sm:py-12"
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_COMMANDS.map((command) => (
              <li key={command.verb} className="flex flex-col rounded-2xl border border-border p-4">
                <code className="font-mono text-sm font-semibold">{command.verb}</code>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{command.short}</p>
                <p className="mt-auto pt-3 text-xs text-muted-foreground">
                  Say: <span className="text-foreground">“{command.example}”</span>
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="files"
          eyebrow="Plain text"
          title="For agents that read files"
          description="The same facts as text, generated from the skill’s repository with every release."
          className="py-10 pb-16 sm:py-12 sm:pb-20"
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {FILES.map((file) => (
              <li key={file.href}>
                <a
                  href={file.href}
                  className="flex h-full flex-col rounded-2xl border border-border p-4 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex items-center gap-2 font-mono text-sm font-semibold">
                    <FileText aria-hidden="true" className="size-4 text-muted-foreground" />
                    {file.href}
                  </span>
                  <span className="mt-1.5 text-sm leading-6 text-muted-foreground">{file.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
