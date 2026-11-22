// bot-ui Studio: every claim comes from studio/README.md, studio/docs/contract.md and the Studio
// client in the skill repository (feat/bot-ui-studio). The demo bot lives in demo/bot-ui and is
// built with scripts/build_demo.py; its numbers below are checked by that build.

import { REPO_URL } from "./site";

export const STUDIO_URL = `${REPO_URL}/tree/main/studio`;
export const STUDIO_README_URL = `${REPO_URL}/blob/main/studio/README.md`;
export const CONTRACT_URL = `${REPO_URL}/blob/main/studio/docs/contract.md`;

/** The public demo: the Studio client in demo mode with the Brewline snapshot (public/studio/demo.html). */
export const DEMO_PAGE = "/studio/demo.html";

export const DEMO_BOT = {
  name: "Brewline",
  what: "a coffee-to-go bot made for this demo",
  screens: 19,
  scenarios: 4,
  widgets: 2,
  locales: ["English", "Russian", "Ukrainian"],
} as const;

export type StudioPillar = {
  id: "map" | "widgets" | "screens";
  n: number;
  label: string;
  title: string;
  text: string;
  points: string[];
};

export const PILLARS: StudioPillar[] = [
  {
    id: "map",
    n: 1,
    label: "Map and simulator",
    title: "See the whole bot at once.",
    text: "Every screen is drawn as the message people actually get, and every button has an arrow to where it leads. Then press START and use the bot right there.",
    points: [
      "Back buttons, conditional rules with both branches, entry commands and external events on one map",
      "Search by ID, title or text; copy a screen ID or queue a request for your agent from any node",
      "A Telegram-style simulator with phone, tablet and desktop sizes, light and dark chat, every language",
      "A trace of what the engine did with each update: sends, edits, toasts, stale buttons, fallbacks",
    ],
  },
  {
    id: "widgets",
    n: 2,
    label: "Widget builder",
    title: "Build widgets you can watch while you build them.",
    text: "Start from a blank widget or one of 23 from the skill’s library, change how it looks and what data it shows, and see it live in a chat bubble.",
    points: [
      "Live preview in the chat theme, at the widths Telegram uses, with the states your bot sends",
      "Size meters measured the way Telegram’s server measures: 32 KB of HTML, 4 KB compressed",
      "Data as a form for people (steps, times, names), JSON for those who want it",
      "Turn a photo into an inline SVG asset; export the build and the sendWidget payload",
    ],
  },
  {
    id: "screens",
    n: 3,
    label: "Screen editor",
    title: "Change a screen without touching the code.",
    text: "Edit texts, button labels and colours, keyboards, where each button leads and the rule behind it. The preview and the map follow every keystroke.",
    points: [
      "Drafts with undo and redo; Save writes the screen file and git diff shows it",
      "One write path with revision checks, so an old draft never overwrites newer work",
      "Beginner mode with plain forms, Pro mode with every field and the raw JSON",
      "Problems shown next to the field: missing translations, dead links, rows too wide for a phone, unreachable screens",
    ],
  },
];

export type FlowStep = { title: string; text: string; code?: string };

/** How the Studio and a coding agent work on the same files. */
export const AGENT_FLOW: FlowStep[] = [
  {
    title: "Point at what to change",
    text: "Copy a screen ID or leave a request on the map node: “make the payment error friendlier”.",
  },
  {
    title: "The Studio writes the task",
    text: "The Changes page collects your drafts, saved files and requests into one prompt for the agent.",
  },
  {
    title: "Your agent edits the files",
    text: "Claude Code, Codex, Cursor or any agent with the skill follows the same contract and the same CLI.",
    code: "bot-ui validate && bot-ui simulate --all",
  },
  {
    title: "The bot picks it up",
    text: "The adapters re-read the project when its revision changes: no restart, and old buttons are answered as stale.",
  },
];

export const STUDIO_FACTS = [
  { title: "Your repository", text: "The interface lives in bot-ui/ next to your code, as plain JSON you can review." },
  { title: "Offline", text: "No account and no bot token to edit, simulate or build. Nothing is sent to Telegram." },
  { title: "Loopback only", text: "The local Studio serves one project on 127.0.0.1 and stops with Ctrl+C." },
  { title: "One engine", text: "The browser and the bot run the same rules; a parity test keeps them in step." },
];

export type StudioCommand = { label: string; command: string };

export const RUN_STEPS: StudioCommand[] = [
  { label: "Get the Studio and build its client once", command: "git clone https://github.com/hlibsuslov/telegram-bot-ui && cd telegram-bot-ui/studio/web && npm ci && npm run build && cd ../.." },
  { label: "Start a project in your bot’s repository", command: "python studio/bot-ui.py init --project ../my-bot/bot-ui" },
  { label: "Or build the map from an existing aiogram bot (its code is not changed)", command: "python studio/bot-ui.py import --source ../my-bot" },
  { label: "Open the Studio", command: "python studio/bot-ui.py studio --project ../my-bot/bot-ui" },
];

export const RUN_NOTE =
  "Python 3.12 or later (standard library only; on Windows use py -3) and Node.js 22.18 or later to build the client once. The Studio prints a local address and serves only that project.";

/** Guided first minutes in the demo; `hash` is the Studio route the frame opens. */
export const DEMO_TOUR = [
  { hash: "#/map", title: "Find the empty state", text: "On the map, follow “My order” from the start screen: the rule sends a guest without an order to order.none." },
  { hash: "#/simulator", title: "Break the payment", text: "In the simulator, open the START menu, pick the order.declined scenario and run it: the card is declined, the guest retries, the order goes through." },
  { hash: "#/screens/entry.start", title: "Rename a button", text: "Change “Repeat my usual” to anything you like. The preview, the map and the simulator all follow." },
  { hash: "#/task", title: "Hand it to your agent", text: "Open the task for the agent: your edits, written up as a prompt you can paste into Claude Code or Codex." },
] as const;
