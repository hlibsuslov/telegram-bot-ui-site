"use client";

// What a visitor keeps from the library, in this browser only (localStorage): saved packs and
// single emoji they picked. Nothing is sent anywhere.
import { useCallback, useSyncExternalStore } from "react";
import { track } from "@/components/site/analytics";

export type SavedEmoji = { id: string; fallback: string; pack: string };
type Saved = { packs: string[]; emoji: SavedEmoji[] };

const KEY = "bot-ui:emoji-library";
const EMPTY: Saved = { packs: [], emoji: [] };
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Saved } = { raw: null, value: EMPTY };

function read(): Saved {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage off */ }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    const doc = JSON.parse(raw ?? "null") as Partial<Saved> | null;
    value = {
      packs: Array.isArray(doc?.packs) ? doc.packs.filter((p): p is string => typeof p === "string").slice(0, 500) : [],
      emoji: Array.isArray(doc?.emoji)
        ? doc.emoji.filter((e): e is SavedEmoji => !!e && typeof e.id === "string" && typeof e.pack === "string").slice(0, 2000)
        : [],
    };
  } catch { /* a broken value reads as empty */ }
  cache = { raw, value };
  return value;
}

function write(next: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or off */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) l(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useSaved() {
  const saved = useSyncExternalStore(subscribe, read, () => EMPTY);
  const togglePack = useCallback((name: string) => {
    const s = read();
    write({ ...s, packs: s.packs.includes(name) ? s.packs.filter((p) => p !== name) : [...s.packs, name] });
  }, []);
  const toggleEmoji = useCallback((e: SavedEmoji) => {
    const s = read();
    const has = s.emoji.some((x) => x.id === e.id);
    write({ ...s, emoji: has ? s.emoji.filter((x) => x.id !== e.id) : [...s.emoji, e] });
  }, []);
  return { saved, togglePack, toggleEmoji };
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    track("copy_snippet", { snippet: text.slice(0, 100) });
    return true;
  } catch {
    return false;
  }
}
