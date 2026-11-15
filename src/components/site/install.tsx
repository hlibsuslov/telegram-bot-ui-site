import { BOT_API, INSTALL_METHODS, REPO_URL, VERIFIED_ON } from "@/content/site";
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
  { value: `Bot API ${BOT_API}`, label: `verified against the official docs on ${VERIFIED_ON}` },
  { value: "193 · 425", label: "Bot API methods and types in the offline catalog" },
  { value: "414 + 31", label: "Python and TypeScript tests, offline, on Linux and Windows in CI" },
  { value: "65 · 18", label: "numbered recipes and ready HTML widgets" },
];

export function Install() {
  return (
    <Section
      id="install"
      eyebrow="Install"
      title="One line, then just ask."
      description="Pick the way that fits your agent. The skill activates on its own: no API names needed."
    >
      <div className="space-y-12">
        <InstallWindow methods={INSTALL_METHODS} />
        <div className="min-w-0">
          <h3 className="font-semibold">Then, in your bot’s repository</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROMPTS.map((prompt) => (
              <li key={prompt} className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-pretty">
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
        <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.value} className="flex flex-col-reverse bg-card p-5">
              <dt className="mt-1 text-sm leading-6 text-muted-foreground">{fact.label}</dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
