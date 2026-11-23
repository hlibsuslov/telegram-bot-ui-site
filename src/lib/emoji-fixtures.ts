// Local stand-in packs for developing the emoji library without a resolver bot token.
// On only when EMOJI_RESOLVER_FIXTURES=1 and never in production builds. Pictures are SVG drawn
// here; animated emoji are real TGS files (gzip Lottie) built in code, so the player is exercised.
import "server-only";
import { gzipSync } from "node:zlib";
import type { FileBody, Pack, PackEmoji } from "./emoji-pack";

export function fixturesOn(): boolean {
  return process.env.EMOJI_RESOLVER_FIXTURES === "1" && process.env.NODE_ENV !== "production";
}

const COLORS = ["#2481cc", "#e0a100", "#2e8b3e", "#e53935", "#7e57c2", "#f4511e", "#00897b", "#5c6bc0"];
const GLYPHS = ["🏠", "🛒", "✅", "⬅️", "🔔", "📦", "⏳", "⭐", "🎁", "❤️", "☕", "✨", "🔍", "⚙️", "💬", "📅", "💳", "🔒", "📈", "🚚", "🔥", "👍", "❌", "➕"];

type Spec = { title: string; format: PackEmoji["format"]; count: number; shape: "rect" | "circle" };
const PACKS: Record<string, Spec> = {
  bot_ui_demo_icons: { title: "Demo interface icons", format: "static", count: 24, shape: "rect" },
  bot_ui_demo_motion: { title: "Demo animated marks", format: "animated", count: 12, shape: "circle" },
  bot_ui_demo_status: { title: "Demo status marks", format: "static", count: 8, shape: "circle" },
};

function id(pack: string, i: number): string {
  const n = Object.keys(PACKS).indexOf(pack) + 1;
  return `9${String(n).padStart(2, "0")}00000000000${String(i).padStart(4, "0")}`;
}

export function fixturePack(name: string): Pack | null {
  const spec = PACKS[name];
  if (!spec) return null;
  const emoji = Array.from({ length: spec.count }, (_, i): PackEmoji => ({
    id: id(name, i), fallback: GLYPHS[i % GLYPHS.length], format: spec.format, adaptive: false,
    preview: `/api/emoji-pack/${name}/${id(name, i)}`,
    animation: spec.format === "animated" ? `/api/emoji-pack/${name}/${id(name, i)}/anim` : null,
  }));
  return { name, title: spec.title, emoji };
}

function index(name: string, emojiId: string): number {
  const spec = PACKS[name];
  return spec ? Array.from({ length: spec.count }, (_, k) => id(name, k)).indexOf(emojiId) : -1;
}

const body = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export function fixturePreview(name: string, emojiId: string): FileBody | null {
  const i = index(name, emojiId);
  if (i < 0) return null;
  const c = COLORS[i % COLORS.length];
  const shape = PACKS[name].shape === "rect"
    ? `<rect x="40" y="40" width="432" height="432" rx="110" fill="${c}"/>`
    : `<circle cx="256" cy="256" r="216" fill="${c}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${shape}` +
    `<text x="256" y="300" font-size="150" text-anchor="middle" font-family="sans-serif" fill="#fff">${i + 1}</text></svg>`;
  return { body: body(Buffer.from(svg)), type: "image/svg+xml" };
}

/** A 1.5 s looping Lottie: the shape rotates, pulses or bounces (by index), like a real TGS emoji. */
export function fixtureAnimation(name: string, emojiId: string): FileBody | null {
  const i = index(name, emojiId);
  if (i < 0 || PACKS[name].format !== "animated") return null;
  const hex = COLORS[i % COLORS.length];
  const rgb = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  const ease = { i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } };
  const ease3 = { i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.6, 0.6, 0.6], y: [0, 0, 0] } };
  const mode = i % 3;
  const ks = {
    o: { a: 0, k: 100 },
    r: mode === 0 ? { a: 1, k: [{ t: 0, s: [0], ...ease }, { t: 90, s: [360] }] } : { a: 0, k: 0 },
    p: mode === 2
      ? { a: 1, k: [{ t: 0, s: [256, 290, 0], ...ease3 }, { t: 45, s: [256, 200, 0], ...ease3 }, { t: 90, s: [256, 290, 0] }] }
      : { a: 0, k: [256, 256, 0] },
    a: { a: 0, k: [0, 0, 0] },
    s: mode === 1
      ? { a: 1, k: [{ t: 0, s: [100, 100, 100], ...ease3 }, { t: 45, s: [72, 72, 100], ...ease3 }, { t: 90, s: [100, 100, 100] }] }
      : { a: 0, k: [100, 100, 100] },
  };
  const shape = mode === 0
    ? { ty: "rc", d: 1, s: { a: 0, k: [300, 300] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 70 } }
    : { ty: "el", d: 1, s: { a: 0, k: [340, 340] }, p: { a: 0, k: [0, 0] } };
  const lottie = {
    tgs: 1, v: "5.5.2", fr: 60, ip: 0, op: 90, w: 512, h: 512, nm: `${name}-${i}`, ddd: 0, assets: [],
    layers: [{
      ddd: 0, ind: 1, ty: 4, nm: "mark", sr: 1, ks, ao: 0, ip: 0, op: 90, st: 0, bm: 0,
      shapes: [{ ty: "gr", nm: "g", it: [
        shape,
        { ty: "fl", c: { a: 0, k: [...rgb, 1] }, o: { a: 0, k: 100 }, r: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ] }],
    }],
  };
  return { body: body(gzipSync(JSON.stringify(lottie))), type: "application/x-tgsticker" };
}
