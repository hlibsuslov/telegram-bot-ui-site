import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { getLibrary } from "@/lib/emoji-library";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Read the cached catalog on request so the build does not resolve it in a second worker.
  await connection();
  const { packs } = await getLibrary();
  const paths = ["", "/studio", "/privacy", "/emoji", EMOJI_GUIDE_PATH, EMOJI_API_DOCS_PATH, ...packs.map((pack) => emojiPackPath(pack.name))];
  return paths.map((path) => ({ url: `${siteUrl()}${path}` }));
}
