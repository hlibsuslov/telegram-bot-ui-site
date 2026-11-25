// Meanings a bot interface needs most often, with the ordinary emoji that stand for them.
// The library scores packs by how many of these they cover (server) and the pack page shows
// which ones are there (client); no server-only imports here.
export const BOT_SLOTS: [string, string[]][] = [
  ["home", ["🏠", "🏡"]], ["back", ["⬅", "◀", "↩", "🔙"]], ["next", ["➡", "▶", "↪"]], ["done", ["✅", "✔", "☑"]],
  ["cancel", ["❌", "✖", "🚫"]], ["add", ["➕"]], ["settings", ["⚙", "🛠", "🔧"]], ["search", ["🔍", "🔎"]],
  ["alert", ["🔔"]], ["favorite", ["⭐", "🌟"]], ["like", ["❤", "♥", "👍"]], ["info", ["ℹ", "❓", "❔"]],
  ["warning", ["⚠", "❗", "‼"]], ["lock", ["🔒", "🔐"]], ["profile", ["👤", "🙂"]], ["money", ["💰", "💵", "💳", "🪙"]],
  ["time", ["⏳", "⏰", "🕒", "⌛"]], ["calendar", ["📅", "📆"]], ["gift", ["🎁"]], ["cart", ["🛒", "🛍"]],
  ["chat", ["💬"]], ["link", ["🔗"]], ["delete", ["🗑"]], ["edit", ["✏", "📝", "🖊"]],
];

export const SLOT_NAMES = BOT_SLOTS.map(([slot]) => slot);

export const stripVariation = (s: string) => s.replace(/[︎️]/g, "");

/** The first emoji of `fallbacks` that stands for each slot the set covers. */
export function slotEmoji(fallbacks: Iterable<string>): Map<string, string> {
  const have = new Set([...fallbacks].map(stripVariation));
  const out = new Map<string, string>();
  for (const [slot, signs] of BOT_SLOTS) {
    const hit = signs.find((e) => have.has(stripVariation(e)));
    if (hit) out.set(slot, hit);
  }
  return out;
}
