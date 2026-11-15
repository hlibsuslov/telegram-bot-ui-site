import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ } from "@/content/site";
import { Container } from "./section";

// Adapted from the 21st.dev / shadcnblocks "FAQ 3" block.
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="py-16 sm:py-20">
      <Container className="space-y-12">
        <div className="mx-auto flex max-w-3xl flex-col text-left md:text-center">
          <h2 id="faq-heading" className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl md:mb-4">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground lg:text-lg">Short answers. The README has the long ones.</p>
        </div>
        <Accordion type="single" collapsible className="mx-auto w-full rounded-2xl border border-border bg-card px-5 sm:px-6 lg:max-w-3xl">
          {FAQ.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="py-4 text-base hover:no-underline hover:opacity-70 lg:py-5">{item.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-base leading-7 text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
