export function messageEmojiHtml(id: string, fallback: string): string {
  const text = fallback.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<tg-emoji emoji-id="${id}">${text}</tg-emoji>`;
}

export function buttonEmojiField(id: string): string {
  return `"icon_custom_emoji_id": "${id}"`;
}
