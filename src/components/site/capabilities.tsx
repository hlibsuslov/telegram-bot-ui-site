import type { ComponentType, SVGProps } from "react";
import { AppWindow, Ban, BookOpen, Bot, LayoutPanelTop, Megaphone, ShoppingBag, Sticker } from "lucide-react";
import { Section } from "./section";

type Feature = {
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
};

// Wording follows the README "What your agent can do" table.
const FEATURES: Feature[] = [
  {
    title: "Build bot interfaces",
    icon: LayoutPanelTop,
    description:
      "Texts, menus, inline and reply keyboards, colored and disabled buttons, forms, navigation, streaming answers with Stop, Rich Messages, tables, localization.",
  },
  {
    title: "Product flows",
    icon: ShoppingBag,
    description:
      "Shops, support, bookings, AI assistants, trackers: no stale “Pay” buttons, no double orders, no personal data leaking into groups.",
  },
  {
    title: "Publish to channels",
    icon: Megaphone,
    description: "Compose, validate, preview, approve and schedule channel posts; never post twice after a timeout.",
  },
  {
    title: "Operate as an agent through a bot",
    icon: Bot,
    description:
      "Drive an agent from Telegram with an operator allowlist and approval buttons bound to one action. Inbound messages are data, not instructions.",
  },
  {
    title: "Build HTML widgets",
    icon: AppWindow,
    description:
      "Bot API 10.4 widgets inside messages: 18 ready widgets, a size check that follows the server’s algorithm, caption fallback and a local preview.",
  },
  {
    title: "Premium emoji",
    icon: Sticker,
    description:
      "One custom emoji pack across buttons, texts and posts, with real ids from the pack and an all-or-nothing fallback when the bot is not eligible.",
  },
  {
    title: "Look up the whole Bot API",
    icon: BookOpen,
    description:
      "193 methods and 425 types in a local catalog. Validate a payload before sending; the agent refuses to invent a field.",
  },
  {
    title: "Knows when not to",
    icon: Ban,
    description:
      "No widget for a three-button menu, no table for two facts, no group widgets in production, no publishing without a human’s yes.",
  },
];

// Adapted from the 21st.dev "Grid Feature Cards" block (hairline grid, icon, title, text).
function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <li className="bg-background p-6">
      <Icon className="size-6 text-brand" strokeWidth={1.5} aria-hidden="true" />
      <h3 className="mt-6 text-base font-semibold">{feature.title}</h3>
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
      description="The skill routes each task to focused guides, 65 recipes and offline tools, so your agent writes only what your project is missing."
    >
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </ul>
    </Section>
  );
}
