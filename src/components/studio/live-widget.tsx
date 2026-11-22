"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import demo from "@/content/demo-widgets.json";
import { subscribe } from "@/lib/theme";
import { cn } from "@/lib/utils";

// A built widget of the demo bot inside a chat bubble, run by the skill's mock of the widget
// runtime (the same document the Studio preview composes: default CSS, window.__cfg, the mock,
// the widget). The frame is sandboxed without same-origin, so it talks only through postMessage.

type Lang = "en" | "ru" | "uk";
type Doc = Record<string, unknown>;
type WidgetData = {
  title: string;
  caption: Record<Lang, string>;
  now: number;
  fresh?: string[];
  states: Record<string, { chatData?: Doc; publicData?: Doc }>;
  html: Record<Lang, string>;
  compressedBytes: Record<Lang, number>;
};
type DemoWidgets = { mock: string; css: string; themes: Record<string, Record<string, string>>; widgets: Record<string, WidgetData> };

const DATA = demo as unknown as DemoWidgets;
const LIMIT = 4096;
const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "ru", label: "RU" },
  { id: "uk", label: "UK" },
];

/** What the demo bot answers to each widget request (the real bot would answer from its server). */
const ANSWERS: Record<string, Record<string, Record<Lang, string> | null>> = {
  "order-status": {
    sync: null,
    warm: { en: "We'll keep it warm for 10 minutes", ru: "Сохраним тёплым 10 минут", uk: "Збережемо теплим 10 хвилин" },
    help: { en: "A barista will answer in this chat", ru: "Бариста ответит в этом чате", uk: "Бариста відповість у цьому чаті" },
  },
  "loyalty-card": {
    code: { en: "Code 4821: show it at the counter", ru: "Код 4821: покажите на стойке", uk: "Код 4821: покажіть на стійці" },
  },
};

/** Example values for the caption placeholders, as the bot would fill them. */
const CAPTION_VALUES: Record<string, Record<Lang, string>> = {
  "order.no": { en: "218", ru: "218", uk: "218" },
  "order.status_text": { en: "brewing", ru: "готовим", uk: "готуємо" },
};

const noop = () => () => {};
const isDark = () => document.documentElement.classList.contains("dark");

function useSiteDark() {
  return useSyncExternalStore(subscribe, isDark, () => false);
}

/** Moves the demo's "fresh" timestamps so they read relative to now, as the Studio preview does. */
function freshen(state: Doc | undefined, keys: string[] | undefined, base: number): Doc | undefined {
  if (!state) return state;
  const s: Doc = structuredClone(state);
  const now = Math.floor(Date.now() / 1000);
  for (const k of keys ?? []) if (typeof s[k] === "number") s[k] = now - (base - (s[k] as number));
  return s;
}

function frameDoc(w: WidgetData, o: { id: string; lang: Lang; state: string; dark: boolean }) {
  const th = DATA.themes[o.dark ? "dark" : "light"];
  let vars =
    `--tg-color-scheme:${th._scheme};--tg-text-font-size:15px;--tg-text-line-height:1.35;--tg-text-padding:8px 12px;` +
    `--tg-button-bg:${th.button_color};--tg-button-text:${th.button_text_color};--tg-button-radius:8px;--tg-button-font:500 15px system-ui;` +
    "--tg-button-padding:8px 12px;--tg-button-height:36px;--tg-button-pressed-opacity:.7;--tg-button-disabled-opacity:.5;";
  const theme: Record<string, string> = {};
  for (const [k, v] of Object.entries(th)) {
    if (k.startsWith("_")) continue;
    theme[k] = v;
    vars += `--tg-theme-${k.replace(/_/g, "-")}:${v};`;
  }
  vars +=
    "--tg-content-safe-area-inset-bottom:0px;--tg-content-safe-area-inset-top:0px;--tg-content-safe-area-inset-left:0px;" +
    "--tg-content-safe-area-inset-right:0px;--tg-content-safe-area-corner-right:0px;--tg-content-safe-area-corner-left:0px;";
  const st = w.states[o.state] ?? {};
  const json = (v: unknown) => (v == null ? null : JSON.stringify(v));
  const cfg = {
    f: o.id, scheme: th._scheme, theme, lang: o.lang, dir: "ltr", place: "private", shared: false, bot: "answer", band: 0, corner: 0,
    chatData: json(freshen(st.chatData, w.fresh, w.now)), publicData: json(freshen(st.publicData, w.fresh, w.now)),
  };
  const cfgJson = JSON.stringify(cfg).replace(/</g, "\\u003c");
  const mock = DATA.mock.replace(/<\/script/gi, "<\\/script");
  return (
    `<!doctype html><html dir="ltr" style="${vars.replace(/"/g, "&quot;")}"><head><meta charset="utf-8">` +
    `<meta name="color-scheme" content="${th._scheme}"><style>${DATA.css}</style>` +
    `<style>:root{color-scheme:${th._scheme} !important}html,body{background:transparent !important}</style>` +
    `<script>window.__cfg=${cfgJson};${mock}</script></head><body>${w.html[o.lang]}</body></html>`
  );
}

function caption(w: WidgetData, lang: Lang, state: Doc | undefined) {
  return w.caption[lang].replace(/\{([a-z0-9_.]+)\}/g, (_, key: string) =>
    key === "loyalty.stamps" ? String((state?.n as number | undefined) ?? 0) : (CAPTION_VALUES[key]?.[lang] ?? key),
  );
}

export function LiveWidget({
  widget,
  states,
  className,
}: {
  widget: string;
  /** State keys from widget.json with labels for people. */
  states: { id: string; label: string }[];
  className?: string;
}) {
  const w = DATA.widgets[widget];
  const frameId = useId().replace(/[^a-z0-9]/gi, "");
  const dark = useSiteDark();
  const [lang, setLang] = useState<Lang>("en");
  const [state, setState] = useState(states[0]?.id ?? "default");
  const [height, setHeight] = useState(180);
  const frame = useRef<HTMLIFrameElement>(null);
  // Built on the client only: the timestamps depend on the visitor's clock.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const doc = useMemo(() => (mounted ? frameDoc(w, { id: frameId, lang, state, dark }) : null), [mounted, w, frameId, lang, state, dark]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const win = frame.current?.contentWindow;
      const m = e.data as { k?: string; f?: string; h?: number; id?: string; data?: string };
      if (!win || e.source !== win || m?.f !== frameId) return;
      if ((m.k === "ready" || m.k === "size") && typeof m.h === "number") setHeight(Math.max(60, Math.min(600, m.h)));
      if (m.k === "req") {
        const known = ANSWERS[widget] ?? {};
        const msg = m.data && m.data in known ? known[m.data] : undefined;
        const result = msg === undefined ? { ok: false, err: "bad_request" } : msg ? { ok: true, msg: msg[lang] } : { ok: true };
        window.setTimeout(() => win.postMessage({ k: "ans", id: m.id, result: JSON.stringify(result) }, "*"), 450);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameId, widget, lang]);

  const th = DATA.themes[dark ? "dark" : "light"];
  const bytes = w.compressedBytes[lang];
  const cap = useMemo(() => caption(w, lang, w.states[state]?.chatData), [w, lang, state]);

  return (
    <figure className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label={`${w.title}: state`} className="flex flex-wrap gap-1">
          {states.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={state === s.id}
              onClick={() => setState(s.id)}
              className="h-7 rounded-full border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-checked:border-foreground/20 aria-checked:bg-card aria-checked:font-medium aria-checked:text-foreground aria-checked:shadow-sm"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={`${w.title}: language`} className="flex rounded-full bg-muted p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={lang === l.id}
              onClick={() => setLang(l.id)}
              className="h-6 rounded-full px-2 font-mono text-[11px] text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-sm"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex min-h-[300px] items-end justify-start rounded-2xl p-4 sm:p-5"
        style={{ background: "linear-gradient(160deg, var(--chat-wall), var(--chat-wall-2))" }}
      >
        <div
          className="w-full max-w-[330px] overflow-hidden rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgb(0_0_0/0.18)]"
          style={{ background: th.bg_color, color: th.text_color }}
        >
          {doc ? (
            <iframe
              ref={frame}
              title={`${w.title}, live widget preview`}
              srcDoc={doc}
              sandbox="allow-scripts"
              scrolling="no"
              className="block w-full border-0"
              style={{ height, colorScheme: dark ? "dark" : "light" }}
            />
          ) : (
            <div style={{ height }} aria-hidden="true" />
          )}
          <div className="flex items-end justify-between gap-3 px-3 pt-1 pb-2 text-[15px] leading-snug">
            <span>{cap}</span>
            <time className="shrink-0 text-xs opacity-60">8:41</time>
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{w.title}</span> · tap its buttons, the demo bot answers
        </span>
        <span className="tabular-nums">
          {(bytes / 1024).toFixed(1)} KB of {LIMIT / 1024} KB compressed
        </span>
      </figcaption>
    </figure>
  );
}
