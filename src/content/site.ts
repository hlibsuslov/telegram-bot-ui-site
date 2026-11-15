// Every claim on the page comes from the skill repository (README, SKILL.md,
// CHANGELOG, docs/hosts.md). Update this file together with a skill release.

export const REPO = "hlibsuslov/telegram-bot-ui";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const HOSTS_URL = `${REPO_URL}/blob/main/docs/hosts.md`;

export const VERSION = "2.1.0";
export const BOT_API = "10.4";
export const VERIFIED_ON = "2026-11-15";

export const SITE_NAME = "Telegram Bot UI";
export const SITE_TITLE = "Telegram Bot UI: an Agent Skill for Telegram bot design";
export const SITE_DESCRIPTION =
  "An open-source UI/UX skill for coding agents that makes Telegram bots look and feel like real products: clean screens and keyboards, streaming AI replies with Stop, HTML widgets, channel publishing. Updated for every Bot API release.";

/**
 * Demo video near the hero. Leave `src` empty to hide the block; set it (and
 * `poster`, both under /public) when the video is ready.
 */
export const DEMO_VIDEO: {
  src: string;
  poster: string;
  title: string;
  width: number;
  height: number;
} = {
  src: "",
  poster: "",
  title: "telegram-bot-ui in under a minute",
  width: 1920,
  height: 1080,
};

export const AGENTS = [
  "Claude Code",
  "Codex",
  "Cursor",
  "Gemini CLI",
  "Antigravity",
  "GitHub Copilot",
  "Devin",
  "AGENTS.md readers",
] as const;

export type InstallMethod = {
  id: string;
  label: string;
  title: string;
  note: string;
  commands: string[];
};

export const INSTALL_METHODS: InstallMethod[] = [
  {
    id: "claude",
    label: "Claude Code",
    title: "Claude Code plugin: skill plus five subagents",
    note: "Inside a Claude Code session (2.1.275 or later).",
    commands: ["/plugin install telegram-bot-ui --marketplace hlibsuslov/telegram-bot-ui"],
  },
  {
    id: "gh",
    label: "GitHub CLI",
    title: "Any agent, with the GitHub CLI",
    note: "gh 2.96 or later. It asks which agents to install for: claude-code, codex, cursor, gemini-cli, github-copilot, antigravity and more.",
    commands: ["gh skill install hlibsuslov/telegram-bot-ui"],
  },
  {
    id: "npx",
    label: "skills CLI",
    title: "Any agent, with the open skills CLI",
    note: "Runs through npx, so it only needs Node.js.",
    commands: ["npx skills add hlibsuslov/telegram-bot-ui"],
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    title: "Gemini CLI and Antigravity",
    note: "Antigravity reads the same .agents/skills folder as Gemini CLI, so a project install covers both.",
    commands: ["gemini skills install https://github.com/hlibsuslov/telegram-bot-ui"],
  },
  {
    id: "installer",
    label: "Installer",
    title: "Without a package manager: clone and run the installer",
    note: "Standard-library Python. On Windows use py -3 instead of python. Add --dry-run to see the plan first.",
    commands: [
      "git clone https://github.com/hlibsuslov/telegram-bot-ui.git && cd telegram-bot-ui",
      "python scripts/install.py --host all --scope user",
    ],
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
    situation: "Old SDK",
    without: "new features silently dropped",
    with: "the gap is detected and bridged with an isolated adapter",
  },
] as const;

export const FAQ = [
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
    q: "My bot uses an old SDK.",
    a: "The skill checks what your SDK supports and either suggests an upgrade or adds a small, isolated adapter with a “remove when” note.",
  },
  {
    q: "Do I need Telegram Premium?",
    a: "Only for custom emoji icons in a regular bot (or Fragment usernames).",
  },
  {
    q: "How do I call it?",
    a: "Just describe the task, for example “Improve the UX of this Telegram bot.” The skill activates on its own. You can also call it by name: /telegram-bot-ui in Claude Code, $telegram-bot-ui in Codex, or the / menu in Cursor and Antigravity.",
  },
  {
    q: "What is not verified yet?",
    a: "Agent evals are prepared but not yet run. Cursor, Antigravity, Copilot, Devin and Cline were checked by documentation only. Live calls to Telegram and rendering in the Telegram apps are not part of the offline checks, and the skill tells your agent to say which level of evidence it has.",
  },
  {
    q: "Is this an official Telegram project?",
    a: "No. It is an independent MIT-licensed community project, not affiliated with or endorsed by Telegram.",
  },
] as const;
