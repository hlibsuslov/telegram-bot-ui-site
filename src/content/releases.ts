// The 3.x releases of the skill, from its CHANGELOG.md (3.1.0 on 2026-11-24, 3.2.0 and 3.3.0 on
// 2026-11-25). Only shipped, working features; counts are the ones the changelog states.

import type { DuckIconName } from "@/components/site/duck-icon";

export type ReleaseFeature = {
  icon: DuckIconName;
  title: string;
  text: string;
  /** A command the visitor can copy and run. */
  code?: string;
};

export type Release = {
  version: string;
  date: string;
  dateTime: string;
  title: string;
  summary: string;
  features: ReleaseFeature[];
};

export const RELEASES: Release[] = [
  {
    version: "3.3",
    date: "Nov 25, 2026",
    dateTime: "2026-11-25",
    title: "The whole Bot API in cards, emoji picked by tags, evals with a judge",
    summary: "Your agent stops guessing: every method has a checked example, every emoji pack has tags, every answer can be scored.",
    features: [
      {
        icon: "api-cards",
        title: "An agent card for every Bot API method",
        text: "All 194 methods have a note and a checked request example; all 426 types and 286 WebApp members are covered. One lookup returns catalog, note and example together.",
        code: "py -3 scripts/tgui.py lookup card sendRichMessage",
      },
      {
        icon: "tags",
        title: "Emoji packs chosen by tags",
        text: "Pick one pack for your icon slots by style, colour, theme fit and motion, and see why each pack ranks where it does. Offline, the export ranks packs by your style profile.",
        code: "py -3 scripts/tgui.py emoji library pick --needs home,back,settings",
      },
      {
        icon: "rich",
        title: "Rich Messages as JSON blocks",
        text: "Block and rich-text builders mirrored from the catalog, and a validator that checks blocks as deeply as HTML, with error paths instead of crashes.",
      },
      {
        icon: "payments",
        title: "Stars payments you can audit",
        text: "A read-only ledger audit over the Star statement, and a pre-checkout recipe that checks payload, payer, currency and shipping option before the amount.",
      },
      {
        icon: "evals",
        title: "Evals with a judge",
        text: "A behavioural runner with a versioned, tool-less LLM judge, per-role scores and a release gate. The judge agreed with 10 hand-labelled answers 50 times out of 50.",
      },
    ],
  },
  {
    version: "3.2",
    date: "Nov 25, 2026",
    dateTime: "2026-11-25",
    title: "Twelve commands, one CLI, an MCP server and a memory",
    summary: "SKILL.md became a 9.5 KB router; the safety rules now survive context compaction.",
    features: [
      {
        icon: "commands",
        title: "Twelve commands with playbooks",
        text: "start, audit, improve, fix, build, post, widget, mini-app, emoji, agent-bot, map and lookup. You never need to know a verb: with no request, start suggests the next step.",
      },
      {
        icon: "mcp",
        title: "A local MCP server with 15 tools",
        text: "Bot API and WebApp lookup, request and Rich HTML validation, map render, simulate and snapshot, command audit and plan, emoji library search and pick. Standard library only.",
        code: "py -3 scripts/tgui.py mcp",
      },
      {
        icon: "memory",
        title: "The bot remembered between sessions",
        text: "bot-ui/context/ keeps facts, findings, Studio requests and the style profile; the agent reads them back in under 2 KB instead of re-scanning the repository.",
        code: "py -3 scripts/tgui.py context",
      },
      {
        icon: "agent-task",
        title: "One entry point: tgui.py",
        text: "Every tool as a subcommand, plus doctor, next, check changed (the right validator for every changed Telegram file) and a command menu audit against setMyCommands.",
        code: "py -3 scripts/tgui.py doctor",
      },
    ],
  },
  {
    version: "3.1",
    date: "Nov 24, 2026",
    dateTime: "2026-11-24",
    title: "Mini Apps, not only bots",
    summary: "The skill builds and reworks Telegram Mini Apps with the same rigour it brings to bot screens.",
    features: [
      {
        icon: "mini-apps",
        title: "A Telegram-native design system",
        text: "Theme roles, the iOS type scale, named styles, 126 elements and 25 layout rules for prices, galleries, forms and booking, checked by a lint with over 40 rules.",
        code: "py -3 scripts/tgui.py miniapp lint app/ --strict",
      },
      {
        icon: "edit-bot",
        title: "Rework a web-style app",
        text: "A staged plan with colour and type maps, a Tailwind and shadcn/ui token bridge, and a 16-item acceptance score for turning any app into classic Telegram design.",
        code: "py -3 scripts/tgui.py miniapp rework plan app/",
      },
      {
        icon: "widgets",
        title: "Stars, gifts and initData done right",
        text: "Payments inside the app with a screen for every invoice status, Telegram’s own Stars and gift look, and server-side initData verification in Python and Node.",
      },
    ],
  },
];
