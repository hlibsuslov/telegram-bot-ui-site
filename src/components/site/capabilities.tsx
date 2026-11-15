import { useId, type ComponentType, type SVGProps } from "react";
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

// Fixed squares per card (the original block randomises them, which would
// differ between server and client renders).
const PATTERNS = [
  [[7, 1], [9, 3], [8, 5], [10, 2], [7, 4]],
  [[8, 2], [10, 4], [7, 6], [9, 1], [8, 5]],
  [[9, 2], [7, 3], [10, 5], [8, 1], [9, 6]],
  [[10, 1], [8, 3], [7, 5], [9, 4], [10, 6]],
];

// Adapted from the 21st.dev "Grid Feature Cards" block.
function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  return (
    <li className="relative overflow-hidden bg-card p-6">
      <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/[0.01] [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
          <GridPattern
            width={20}
            height={20}
            x={-12}
            y={4}
            squares={PATTERNS[index % PATTERNS.length]}
            className="absolute inset-0 h-full w-full fill-foreground/[0.04] stroke-foreground/10"
          />
        </div>
      </div>
      <Icon className="size-6 text-brand" strokeWidth={1.5} aria-hidden="true" />
      <h3 className="mt-8 text-base font-semibold">{feature.title}</h3>
      <p className="relative z-10 mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
    </li>
  );
}

function GridPattern({
  width,
  height,
  x,
  y,
  squares,
  className,
}: {
  width: number;
  height: number;
  x: number;
  y: number;
  squares: number[][];
  className?: string;
}) {
  const patternId = useId();
  return (
    <svg aria-hidden="true" className={className}>
      <defs>
        <pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(([sx, sy]) => (
          <rect strokeWidth={0} key={`${sx}-${sy}`} width={width + 1} height={height + 1} x={sx * width} y={sy * height} />
        ))}
      </svg>
    </svg>
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
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </ul>
    </Section>
  );
}
