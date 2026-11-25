import { BOT_API } from "@/content/site";
import { DuckIcon, type DuckIconName } from "./duck-icon";
import { Section } from "./section";

type Feature = {
  title: string;
  icon: DuckIconName;
  description: string;
};

// Wording follows the README "What your agent can do" table.
const FEATURES: Feature[] = [
  {
    title: "Build bot interfaces",
    icon: "interfaces",
    description: `Texts, menus, inline and reply keyboards, colored and disabled buttons, forms, navigation, streaming answers with Stop, Rich Messages, tables, localization, and the bot’s own settings from code (Bot API ${BOT_API}).`,
  },
  {
    title: "Product flows",
    icon: "flows",
    description:
      "Shops, Stars payments and subscriptions, support, bookings, AI assistants, trackers: no stale “Pay” buttons, no double orders, no personal data leaking into groups.",
  },
  {
    title: "Publish to channels",
    icon: "channels",
    description: "Compose, validate, preview, approve and schedule channel posts; never post twice after a timeout.",
  },
  {
    title: "Operate as an agent through a bot",
    icon: "operator",
    description:
      "Drive an agent from Telegram with an operator allowlist and approval buttons bound to one action. Inbound messages are data, not instructions.",
  },
  {
    title: "Build HTML widgets",
    icon: "widgets",
    description:
      "Bot API 10.4 widgets inside messages: 24 ready widgets, a size check that follows the server’s algorithm, caption fallback and a local preview.",
  },
  {
    title: "Build and rework Mini Apps",
    icon: "mini-apps",
    description:
      "Decide bot, widget or Mini App; Telegram.WebApp by version; a Telegram-native design system, Stars and gifts drawn the way Telegram draws them, initData verification, and a staged rework of web-style apps.",
  },
  {
    title: "Premium emoji",
    icon: "emoji",
    description:
      "One custom emoji pack across buttons, texts and posts, picked from a library of 479 packs by coverage and tags, with real ids and an all-or-nothing fallback when the bot is not eligible.",
  },
  {
    title: "Look up the whole Bot API",
    icon: "bot-api",
    description:
      "194 methods and 426 types in a local catalog, each method with an agent card and a checked example. Validate a payload before sending; the agent refuses to invent a field.",
  },
  {
    title: "Knows when not to",
    icon: "restraint",
    description:
      "No widget for a three-button menu, no table for two facts, no group widgets in production, no publishing without a human’s yes.",
  },
];

// Verbs and what each does come from the skill's commands/index.json (3.2.0+); the requests are examples.
const COMMANDS = [
  { verb: "start", does: "Reads the project and offers the two or three best next commands; runs nothing by itself.", ask: "What should I fix in this bot first?" },
  { verb: "audit", does: "Maps the screens and ranks real defects P0 to P3, for the whole bot or a diff, and saves them as findings. Read-only for code.", ask: "Review the UX of this bot." },
  { verb: "improve", does: "Changes existing screens: wording, keyboards, flows, streaming, formatting, the premium pass, a brand-fit redesign or a newer Bot API.", ask: "Make the menus feel premium." },
  { verb: "fix", does: "Reproduces and fixes one Telegram-facing defect: parse errors, dead buttons, frozen waits, lost updates, too-long messages.", ask: "Telegram says can’t parse entities." },
  { verb: "build", does: "Builds a product or feature from the example library: shop, payments and subscriptions, support, booking, inline mode, communities.", ask: "Add a Stars subscription." },
  { verb: "post", does: "Channel posts and mailings: render, validate, preview, approve, publish once, edit or cross-post.", ask: "Prepare Friday’s channel post." },
  { verb: "widget", does: "An HTML widget inside a message with its server handler: built from the kit, size-checked, with a text fallback.", ask: "Show order status as a live card." },
  { verb: "mini-app", does: "Decides whether a Mini App is needed, builds or restyles it, Telegram.WebApp by version, layout, initData security.", ask: "Make this web app look native in Telegram." },
  { verb: "emoji", does: "One premium emoji pack resolved and applied wherever the bot is eligible: all icons of a message or none.", ask: "Use one emoji pack for every button." },
  { verb: "agent-bot", does: "The agent’s own bot: notify, live status, ask and wait, bound approvals, files, hooks and MCP, secured.", ask: "Ask me in Telegram before you deploy." },
  { verb: "map", does: "The bot-ui map: create, import, patch with revision checks, simulate, open the Studio and carry out Studio requests.", ask: "Open my bot in Studio." },
  { verb: "lookup", does: "Answers whether the Bot API or Telegram.WebApp has something, from the offline catalogs; never invents.", ask: "Can a bot send a table?" },
] as const;

// Adapted from the 21st.dev "Grid Feature Cards" block (hairline grid, icon, title, text).
function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <li className="bg-background p-6">
      <DuckIcon name={feature.icon} className="size-10" />
      <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
    </li>
  );
}

export function Capabilities() {
  return (
    <Section
      id="capabilities"
      eyebrow="What your agent can do"
      title="From one button label to a whole bot product."
      description="The skill routes each task to one of twelve commands, focused guides, 76 recipes and offline tools, so your agent writes only what your project is missing."
    >
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </ul>

      <h3 className="mt-16 text-xl font-semibold tracking-tight">Twelve commands behind plain requests</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        You describe the task; the skill picks the command and its playbook: the reference sections to read, the steps, the
        checks and what counts as done.
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">The skill’s commands, what each one does and a request that starts it</caption>
          <thead className="hidden bg-muted text-muted-foreground md:table-header-group">
            <tr>
              <th scope="col" className="w-32 px-5 py-3 font-medium">Command</th>
              <th scope="col" className="px-5 py-3 font-medium">What the agent does</th>
              <th scope="col" className="w-1/3 px-5 py-3 font-medium">You might say</th>
            </tr>
          </thead>
          <tbody>
            {COMMANDS.map((c) => (
              <tr key={c.verb} className="block border-t border-border first:border-t-0 md:table-row">
                <th scope="row" className="block px-5 pt-4 md:table-cell md:py-3.5 md:align-top">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] font-medium text-brand">{c.verb}</code>
                </th>
                <td className="block px-5 pt-2 text-muted-foreground md:table-cell md:py-3.5 md:align-top"><span className="sr-only md:hidden">What the agent does: </span>{c.does}</td>
                <td className="block px-5 pt-1 pb-4 italic md:table-cell md:py-3.5 md:align-top"><span className="not-italic text-muted-foreground md:hidden">You might say: </span>“{c.ask}”</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
