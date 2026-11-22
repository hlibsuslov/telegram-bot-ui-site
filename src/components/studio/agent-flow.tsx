import { AGENT_FLOW } from "@/content/studio";

/** The four steps between a person in the Studio and a coding agent, on the same files. */
export function AgentFlow() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {AGENT_FLOW.map((step, i) => (
        <li key={step.title} className="relative flex flex-col bg-card p-5 sm:p-6">
          <span
            aria-hidden="true"
            className="inline-flex size-7 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand tabular-nums"
          >
            {i + 1}
          </span>
          <h4 className="mt-4 text-base font-semibold">{step.title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
          {step.code ? (
            <code className="mt-4 block rounded-lg bg-muted px-2.5 py-1.5 font-mono text-[11.5px] leading-5 [overflow-wrap:anywhere] text-foreground">
              {step.code}
            </code>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
