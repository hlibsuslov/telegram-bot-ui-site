import Link from "next/link";
import { Search, Tags } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { labelled, packFacets, packFacetTitle } from "@/lib/emoji-facets";
import { emojiPackPath } from "@/lib/emoji-links";
import { packAbout } from "@/lib/emoji-pack-about";

// The existing shadcnblocks FAQ 3 disclosure, with the Telegram UI Kit Section and Cell layout.
// The divided accordion variant was reviewed in the 21st.dev catalog (BoardUI Accordion).
export function PackDetails({ name, category, tags }: { name: string; category: string; tags: string[] }) {
  const about = packAbout(name);
  const facets = packFacets(name);
  const groups = labelled(facets?.facets ?? {});
  const keywords = [...new Set(tags)];
  const related = facets?.compatible ?? [];
  const rows = [
    ["Best for", about?.suits],
    ["Less suited to", about?.notFor],
    ["Visual style", about?.drawn],
  ];
  return (
    <section aria-labelledby="pack-details-title" className="tg-glass mt-6 rounded-3xl px-4 py-4 sm:px-5 sm:py-5">
      <h2 id="pack-details-title" className="text-lg font-semibold">About this pack</h2>
      <p className="tg-hint mt-0.5 text-xs">{category}</p>
      {about && (
        <>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed">{about.what}</p>
          <dl className="mt-3 grid max-w-5xl gap-x-6 gap-y-3 border-t border-[var(--tg-sep)] pt-3 sm:grid-cols-3">
            {rows.map(([label, value]) => value && (
              <div key={label}>
                <dt className="tg-hint mb-1 text-xs font-semibold">{label}</dt>
                <dd className="text-sm leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {!!(groups.length || keywords.length || related.length) && (
        <Accordion type="single" collapsible className={about ? "mt-4 border-t border-[var(--tg-sep)] pt-1" : "mt-1"}>
          <AccordionItem value="tags">
            <AccordionTrigger className="min-h-11 items-center gap-2.5 text-[15px] font-semibold hover:no-underline">
              <Tags aria-hidden="true" className="tg-accent size-[18px]" />
              <span>Explore by tag</span>
            </AccordionTrigger>
            <AccordionContent className="[&_a]:no-underline">
              <p className="tg-hint mt-1 flex items-center gap-2 text-sm">
                <Search aria-hidden="true" className="size-4 shrink-0" />
                Select a tag to search the library.
              </p>
              <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <div key={group.facet} className="min-w-0">
                    <dt className="tg-hint mb-1 text-xs font-semibold">{group.label}</dt>
                    <dd className="flex flex-wrap gap-1">
                      {group.values.map((tag) => (
                        <TagLink key={tag.id} query={`${group.facet}:${tag.id}`} confidence={tag.confidence}>{tag.label}</TagLink>
                      ))}
                    </dd>
                  </div>
                ))}
                {!!keywords.length && (
                  <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                    <dt className="tg-hint mb-1 text-xs font-semibold">Keywords</dt>
                    <dd className="flex flex-wrap gap-1">
                      {keywords.map((tag) => <TagLink key={tag} query={tag}>{tag}</TagLink>)}
                    </dd>
                  </div>
                )}
              </dl>
              {!!related.length && (
                <div className="mt-4 border-t border-[var(--tg-sep)] pt-3">
                  <p className="tg-hint mb-1 text-xs font-semibold">Pairs well with</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {related.map(([pack]) => (
                      <li key={pack}><Link href={emojiPackPath(pack)} prefetch={false} className="tg-accent hover:underline">{packFacetTitle(pack) || pack}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </section>
  );
}

function TagLink({ query, confidence, children }: { query: string; confidence?: number; children: string }) {
  return (
    <Link href={`/emoji?q=${encodeURIComponent(query)}`} prefetch={false}
      title={confidence === undefined ? undefined : `Confidence ${Math.round(confidence * 100)}%`}
      className="tg-field inline-flex min-h-8 items-center rounded-full px-3 py-1 text-sm hover:underline">
      {children}
    </Link>
  );
}
