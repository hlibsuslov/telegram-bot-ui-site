"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { BellRing, ChevronDown, CircleAlert, Clock, Coffee, Copy, ExternalLink, Hourglass, LoaderCircle, PackageCheck, RotateCcw, ShoppingBasket, Star, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import demo from "@/content/demo-widgets.json";
import { subscribe } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { WIDGET_BOTS, type BotReply, type Doc, type Lang, type WidgetId } from "./widget-bots";

// A built widget of the demo bot inside a chat bubble, run by the skill's mock of the widget
// runtime (the same document the Studio preview composes: default CSS, window.__cfg, the mock,
// the widget). The frame response sandboxes the widget in an opaque origin.

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
type PreviewPhase = "loading" | "ready" | "unavailable";
type Reply = { text: string; error?: boolean };
type Note = { kind: "copy" | "link" | "push" | "limit"; text: string };

const DATA = demo as unknown as DemoWidgets;
const LIMIT = 4096;
const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "ru", label: "RU" },
  { id: "uk", label: "UK" },
];
const WIDGET_ICONS = {
  "order-status": PackageCheck,
  cart: ShoppingBasket,
  "pickup-time": Clock,
  "rate-drink": Star,
  "happy-hour": TicketPercent,
  "drink-match": Coffee,
} satisfies Record<WidgetId, unknown>;
const NOTE_ICONS = { copy: Copy, link: ExternalLink, push: BellRing, limit: Hourglass };
/** How long the demo bot takes to answer a tap, in ms: long enough to see the busy state. */
const replyDelay = () => 550 + Math.round(Math.random() * 350);

const ORDER_STATUS: Record<string, Record<Lang, string>> = {
  default: { en: "brewing", ru: "готовим", uk: "готуємо" },
  late: { en: "running late", ru: "задерживается", uk: "затримується" },
  ready: { en: "ready", ru: "готов", uk: "готове" },
  picked: { en: "picked up", ru: "выдан", uk: "видано" },
};

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

function frameDoc(w: WidgetData, o: { id: string; lang: Lang; chatData?: Doc; publicData?: Doc; dark: boolean }) {
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
  const json = (v: unknown) => (v == null ? null : JSON.stringify(v));
  const cfg = {
    f: o.id, scheme: th._scheme, theme, lang: o.lang, dir: "ltr", place: "private", shared: false, bot: "answer", band: 0, corner: 0,
    chatData: json(o.chatData), publicData: json(o.publicData),
  };
  const cfgJson = JSON.stringify(cfg).replace(/</g, "\\u003c");
  const mock = DATA.mock.replace(/<\/script/gi, "<\\/script");
  // The script can finish before the sandboxed iframe has a painted, clickable surface.
  // The mock reports the document height, which never drops below the frame's own height. Report
  // the content height too, so the bubble shrinks when a widget gets shorter.
  const notifyAfterPaint = `(() => {
    const notify = window.TelegramWidget.ready;
    window.TelegramWidget.ready = () => requestAnimationFrame(() => requestAnimationFrame(notify));
    setInterval(() => parent.postMessage({ k: "fit", f: ${JSON.stringify(o.id)}, h: Math.ceil(document.body.getBoundingClientRect().height) }, "*"), 300);
  })();`;
  return (
    `<!doctype html><html lang="${o.lang}" dir="ltr" style="${vars.replace(/"/g, "&quot;")}"><head><meta charset="utf-8">` +
    `<meta name="color-scheme" content="${th._scheme}"><style>${DATA.css}</style>` +
    `<style>:root{color-scheme:${th._scheme} !important}html,body{background:transparent !important}</style>` +
    `<script>window.__cfg=${cfgJson};${mock}${notifyAfterPaint}</script></head><body>${w.html[o.lang]}</body></html>`
  );
}

function caption(w: WidgetData, lang: Lang, state: string) {
  const data = w.states[state]?.chatData;
  return w.caption[lang].replace(/\{([a-z0-9_.]+)\}/g, (placeholder, key: string) => {
    if (key === "order.no" && typeof data?.no === "string") return data.no.replace(/^#/, "");
    if (key === "order.status_text") return (ORDER_STATUS[state] ?? ORDER_STATUS.default)[lang];
    return placeholder;
  });
}

function WidgetPreview({ widget, lang, state, dark, onReload }: {
  widget: WidgetId;
  lang: Lang;
  state: string;
  dark: boolean;
  onReload: () => void;
}) {
  const frameId = useId();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const [phase, setPhase] = useState<PreviewPhase>("loading");
  const [reply, setReply] = useState<Reply | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const w = DATA.widgets[widget];
  const th = DATA.themes[dark ? "dark" : "light"];

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;

    let ready = false;
    let loading: number | undefined;
    const timers: number[] = [];
    const st = w.states[state] ?? {};
    // The bot's copy of chat_data: every answer and push moves it on, as the server's would.
    let chatData = freshen(st.chatData, w.fresh, w.now);
    const publicData = freshen(st.publicData, w.fresh, w.now);
    const bot = WIDGET_BOTS[widget];
    const stopLoadingTimer = () => {
      window.clearTimeout(loading);
      loading = undefined;
    };
    const visibility = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stopLoadingTimer();
      else if (!ready && loading === undefined) {
        loading = window.setTimeout(() => setPhase("unavailable"), 8000);
      }
    });
    const onMessage = (event: MessageEvent) => {
      const win = iframe.contentWindow;
      const m = event.data as { k?: string; f?: string; h?: number; id?: string; data?: string; t?: string; m?: string; tap?: boolean };
      if (!win || event.source !== win || event.origin !== "null") return;
      if (m?.k === "frame-ready") {
        win.postMessage({ k: "load", doc: frameDoc(w, { id: frameId, lang, chatData, publicData, dark }) }, "*");
        return;
      }
      if (m?.f !== frameId) return;

      if (m.k === "ready") {
        ready = true;
        stopLoadingTimer();
        visibility.disconnect();
        setPhase("ready");
      }
      if ((m.k === "ready" || m.k === "fit") && typeof m.h === "number" && Number.isFinite(m.h)) {
        setHeight(Math.max(60, Math.min(600, m.h)));
      }
      if (m.k === "log" && m.t === "error") {
        if (ready) setReply({ text: "The widget hit an error. Reload the preview to try again.", error: true });
        else {
          stopLoadingTimer();
          visibility.disconnect();
          setPhase("unavailable");
        }
      }
      if (m.k === "log" && m.t === "reject") {
        // Telegram's own limits: the widget shows them in its status line, so this only explains.
        if (m.m?.endsWith("RATE_LIMITED")) setNote({ kind: "limit", text: "Telegram allows five widget requests in five seconds. Wait a moment, then tap again." });
        else if (!m.m?.endsWith("BUSY")) setReply({ text: "The demo could not complete that action. Try again in a moment.", error: true });
      }
      if (m.k === "log" && m.t === "copy" && typeof m.m === "string") {
        const text = m.m.replace(/^copyText /, "");
        // The tap in the frame also activates this page, so the code really lands on the clipboard.
        const copied = navigator.clipboard?.writeText(text) ?? Promise.reject(new Error("no clipboard"));
        copied.then(
          () => setNote({ kind: "copy", text: `Copied ${text} to your clipboard.` }),
          () => setNote({ kind: "copy", text: `In Telegram, this copies ${text}.` }),
        );
      }
      if (m.k === "log" && m.t === "link") {
        setNote({ kind: "link", text: "In Telegram, this opens the chat with the bot." });
      }
      if (m.k === "req" && typeof m.id === "string" && typeof m.data === "string") {
        const id = m.id;
        const answer: BotReply | undefined = bot(chatData, m.data, lang);
        const send = () => {
          if (answer?.s) chatData = answer.s;
          const result = answer ? { ok: !answer.err, msg: answer.msg, err: answer.err, s: answer.s } : { ok: false, err: "bad_request" };
          win.postMessage({ k: "ans", id, result: JSON.stringify(result) }, "*");
        };
        // The tracker refreshes on startup. Answer that immediately and show feedback for taps only.
        if (!m.tap) {
          send();
          return;
        }
        setReply({ text: "Waiting for the demo reply…" });
        timers.push(window.setTimeout(() => {
          send();
          setReply(answer ? { text: answer.msg ?? "Done." } : { text: "This action is unavailable in the demo.", error: true });
          const push = answer?.push;
          if (!push) return;
          timers.push(window.setTimeout(() => {
            chatData = push.s;
            win.postMessage({ k: "push", field: "chatData", text: JSON.stringify(push.s) }, "*");
            setNote({ kind: "push", text: push.note });
          }, push.after));
        }, replyDelay()));
      }
    };

    window.addEventListener("message", onMessage);
    visibility.observe(iframe);
    iframe.src = "/studio/widget-frame";
    return () => {
      window.removeEventListener("message", onMessage);
      visibility.disconnect();
      stopLoadingTimer();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dark, frameId, lang, state, w, widget]);

  return (
    <>
      <div
        className="grid min-h-[320px] items-center justify-items-center rounded-xl p-2.5 sm:p-5"
        style={{ background: "linear-gradient(160deg, var(--chat-wall), var(--chat-wall-2))" }}
      >
        <div
          className="relative w-full max-w-[330px] min-w-0 overflow-hidden rounded-2xl rounded-bl-md shadow-sm"
          style={{ background: th.bg_color, color: th.text_color, colorScheme: th._scheme }}
        >
          <iframe
            ref={frame}
            title={`${w.title}, live widget preview`}
            loading="lazy"
            scrolling="no"
            aria-hidden={phase !== "ready"}
            tabIndex={phase !== "ready" ? -1 : undefined}
            className="block w-full border-0"
            style={{ height, colorScheme: th._scheme }}
          />
          {phase === "unavailable" && (
            <div className="absolute inset-x-0 top-0" style={{ height, background: th.bg_color }} aria-hidden="true" />
          )}
          <div className="flex items-end justify-between gap-3 px-3 pt-1 pb-2 text-sm leading-snug">
            <span>{caption(w, lang, state)}</span>
            <time className="shrink-0 text-xs opacity-60">8:41</time>
          </div>
        </div>
      </div>
      {phase === "loading" && (
        <p role="status" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" /> Loading widget…
        </p>
      )}
      {(phase === "unavailable" || reply?.error) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CircleAlert aria-hidden="true" className="size-4" />
            {phase === "unavailable" ? "Widget preview unavailable." : reply?.text}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onReload}>
            <RotateCcw aria-hidden="true" data-icon="inline-start" /> Reload preview
          </Button>
        </div>
      )}
      {note && phase === "ready" && <NoteLine note={note} />}
      {phase === "ready" && widget === "order-status" && state === "picked" && (
        <p className="text-sm leading-6 text-muted-foreground">
          This order is complete. Choose Ready in the preview options to try an action.
        </p>
      )}
      <p role="status" className="sr-only">{reply?.error ? null : reply?.text}</p>
    </>
  );
}

function NoteLine({ note }: { note: Note }) {
  const Icon = NOTE_ICONS[note.kind];
  return (
    <p role="status" className="flex items-start gap-1.5 text-sm leading-6 text-muted-foreground">
      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand" />
      {note.text}
    </p>
  );
}

export function LiveWidget({
  widget,
  states,
  hint,
  initialState = "default",
  className,
  showOptions = true,
}: {
  widget: WidgetId;
  /** State keys from widget.json with labels for people. */
  states: readonly { id: string; label: string }[];
  /** One line on what to tap. */
  hint?: string;
  initialState?: string;
  className?: string;
  showOptions?: boolean;
}) {
  const w = DATA.widgets[widget];
  const Icon = WIDGET_ICONS[widget];
  const dark = useSiteDark();
  const [lang, setLang] = useState<Lang>("en");
  const [state, setState] = useState(initialState);
  const [revision, setRevision] = useState(0);
  const bytes = w.compressedBytes[lang];
  const reload = () => setRevision((current) => current + 1);

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5", className)}>
      <figcaption>
        <span className="inline-flex items-center gap-2 font-semibold">
          <Icon aria-hidden="true" className="size-5 text-brand" />
          {w.title}
        </span>
        {hint && <span className="mt-1 block text-sm leading-6 text-muted-foreground">{hint}</span>}
      </figcaption>
      <WidgetPreview
        key={`${state}:${lang}:${dark}:${revision}`}
        widget={widget}
        lang={lang}
        state={state}
        dark={dark}
        onReload={reload}
      />
      {showOptions && (
        <details className="group mt-auto border-t border-border pt-2">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            Preview options
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div role="group" aria-label={`${w.title}: state`} className="flex flex-wrap gap-1">
              {states.map((s) => (
                <Button key={s.id} type="button" size="sm" variant={state === s.id ? "secondary" : "outline"} aria-pressed={state === s.id} onClick={() => setState(s.id)}>
                  {s.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div role="group" aria-label={`${w.title}: language`} className="flex rounded-full bg-muted p-0.5">
                {LANGS.map((l) => (
                  <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => setLang(l.id)}
                    className="min-h-7 rounded-full px-2 font-mono text-xs text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm">
                    {l.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {(bytes / 1024).toFixed(1)} / {LIMIT / 1024} KB compressed
              </span>
            </div>
          </div>
        </details>
      )}
    </figure>
  );
}
