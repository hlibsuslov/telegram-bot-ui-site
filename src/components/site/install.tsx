import { BOT_API, INSTALL_GUIDES, REPO_URL, VERIFIED_ON } from "@/content/site";
import { InstallWindow } from "./install-window";
import { Section } from "./section";

const PROMPTS = [
  "Improve the UX of this Telegram bot.",
  "Add a Stop button to the AI answers.",
  "People double-tap “Place order” and get two orders.",
  "Post this release note to our channel tomorrow at 9:00. Show me the preview first.",
  "Make the agent ask for approval with buttons before anything risky.",
  "Turn the order status into one card that updates.",
];

const FACTS = [
  { value: BOT_API, label: `Bot API version, verified against the official docs on ${VERIFIED_ON}` },
  { value: "194", label: "Bot API methods in the offline catalog, plus 426 types" },
  { value: "474", label: "offline tests: 443 Python and 31 TypeScript, run in CI on Linux and Windows" },
  { value: "66", label: "numbered recipes, from a settings screen to a whole shop" },
  { value: "18", label: "ready HTML widgets with light and dark themes" },
  { value: "5", label: "subagents: designer, builder, publisher, widget builder, reviewer" },
];

export function Install() {
  return (
    <Section
      id="install"
      eyebrow="Install"
      title="Pick your agent, copy one line."
      description="Every command installs the latest version and comes with the one that updates it. Then just ask: the skill activates on its own, no API names needed."
    >
      <div className="space-y-12">
        <InstallWindow guides={INSTALL_GUIDES} />
        <div className="min-w-0">
          <h3 className="font-semibold">Then, in your bot’s repository</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROMPTS.map((prompt) => (
              <li key={prompt} className="rounded-xl border border-border px-4 py-3 text-sm leading-6 text-pretty">
                “{prompt}”
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            More hosts and options:{" "}
            <a href={`${REPO_URL}#-install`} className="text-brand underline underline-offset-4 hover:no-underline">
              install guide
            </a>
            .
          </p>
        </div>
      </div>

      <div className="mt-20">
        <h3 className="text-xl font-semibold tracking-tight">Checked, not assumed</h3>
        <dl className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((fact) => (
            <div key={fact.label} className="flex flex-col-reverse justify-end border-t border-border pt-5">
              <dt className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{fact.label}</dt>
              <dd className="text-5xl font-light tracking-tight text-foreground tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
