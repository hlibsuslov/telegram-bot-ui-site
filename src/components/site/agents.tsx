import { HOSTS_URL } from "@/content/site";
import { Section } from "./section";

// From the README host table and docs/hosts.md.
const HOSTS: { name: string; how: string; call?: string }[] = [
  { name: "Claude Code", how: "Plugin with five subagents, or a plain skill folder in ~/.claude/skills.", call: "/telegram-bot-ui" },
  { name: "Codex", how: "Reads ~/.agents/skills; custom agents in .codex/agents.", call: "$telegram-bot-ui" },
  { name: "Cursor", how: "Reads ~/.agents/skills; optional rule in .cursor/rules.", call: "/telegram-bot-ui" },
  { name: "Gemini CLI", how: "~/.gemini/skills, or gemini skills install from the repository URL." },
  { name: "Antigravity", how: "Reads .agents/skills in the workspace; skills become slash commands.", call: "/telegram-bot-ui" },
  { name: "GitHub Copilot", how: "Reads ~/.agents/skills; optional copilot-instructions block." },
  { name: "Devin", how: "Reads ~/.agents/skills; install with --host codex." },
  { name: "AGENTS.md readers", how: "Cline and others: paste the AGENTS.md snippet and keep the folder in the repo." },
];

export function Agents() {
  return (
    <Section
      id="agents"
      eyebrow="Supported agents"
      title="One skill folder, every major coding agent."
      description={
        <>
          The skill is one folder with a <code className="font-mono text-[0.9em]">SKILL.md</code> entry point. Every
          install path is checked against each host’s documentation.{" "}
          <a href={HOSTS_URL} className="text-brand underline underline-offset-4 hover:no-underline">
            See how each host loads it
          </a>
          .
        </>
      }
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOSTS.map((host) => (
          <li key={host.name} className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">{host.name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{host.how}</p>
            <p className="mt-auto pt-4 text-xs text-muted-foreground">
              {host.call ? (
                <>
                  Call it: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{host.call}</code>
                </>
              ) : (
                "Activates from the task description"
              )}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
