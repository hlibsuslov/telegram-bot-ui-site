"use client";

import { useState, type FormEvent } from "react";
import type { PackEmoji } from "@/lib/emoji-pack";
import { emojiPackPath } from "@/lib/emoji-links";
import { messageEmojiHtml } from "@/lib/emoji-snippets";
import { CopyRow } from "./copy-row";

type Owner = { set: string; telegramUrl: string };
type Result = { title: string; url: string; emoji: PackEmoji | undefined };
type LookupState =
  | { kind: "idle" | "loading" }
  | { kind: "error"; message: string }
  | { kind: "result"; result: Result };

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.status === 429 ? "Too many lookups. Try again in a minute." : "The lookup is unavailable. Try again shortly.");
  }
  return response.json() as Promise<T>;
}

export function IdLookup() {
  const [state, setState] = useState<LookupState>({ kind: "idle" });
  const loading = state.kind === "loading";

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = String(new FormData(event.currentTarget).get("id") ?? "").trim();
    if (!/^\d{1,20}$/.test(id)) {
      setState({ kind: "error", message: "Enter a custom emoji ID of 1 to 20 digits." });
      return;
    }

    setState({ kind: "loading" });
    try {
      const { emoji: owners } = await readJson<{ emoji: Owner[] }>(`/api/emoji-pack/by-id?ids=${encodeURIComponent(id)}`);
      const owner = owners[0];
      if (!owner) {
        setState({ kind: "error", message: "Telegram returned no pack for this ID." });
        return;
      }

      const pack = await readJson<{ name: string; title: string; pageUrl: string | null; emoji: PackEmoji[] }>(`/api/emoji-pack/${encodeURIComponent(owner.set)}`);
      const emoji = pack.emoji.find((item) => item.id === id);
      const url = pack.pageUrl ? emojiPackPath(pack.name, emoji?.id) : owner.telegramUrl;
      setState({ kind: "result", result: { title: pack.title, url, emoji } });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "The lookup is unavailable. Try again shortly." });
    }
  }

  return (
    <form onSubmit={lookup} className="mt-3 space-y-3">
      <label className="block">
        <span className="mb-1 block font-medium">Custom emoji ID</span>
        <input name="id" required inputMode="numeric" autoComplete="off" disabled={loading}
          className="tg-field h-10 w-full max-w-sm rounded-xl px-3 font-mono" />
      </label>
      <button type="submit" disabled={loading} className="tg-button rounded-xl px-4 py-2 font-medium disabled:opacity-70">Find pack</button>
      <p role="status" className="tg-hint">
        {state.kind === "loading" ? "Looking up the ID…" : state.kind === "error" ? state.message : state.kind === "result" ? "Pack found." : ""}
      </p>
      {state.kind === "result" && (
        <div className="max-w-xl space-y-2">
          <p>Source pack <a href={state.result.url}>{state.result.title}</a></p>
          {state.result.emoji?.fallback ? (
            <CopyRow label="Telegram message HTML" value={messageEmojiHtml(state.result.emoji.id, state.result.emoji.fallback)} />
          ) : <p className="tg-hint">No fallback emoji was available for this ID.</p>}
        </div>
      )}
    </form>
  );
}
