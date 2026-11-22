"use client";

import { useState } from "react";
import { ArrowUpRight, FolderGit2, Laptop, Terminal } from "lucide-react";
import { CommandRow } from "@/components/site/install-window";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/content/site";
import { TechLogo, type TechLogoId } from "./tech-logos";

const PLATFORMS = [
  { id: "unix", label: "macOS / Linux", python: "python3" },
  { id: "windows", label: "Windows", python: "py -3" },
] as const;

const REQUIREMENTS: { logo: TechLogoId; text: string }[] = [
  { logo: "python", text: "Python 3.12 or later" },
  { logo: "node", text: "Node.js 22.18 or later" },
  { logo: "npm", text: "npm, which comes with Node.js" },
  { logo: "git", text: "Git, for a Telegram Bot UI source checkout" },
];

const PROJECTS = [
  { id: "existing", label: "Open a bot-ui project" },
  { id: "new", label: "Create a starter project" },
  { id: "aiogram", label: "Import an aiogram bot" },
] as const;

export function StudioSetup() {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>(PLATFORMS[0]);
  const [project, setProject] = useState<(typeof PROJECTS)[number]["id"]>("existing");
  const cli = `${platform.python} studio/bot-ui.py`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-2xl border border-border bg-card">
        <section className="flex flex-col gap-4 p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <Terminal aria-hidden="true" className="size-5 text-brand" />
            Build the Studio client
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Run this once from a Telegram Bot UI checkout that contains the <code className="font-mono">studio/</code> directory.
          </p>
          <div role="group" aria-label="Operating system" className="flex flex-wrap gap-2">
            {PLATFORMS.map((option) => (
              <Button key={option.id} type="button" variant={platform.id === option.id ? "secondary" : "outline"} aria-pressed={platform.id === option.id} onClick={() => setPlatform(option)}>
                {option.label}
              </Button>
            ))}
          </div>
          <CommandRow step={{ label: "Install dependencies and build", command: "npm --prefix studio/web ci\nnpm --prefix studio/web run build" }} />
        </section>
        <section className="flex flex-col gap-4 border-t border-border p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <FolderGit2 aria-hidden="true" className="size-5 text-brand" />
            Choose your project
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Replace <code className="font-mono">../my-bot</code> with the path to your bot’s repository. Keep running the commands from the Studio checkout.
          </p>
          <div role="group" aria-label="Project setup" className="flex flex-wrap gap-2">
            {PROJECTS.map((choice) => (
              <Button key={choice.id} type="button" variant={project === choice.id ? "secondary" : "outline"} aria-pressed={project === choice.id} onClick={() => setProject(choice.id)}>
                {choice.label}
              </Button>
            ))}
          </div>
          {project === "existing" && (
            <p className="text-sm leading-6 text-muted-foreground">
              Use your existing <code className="font-mono">bot-ui/</code> folder in the launch command below.
            </p>
          )}
          {project === "new" && (
            <CommandRow step={{ label: "Create the bot-ui folder from the starter template", command: `${cli} init --project ../my-bot/bot-ui` }} />
          )}
          {project === "aiogram" && (
            <CommandRow step={{ label: "Read the aiogram bot and build its map in bot-ui/", command: `${cli} import --source ../my-bot` }} />
          )}
        </section>
        <section className="flex flex-col gap-4 border-t border-border p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <Laptop aria-hidden="true" className="size-5 text-brand" />
            Open Studio in your browser
          </h3>
          <CommandRow step={{ label: "Start Studio for this project", command: `${cli} studio --project ../my-bot/bot-ui --open` }} />
          <p className="text-sm leading-6 text-muted-foreground">
            Studio opens the local address it prints. Keep the terminal open while you work, and press <kbd className="font-mono">Ctrl+C</kbd> to stop it.
          </p>
        </section>
      </div>
      <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6" aria-label="Setup requirements">
        <div>
          <h3 className="font-semibold">Requirements</h3>
          <ul className="mt-3 grid gap-2.5 text-sm leading-6 text-muted-foreground">
            {REQUIREMENTS.map((item) => (
              <li key={item.logo} className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background">
                  <TechLogo id={item.logo} className="size-4" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <a href={REPO_URL} className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          View repository <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      </aside>
    </div>
  );
}
