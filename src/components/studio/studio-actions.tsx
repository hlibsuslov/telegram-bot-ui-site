import Link from "next/link";
import { ArrowRight, Puzzle, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudioActions({ demoHref, runHref, widgetsHref }: { demoHref: string; runHref: string; widgetsHref?: string }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <Button asChild className="h-11 gap-2 rounded-full px-5">
        <Link href={demoHref}>
          Try the live demo
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </Button>
      {widgetsHref && (
        <Button asChild variant="outline" className="h-11 rounded-full px-5">
          <Link href={widgetsHref}><Puzzle aria-hidden="true" data-icon="inline-start" /> Try widgets</Link>
        </Button>
      )}
      <Button asChild variant="outline" className="h-11 rounded-full px-5">
        <Link href={runHref}><Terminal aria-hidden="true" data-icon="inline-start" /> Run Studio locally</Link>
      </Button>
    </div>
  );
}
