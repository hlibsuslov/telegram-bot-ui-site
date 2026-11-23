import { emojiPackPath, telegramPackUrl } from "@/lib/emoji-links";

const id = "5325536405093384220";
const name = "checkified";
const path = emojiPackPath(name, id);
const api = `/api/emoji-pack/${name}`;

// Telegram pack metadata and the checkmark were verified through the production library on 2026-11-23.
export const CHECKMARK = {
  id,
  name,
  path,
  api,
  lookup: `/api/emoji-pack/by-id?ids=${id}`,
  search: "/api/emoji-search?q=checkmark&pack=checkified",
  telegramUrl: telegramPackUrl(name),
  title: "checkified, @svg5926tgsbot",
  fallback: "✅",
  format: "animated",
  adaptive: true,
  preview: `${api}/${id}`,
  animation: `${api}/${id}/anim`,
} as const;
