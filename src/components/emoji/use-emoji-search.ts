"use client";

// Asks /api/emoji-search as the visitor types: debounced, the previous request cancelled, answers
// remembered for the session; the last answer stays on screen while the next one loads.
import { useEffect, useState } from "react";
import type { SearchResult } from "@/lib/emoji-search";

const memo = new Map<string, SearchResult>();

export function useEmojiSearch(query: string, pack?: string): { data: SearchResult | null; loading: boolean; failed: boolean } {
  const q = query.trim();
  const key = `${pack ?? ""}\n${q}`;
  const [state, setState] = useState<{ key: string; data: SearchResult | null; failed: boolean }>({ key: "", data: null, failed: false });

  useEffect(() => {
    if (!q || memo.has(key)) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const url = `/api/emoji-search?q=${encodeURIComponent(q)}${pack ? `&pack=${encodeURIComponent(pack)}` : ""}`;
      fetch(url, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: SearchResult) => {
          if (memo.size > 200) memo.clear();
          memo.set(key, data);
          setState({ key, data, failed: false });
        })
        .catch((err: unknown) => {
          if ((err as Error).name !== "AbortError") setState((s) => ({ key, data: s.data, failed: true }));
        });
    }, 180);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [key, q, pack]);

  if (!q) return { data: null, loading: false, failed: false };
  const hit = memo.get(key);
  if (hit) return { data: hit, loading: false, failed: false };
  return { data: state.data, loading: state.key !== key, failed: state.key === key && state.failed };
}
