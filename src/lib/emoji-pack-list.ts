import "server-only";
import packsText from "@/content/emoji-packs.txt";
import { fixturesOn } from "./emoji-fixtures";

export const PACK_NAME = /^[A-Za-z0-9_]{1,64}$/;
export const OTHER = "Other";
const LINK = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/addemoji\/([A-Za-z0-9_]{1,64})\/?(?:[?#].*)?$/i;

export interface ListedPack { name: string; category: string }

/** A heading assigns a category until the next heading. Keep the first spelling and rank. */
function parsePackList(text: string): ListedPack[] {
  const seen = new Set<string>();
  const out: ListedPack[] = [];
  let category = OTHER;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      category = line.slice(3).trim().slice(0, 40) || OTHER;
      continue;
    }
    if (!line || line.startsWith("#")) continue;
    const name = LINK.exec(line)?.[1] ?? line;
    if (!PACK_NAME.test(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, category });
  }
  return out;
}

const PUBLIC_PACKS = parsePackList(packsText);
const FIXTURE_PACKS: ListedPack[] = [
  { name: "bot_ui_demo_icons", category: "Interface" },
  { name: "bot_ui_demo_motion", category: "Animated marks" },
  { name: "bot_ui_demo_status", category: "Interface" },
];

export function listedPacks(): ListedPack[] {
  return fixturesOn() ? FIXTURE_PACKS : PUBLIC_PACKS;
}

const byName = new Map(listedPacks().map((pack) => [pack.name.toLowerCase(), pack.name]));

export function listedPackName(name: string): string | undefined {
  return byName.get(name.toLowerCase());
}
