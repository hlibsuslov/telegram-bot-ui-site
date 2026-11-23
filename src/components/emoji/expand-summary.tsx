import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** The clickable row of a `<details className="group">`: label, count and a small round toggle. */
export function ExpandSummary({ children, count }: { children: ReactNode; count: number }) {
  return (
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] [&::-webkit-details-marker]:hidden">
      <span>{children}</span>
      <span className="tg-hint tabular-nums font-normal">{count}</span>
      <span
        aria-hidden="true"
        className="ml-auto grid size-6 shrink-0 place-items-center rounded-full border border-[var(--tg-sep)] text-[var(--tg-hint)] transition-colors group-hover:text-[var(--tg-accent)] group-open:text-[var(--tg-accent)]"
      >
        <ChevronDown className="size-3.5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" strokeWidth={2.25} />
      </span>
    </summary>
  );
}
