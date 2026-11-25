import { ArrowRight } from "lucide-react";
import { RELEASES, type ReleaseFeature } from "@/content/releases";
import { CHANGELOG_URL, VERSION } from "@/content/site";
import { DuckIcon } from "./duck-icon";
import { CopyButton } from "./install-window";
import { Section } from "./section";

function Feature({ feature }: { feature: ReleaseFeature }) {
  return (
    <li className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <DuckIcon name={feature.icon} className="size-14 shrink-0" />
        <div className="min-w-0">
          <h4 className="font-semibold text-pretty">{feature.title}</h4>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{feature.text}</p>
        </div>
      </div>
      {feature.code ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background py-1.5 pr-1.5 pl-3">
          <code className="min-w-0 flex-1 py-1 font-mono text-xs leading-5 [overflow-wrap:anywhere]">{feature.code}</code>
          <CopyButton text={feature.code} label={feature.title} />
        </div>
      ) : null}
    </li>
  );
}

// Layout adapted from the 21st.dev "Timeline" block by Shadcn Studio (changelog with sticky
// version markers): the version and date stay pinned while the release scrolls past.
export function Releases() {
  return (
    <Section
      id="whats-new"
      eyebrow={`What’s new · v${VERSION}`}
      title="Three releases in two days, all of it working."
      description="Mini Apps, twelve commands, a local MCP server, a memory for your bot, agent cards for the whole Bot API and an emoji library your agent can query. Every command below runs today."
    >
      <ol className="w-full">
        {RELEASES.map((release, i) => (
          <li key={release.version} className="relative flex gap-2">
            <div className="sticky top-24 flex w-28 shrink-0 flex-col items-end gap-1.5 self-start pb-4 max-md:hidden">
              <span className="inline-flex h-7 items-center rounded-md bg-brand px-2.5 text-sm font-semibold text-background tabular-nums">
                v{release.version}
              </span>
              <time dateTime={release.dateTime} className="text-right text-sm text-muted-foreground">
                {release.date}
              </time>
            </div>
            <div className="flex flex-col items-center" aria-hidden="true">
              <div className="sticky top-24 flex size-7 items-center justify-center">
                <span className="flex size-5 items-center justify-center rounded-full bg-brand/20">
                  <span className="size-3 rounded-full bg-brand" />
                </span>
              </div>
              {i < RELEASES.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
            </div>
            <div className="min-w-0 flex-1 pb-14 pl-3 md:pl-8">
              <p className="flex items-center gap-2 text-sm md:hidden">
                <span className="rounded-md bg-brand px-2 py-0.5 font-semibold text-background">v{release.version}</span>
                <time dateTime={release.dateTime} className="text-muted-foreground">{release.date}</time>
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-balance md:mt-0 sm:text-2xl">{release.title}</h3>
              <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">{release.summary}</p>
              <ul className="mt-6 grid gap-4 lg:grid-cols-2">
                {release.features.map((feature) => (
                  <Feature key={feature.title} feature={feature} />
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <a href={CHANGELOG_URL} className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline md:ml-[9.5rem]">
        Read the full changelog <ArrowRight aria-hidden="true" className="size-4" />
      </a>
    </Section>
  );
}
