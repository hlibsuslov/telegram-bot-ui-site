import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl()}/studio`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl()}/emoji`, changeFrequency: "weekly", priority: 0.7 },
  ];
}
