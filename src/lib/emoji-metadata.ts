import type { Metadata } from "next";
import { EMOJI_SHARE_IMAGE_PATH } from "./emoji-links";
import { siteUrl } from "./site-url";

const shareImage = {
  url: EMOJI_SHARE_IMAGE_PATH,
  type: "image/png",
  width: 1200,
  height: 630,
  alt: "Telegram Emoji Library. Find a pack. Copy an emoji ID. A yellow duck with a magnifying glass examines six emoji beside a copy icon.",
};

export function emojiMetadata(
  path: string, title: string, description: string, type: "website" | "article" = "website",
  extra: { languages?: Record<string, string>; locale?: string; keywords?: string[] } = {},
): Metadata {
  return {
    title,
    description,
    keywords: extra.keywords,
    alternates: { canonical: path, languages: extra.languages },
    openGraph: { type, url: path, title, description, images: [shareImage], siteName: "Telegram Emoji Library", locale: extra.locale ?? "en_US" },
    twitter: { card: "summary_large_image", title, description, images: [shareImage] },
  };
}

export function emojiBreadcrumbs(...crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: `${siteUrl()}${path}`,
    })),
  };
}
