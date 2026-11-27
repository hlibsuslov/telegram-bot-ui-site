// Every claim on the page comes from the skill repository (README, SKILL.md,
// CHANGELOG, docs/hosts.md). Update this file together with a skill release.

import type { BrandKey } from "@/components/site/brand-icon";
import agents from "./agents.generated.json";

export const REPO = "hlibsuslov/telegram-bot-ui";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const HOSTS_URL = `${REPO_URL}/blob/main/docs/hosts.md`;

// Version, Bot API and the agent install commands come from the skill's generated docs/agents/ (scripts/sync_agent_docs.py).
export const VERSION = agents.version;
export const BOT_API = agents.botApi;
export const VERIFIED_ON = agents.verified;
export const AGENT_HOSTS = agents.hosts;
export const AGENT_COMMANDS = agents.commands;

/** The canonical address of the site. The old telegram-bot-ui-site.vercel.app redirects here (next.config.ts). */
export const SITE_ORIGIN = "https://telegram-bot-ui.hlixli.com";
export const OLD_HOST = "telegram-bot-ui-site.vercel.app";

/** The one sentence a person pastes into their agent (shown on /agents). It points the agent at /agents.md. */
export const AGENT_PROMPTS = [
  {
    code: "en",
    label: "EN",
    text: `Install the telegram-bot-ui skill following ${SITE_ORIGIN}/agents.md, check the install by asking whether the skill is up to date, then run it in this project with no request. Don't publish or send anything to Telegram without my confirmation.`,
  },
  {
    code: "ru",
    label: "RU",
    text: `Установи скилл telegram-bot-ui по инструкции ${SITE_ORIGIN}/agents.md, проверь установку вопросом, свежий ли скилл, и затем запусти его в этом проекте без задачи. Ничего не публикуй и не отправляй в Telegram без моего подтверждения.`,
  },
  {
    code: "uk",
    label: "UK",
    text: `Встанови скіл telegram-bot-ui за інструкцією ${SITE_ORIGIN}/agents.md, перевір встановлення питанням, чи скіл актуальний, і потім запусти його в цьому проєкті без завдання. Нічого не публікуй і не надсилай у Telegram без мого підтвердження.`,
  },
] as const;

export const SITE_NAME = "Telegram Bot UI";
export const SITE_TITLE = "Telegram Bot UI: Agent Skill for bots, Mini Apps and emoji";
/** 50-160 characters: search engines cut longer descriptions. */
export const SITE_DESCRIPTION =
  "Open-source Agent Skill for Claude Code, Codex and Cursor: Telegram bot screens, Mini Apps, Stars and premium emoji, plus an MCP server and emoji library.";

/** Demo video below the hero (web copies of the 16:9 master, 1280x720). */
export const DEMO_VIDEO = {
  sources: [
    { src: "/video/demo.webm", type: "video/webm" },
    { src: "/video/demo.mp4", type: "video/mp4" },
  ],
  poster: "/video/demo-poster.jpg",
  title: "One sentence to your agent fixes the bot, then bot-ui Studio maps it, edits it with premium emoji and simulates every tap. In under a minute.",
  width: 1280,
  height: 720,
} as const;

export const AGENTS: { name: string; icon: BrandKey }[] = [
  { name: "Claude Code", icon: "claude" },
  { name: "Codex", icon: "codex" },
  { name: "Cursor", icon: "cursor" },
  { name: "Gemini CLI", icon: "gemini" },
  { name: "Antigravity", icon: "antigravity" },
  { name: "GitHub Copilot", icon: "copilot" },
  { name: "OpenCode", icon: "opencode" },
  { name: "Grok Build", icon: "grok" },
  { name: "Hermes Agent", icon: "hermes" },
  { name: "Replit Agent", icon: "replit" },
  { name: "Devin", icon: "terminal" },
  { name: "AGENTS.md readers", icon: "file" },
];

export type InstallStep = { label: string; command: string };

export type InstallGuide = {
  id: string;
  label: string;
  icon: BrandKey;
  title: string;
  note: string;
  steps: InstallStep[];
  update: InstallStep;
  alt?: InstallStep & { note: string };
};

const SKILLS_ADD = "npx skills add hlibsuslov/telegram-bot-ui";

/** `npx skills` guide for one agent, installed for every project (-g). */
function skillsCli(id: string, label: string, icon: BrandKey, agent: string, note: string, alt?: InstallGuide["alt"]): InstallGuide {
  return {
    id,
    label,
    icon,
    title: `${label}: install with the skills CLI`,
    note,
    steps: [{ label: "Install", command: `${SKILLS_ADD} -a ${agent} -g -y` }],
    update: { label: "Update to the latest", command: "npx skills update telegram-bot-ui -g -y" },
    alt,
  };
}

// Commands come from the skill README and the official docs of each tool; the
// skills CLI ones (vercel-labs/skills, docs/agents.md) were run against this
// repository on 2026-11-15. `npx skills` installs the latest commit of main;
// `gh skill` installs the latest tagged release.
export const INSTALL_GUIDES: InstallGuide[] = [
  {
    id: "any",
    label: "Any agent",
    icon: "any",
    title: "Any agent: pick yours in the prompt",
    note: "Run it in your project; the CLI finds the agents on your machine and asks where to install. Add -g to install for every project. Needs Node.js 22.20 or later.",
    steps: [{ label: "Install", command: SKILLS_ADD }],
    update: { label: "Update to the latest", command: "npx skills update telegram-bot-ui" },
    alt: {
      label: "Or with the GitHub CLI (2.96+), latest tagged release",
      command: "gh skill install hlibsuslov/telegram-bot-ui",
      note: "Update with gh skill update.",
    },
  },
  {
    id: "claude",
    label: "Claude Code",
    icon: "claude",
    title: "Claude Code: plugin with the skill and five subagents",
    note: "Run inside a Claude Code session (2.1.275 or later). The skill is then /telegram-bot-ui:telegram-bot-ui.",
    steps: [{ label: "Install", command: "/plugin install telegram-bot-ui --marketplace hlibsuslov/telegram-bot-ui" }],
    update: { label: "Update to the latest", command: "claude plugin update telegram-bot-ui" },
    alt: {
      label: "Or the skill alone, without subagents",
      command: `${SKILLS_ADD} -a claude-code -g -y`,
      note: "Installs to ~/.claude/skills.",
    },
  },
  skillsCli("codex", "Codex", "codex", "codex", "Installs to ~/.agents/skills. Call it with $telegram-bot-ui or just describe the task.", {
    label: "Or as a Codex plugin",
    command: "codex plugin marketplace add hlibsuslov/telegram-bot-ui",
    note: "Then install telegram-bot-ui from the Plugins directory in Codex.",
  }),
  skillsCli("cursor", "Cursor", "cursor", "cursor", "Installs to ~/.cursor/skills. Cursor picks it up by description or from the / menu."),
  {
    id: "copilot",
    label: "GitHub Copilot",
    icon: "copilot",
    title: "GitHub Copilot: install with the GitHub CLI",
    note: "GitHub CLI 2.96 or later; installs the latest tagged release for Copilot.",
    steps: [
      {
        label: "Install",
        command: "gh skill install hlibsuslov/telegram-bot-ui telegram-bot-ui --agent github-copilot --scope user",
      },
    ],
    update: { label: "Update to the latest", command: "gh skill update" },
    alt: {
      label: "Or with the skills CLI",
      command: `${SKILLS_ADD} -a github-copilot -g -y`,
      note: "Installs to ~/.copilot/skills.",
    },
  },
  skillsCli("gemini", "Gemini CLI", "gemini", "gemini-cli", "Installs to ~/.gemini/skills.", {
    label: "Or with Gemini’s own installer",
    command: "gemini skills install https://github.com/hlibsuslov/telegram-bot-ui",
    note: "Gemini asks for consent the first time the skill activates.",
  }),
  skillsCli("antigravity", "Antigravity", "antigravity", "antigravity", "Installs to ~/.gemini/config/skills; the skill becomes a slash command."),
  skillsCli("opencode", "OpenCode", "opencode", "opencode", "Installs to ~/.config/opencode/skills."),
  skillsCli("grok", "Grok Build", "grok", "grok", "xAI Grok Build. Installs to ~/.grok/skills."),
  skillsCli("hermes", "Hermes Agent", "hermes", "hermes-agent", "Installs to ~/.hermes/skills.", {
    label: "Or with Hermes’ own installer",
    command: "hermes skills install hlibsuslov/telegram-bot-ui/skills/telegram-bot-ui",
    note: "From the Hermes Agent docs.",
  }),
  {
    id: "replit",
    label: "Replit Agent",
    icon: "replit",
    title: "Replit Agent: add it to your Repl",
    note: "Run it in the Repl’s Shell. Replit reads skills from the project’s .agents/skills folder.",
    steps: [{ label: "Install", command: `${SKILLS_ADD} -a replit -y` }],
    update: { label: "Update to the latest", command: "npx skills update telegram-bot-ui -p -y" },
    alt: {
      label: "Or without the Shell",
      command: "https://github.com/hlibsuslov/telegram-bot-ui",
      note: "In Agent, open + → Use a skill and import this repository URL.",
    },
  },
  skillsCli("devin", "Devin", "terminal", "devin", "Devin for Terminal. Installs to ~/.config/devin/skills."),
  skillsCli("cline", "Cline", "file", "cline", "Installs to ~/.agents/skills."),
  {
    id: "installer",
    label: "No Node.js",
    icon: "python",
    title: "Without Node.js: clone and run the installer",
    note: "Standard-library Python; on Windows use py -3 instead of python. --host takes claude, codex, cursor, gemini, copilot or all; add --dry-run to see the plan first. Includes the subagents.",
    steps: [
      { label: "Clone", command: "git clone https://github.com/hlibsuslov/telegram-bot-ui.git && cd telegram-bot-ui" },
      { label: "Install", command: "python scripts/install.py --host all --scope user" },
    ],
    update: {
      label: "Update to the latest (inside the clone)",
      command: "git pull && python scripts/install.py --host all --scope user",
    },
  },
];

export const COMPARISON = [
  {
    situation: "AI answer takes 20 s",
    without: "“typing…” then a wall of text",
    with: "a streamed draft with real stages, a Stop button and a clear “stopped, incomplete” ending",
  },
  {
    situation: "A form",
    without: "“Send your phone” with no way back",
    with: "buttons and a reply field in one step, Back keeps answers, Submit disabled until valid",
  },
  {
    situation: "“My balance” in a group",
    without: "posted for everyone to see",
    with: "shown only to the person who tapped, and never leaked on errors",
  },
  {
    situation: "Order status",
    without: "four new messages per update",
    with: "one live card that updates in place",
  },
  {
    situation: "Channel post timed out",
    without: "posted again, now twice",
    with: "outcome treated as unknown and checked before any retry",
  },
  {
    situation: "“Ignore your rules” sent to an agent bot",
    without: "the agent obeys",
    with: "quoted as data; the operator is told",
  },
  {
    situation: "A Mini App built like a website",
    without: "its own top bar, purple gradients, emoji as icons",
    with: "Telegram’s theme roles and native controls, checked by a lint and a 16-item rework score",
  },
  {
    situation: "Icons for the menu",
    without: "a different emoji style on every button",
    with: "one premium pack that covers every slot, picked by tags, with plain emoji as fallback",
  },
  {
    situation: "A new Bot API field",
    without: "invented from memory, rejected by Telegram",
    with: "looked up in the offline catalog with a checked example, or reported as missing",
  },
  {
    situation: "The / command menu",
    without: "handlers and setMyCommands drift apart",
    with: "audited against the code, then planned per scope and language",
  },
  {
    situation: "Old SDK",
    without: "new features silently dropped",
    with: "the gap is detected and bridged with an isolated adapter",
  },
] as const;

export const FAQ = [
  {
    q: "What is Telegram Bot UI?",
    a: "An open-source Agent Skill: knowledge, recipes and offline tools that teach your coding agent to design and build Telegram bots, Mini Apps and channel posts the way Telegram users expect. It also ships bot-ui Studio, a local MCP server and a free premium emoji library.",
  },
  {
    q: "Does it change my bot?",
    a: "No. It is knowledge and tools for your agent; the agent edits your bot when you ask.",
  },
  {
    q: "Does it send messages or need my bot token?",
    a: "The checks never do. Publishing and agent operation read a bot token from an environment variable, and the skill requires your explicit approval before anything is published.",
  },
  {
    q: "Which language or framework does my bot need?",
    a: "Any. The skill reasons in Bot API payloads and ships runnable examples in Python and TypeScript, plus adapters for aiogram and grammY.",
  },
  {
    q: "How do I call it?",
    a: "Just describe the task, for example “Improve the UX of this Telegram bot.” The skill picks one of its twelve commands on its own. You can also call it by name: /telegram-bot-ui in Claude Code, $telegram-bot-ui in Codex, or the / menu in Cursor and Antigravity.",
  },
  {
    q: "Can I use it as an MCP server?",
    a: "Yes, two of them. The skill runs a local stdio MCP server with 15 tools (Bot API lookup, request and Rich HTML validation, the bot-ui map, command menu audit, emoji pick): tgui.py mcp. The emoji library is a separate remote MCP server at /api/mcp with six read-only tools and no sign-in.",
  },
  {
    q: "Is the emoji library free? Does it need an API key?",
    a: "Free, no key and no sign-in. Search 479 packs in the browser, call the JSON API, connect the MCP server or download the whole catalog as one gzip file. Requests are rate-limited per client.",
  },
  {
    q: "Do I need Telegram Premium for custom emoji?",
    a: "A bot with a Fragment username can use custom emoji everywhere. Owner Premium covers only messages the bot sends to private chats, groups and supergroups, not channel posts. Otherwise the skill falls back to plain emoji for the whole message, never a mix.",
  },
  {
    q: "Does it build Telegram Mini Apps?",
    a: "Yes, since 3.1. It decides whether you need a Mini App at all, then builds or reworks one with Telegram’s theme roles, native controls, Stars payments and server-side initData verification, and lints the result.",
  },
  {
    q: "My bot uses an old SDK.",
    a: "The skill checks what your SDK supports and either suggests an upgrade or adds a small, isolated adapter with a “remove when” note.",
  },
  {
    q: "What is not verified yet?",
    a: "Live calls to Telegram and rendering in the Telegram apps are not part of the offline checks, and the skill tells your agent which level of evidence it has. Cursor, Antigravity, Copilot, Devin, Cline, OpenCode, Grok Build, Hermes Agent and Replit Agent were checked by documentation only. Agent evals, their runner and the judge are ready, but no full agent run has been published yet.",
  },
  {
    q: "Is this an official Telegram project?",
    a: "No. It is an independent MIT-licensed community project, not affiliated with or endorsed by Telegram.",
  },
] as const;
