// A pack's written description and look card from src/content/emoji-facets.json (descriptions in
// English, Russian and Ukrainian; the look card from the vision pass over the contact sheets).
import "server-only";
import facetsDoc from "@/content/emoji-facets.json";

export type AboutLang = "en" | "ru" | "uk";
interface Description { what: string; for: string; not_for: string }
interface PackEntry { description?: Partial<Record<AboutLang, Description>>; look?: { drawn?: string } }

const packs = (facetsDoc as unknown as { packs: Record<string, PackEntry> }).packs;
const byLower = new Map(Object.keys(packs).map((k) => [k.toLowerCase(), k]));

export interface PackAbout { what: string; suits: string; notFor: string; drawn: string | null }

/** The description in `lang`, or in English when that language is missing. */
export function packAbout(name: string, lang: AboutLang = "en"): PackAbout | null {
  const key = byLower.get(name.toLowerCase());
  const entry = key ? packs[key] : undefined;
  const d = entry?.description?.[lang] ?? entry?.description?.en;
  if (!d?.what) return null;
  const drawn = entry?.look?.drawn;
  // Look cards are notes, some start in lower case.
  return { what: d.what, suits: d.for, notFor: d.not_for, drawn: drawn ? drawn[0].toUpperCase() + drawn.slice(1) : null };
}
