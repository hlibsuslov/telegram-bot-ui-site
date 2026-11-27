import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { LOCALES, languages, libraryPath, mosaicPath } from "@/content/emoji-seo";
import { VERIFIED_ON } from "@/content/site";
import { catalogVersion } from "@/lib/emoji-facets";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { getLibrary } from "@/lib/emoji-library";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Read the cached catalog on request so the build does not resolve it in a second worker.
  await connection();
  const { packs } = await getLibrary();
  const origin = siteUrl();
  const abs = (langs: Record<string, string>) => Object.fromEntries(Object.entries(langs).map(([l, p]) => [l, `${origin}${p}`]));
  // Dates engines can trust: the site's pages change with the skill's verified release, the library with its catalog.
  const site = new Date(VERIFIED_ON);
  const catalog = new Date(catalogVersion.generated);
  const page = (path: string, priority: number, lastModified: Date = site) => ({ url: `${origin}${path}`, priority, lastModified });
  // The emoji landings exist in English, Russian and Ukrainian; each lists the others as alternates.
  const localized = (pathFor: typeof mosaicPath, priority: number, lastModified?: Date) =>
    LOCALES.map((l) => ({ ...page(pathFor(l), priority, lastModified), changeFrequency: "weekly" as const, alternates: { languages: abs(languages(pathFor)) } }));
  return [
    page("", 1),
    ...localized(mosaicPath, 0.9),
    ...localized(libraryPath, 0.9, catalog),
    page(EMOJI_GUIDE_PATH, 0.7),
    page(EMOJI_API_DOCS_PATH, 0.6),
    page("/studio", 0.6),
    page("/agents", 0.5),
    page("/privacy", 0.2),
    ...packs.map((pack) => page(emojiPackPath(pack.name), 0.5, catalog)),
  ];
}
