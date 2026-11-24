import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "./section";

export function EmojiLibraryLink() {
  return (
    <section id="emoji-library" aria-labelledby="emoji-library-heading">
      <Container>
        <div className="flex flex-col items-start gap-5 border-y border-border py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-10">
          <div className="max-w-lg">
            <h2 id="emoji-library-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Premium emoji library
            </h2>
            <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground sm:text-base">
              Find Telegram emoji packs, preview animations, and copy the code for your bot’s messages and buttons.
            </p>
          </div>
          <Button asChild variant="secondary" size="lg" className="h-11 px-4">
            <Link href="/emoji">
              Browse emoji packs
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
