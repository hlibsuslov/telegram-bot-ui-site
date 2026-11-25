export const EMOJI_LIBRARY_PATH = "/emoji";
export const EMOJI_GUIDE_PATH = "/emoji/custom-emoji-guide";
export const EMOJI_API_DOCS_PATH = "/emoji/api-docs";
export const EMOJI_SHARE_IMAGE_PATH = "/share/telegram-emoji-library.png";
export const EMOJI_OPENAPI_PATH = "/api/emoji-openapi.json";
export const EMOJI_EXPORT_PATH = "/emoji-library.ndjson.gz";

export function emojiPackPath(name: string, id?: string): string {
  return `${EMOJI_LIBRARY_PATH}/${name}${id ? `#e=${id}` : ""}`;
}

export function telegramPackUrl(name: string): string {
  return `https://t.me/addemoji/${name}`;
}
