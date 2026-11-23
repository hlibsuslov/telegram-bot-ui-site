import { SITE_ORIGIN } from "@/content/site";

/** Absolute origin used for metadata, sitemap and robots: the canonical domain in production,
 *  the deployment's own address in previews, localhost in development. NEXT_PUBLIC_SITE_URL wins. */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV === "production") return SITE_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
