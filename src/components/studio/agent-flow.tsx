import Image from "next/image";
import { AGENT_FLOW } from "@/content/studio";

export function AgentFlow({ stepHeading: StepHeading = "h3" }: { stepHeading?: "h3" | "h4" }) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {AGENT_FLOW.map((step) => (
        <li key={step.id} className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-4 bg-card p-4 sm:flex sm:flex-col sm:p-5">
          <div className="grid aspect-square w-full place-items-center rounded-xl bg-brand/5 sm:aspect-[2/1]">
            <Image
              src={`/studio/flow/${step.id}.webp`}
              alt=""
              width={288}
              height={288}
              unoptimized
              className="size-16 object-contain sm:size-24"
            />
          </div>
          <div>
            <StepHeading className="text-base leading-snug font-semibold">{step.title}</StepHeading>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
