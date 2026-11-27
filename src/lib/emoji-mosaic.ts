// Emoji mosaic rules shared by the generator page and its tests. They mirror the telegram-bot-ui skill's
// scripts/emoji_mosaic.py and references/emoji-mosaic.md, so a ZIP made here is what `tgui.py mosaic check`
// and `publish` expect (schema tg-emoji-mosaic/v1).

export const MOSAIC_SCHEMA = "tg-emoji-mosaic/v1";
/** core.telegram.org/stickers: emoji are exactly 100x100 px. */
export const TILE = 100;
/** core.telegram.org/stickers: video emoji last at most 3 s, up to 30 FPS, at most 256 KB. */
export const MAX_SECONDS = 3;
export const MAX_FPS = 30;
export const MAX_VIDEO_BYTES = 256 * 1024;
/** appConfig message_animated_emoji_max; 100 observed, Telegram documents only the name. */
export const MAX_EMOJI = 100;
/** Bot API addStickerToSet: emoji sets hold up to 200. */
export const MAX_SET = 200;
/** Heuristic: 8 per row fits a narrow phone bubble; up to 12 fits most phones. */
export const SAFE_COLUMNS = 8;
export const WIDE_COLUMNS = 12;
export const DEFAULT_SECONDS = 2.9;
/** Heuristic: the default grid stays at or under 40 tiles; fewer, larger emoji read better in a chat. */
export const TARGET_EMOJI = 40;
export const DEFAULT_FALLBACK = "⬜";

export type ColumnFit = "safe" | "check-narrow-phone" | "likely-wraps";
export type GridOption = { cols: number; rows: number; emoji: number; crop: number; columns: ColumnFit };
export type Rect = { x: number; y: number; w: number; h: number };

export function columnFit(cols: number): ColumnFit {
  if (cols <= SAFE_COLUMNS) return "safe";
  if (cols <= WIDE_COLUMNS) return "check-narrow-phone";
  return "likely-wraps";
}

/** Grids for a width x height source, closest shape first, then more emoji. `crop` is the share a cover fit cuts. */
export function gridOptions(width: number, height: number, { maxEmoji = MAX_EMOJI, maxCols = WIDE_COLUMNS, limit = 8 } = {}): GridOption[] {
  if (!(width > 0 && height > 0)) return [];
  const want = width / height;
  const found: GridOption[] = [];
  for (let cols = 1; cols <= maxCols; cols++) {
    for (let rows = 1; rows <= Math.floor(maxEmoji / cols); rows++) {
      const ratio = cols / rows;
      const crop = 1 - Math.min(ratio, want) / Math.max(ratio, want);
      found.push({ cols, rows, emoji: cols * rows, crop, columns: columnFit(cols) });
    }
  }
  const useful = found.filter((g) => g.emoji >= 4);
  const list = useful.length ? useful : found;
  list.sort((a, b) => Math.round(a.crop * 100) - Math.round(b.crop * 100) || b.emoji - a.emoji);
  return list.slice(0, limit);
}

/** The default grid: at most 8 columns, the shape within 5% when possible, then the most emoji up to TARGET_EMOJI. */
export function autoGrid(width: number, height: number, maxEmoji = MAX_EMOJI): { cols: number; rows: number } {
  const options = gridOptions(width, height, { maxEmoji, maxCols: SAFE_COLUMNS, limit: 10_000 });
  if (!options.length) return { cols: 8, rows: 4 };
  const close = options.filter((g) => g.crop <= 0.05);
  const shaped = close.length ? close : options;
  const modest = shaped.filter((g) => g.emoji <= TARGET_EMOJI);
  const pool = modest.length ? modest : shaped;
  const best = pool.reduce((a, b) => (b.emoji > a.emoji || (b.emoji === a.emoji && b.crop < a.crop) ? b : a));
  return { cols: best.cols, rows: best.rows };
}

export function gridProblem(cols: number, rows: number, maxEmoji = MAX_EMOJI): string | null {
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) return "A grid needs at least one column and one row.";
  if (cols * rows > maxEmoji) return `${cols}×${rows} is ${cols * rows} emoji; one message holds at most ${maxEmoji}.`;
  if (cols * rows > MAX_SET) return `An emoji set holds at most ${MAX_SET} emoji.`;
  return null;
}

/** The largest box of the grid's shape centred in the frame: the automatic crop. */
export function centeredCrop(width: number, height: number, aspect: number): Rect {
  if (width / height > aspect) {
    const w = Math.round(height * aspect);
    return { x: Math.round((width - w) / 2), y: 0, w, h: height };
  }
  const h = Math.round(width / aspect);
  return { x: 0, y: Math.round((height - h) / 2), w: width, h };
}

/** Keep a crop inside the frame, at least `min` px, optionally at a fixed aspect (anchored at its centre). */
export function clampCrop(rect: Rect, width: number, height: number, aspect: number | null, min = 16): Rect {
  let { x, y, w, h } = rect;
  w = Math.max(min, Math.min(w, width));
  h = Math.max(min, Math.min(h, height));
  if (aspect) {
    const cx = x + rect.w / 2;
    const cy = y + rect.h / 2;
    if (w / h > aspect) w = h * aspect;
    else h = w / aspect;
    if (w > width) { w = width; h = w / aspect; }
    if (h > height) { h = height; w = h * aspect; }
    x = cx - w / 2;
    y = cy - h / 2;
  }
  x = Math.min(Math.max(0, x), width - w);
  y = Math.min(Math.max(0, y), height - h);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/** Where the cropped source lands on the cols*100 x rows*100 canvas. Cover fills it; contain pads it. */
export function placement(crop: Rect, cols: number, rows: number, fit: "cover" | "contain"): Rect {
  const cw = cols * TILE;
  const ch = rows * TILE;
  const scale = fit === "cover" ? Math.max(cw / crop.w, ch / crop.h) : Math.min(cw / crop.w, ch / crop.h);
  const w = crop.w * scale;
  const h = crop.h * scale;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

export function maxRadius(cols: number, rows: number): number {
  return (Math.min(cols, rows) * TILE) / 2;
}

/** Tile files row by row, left to right: tiles/r01c01.webm, tiles/r01c02.webm, ... */
/** A line drawn along the mosaic's outer edge, inside it, following the rounded corners. Width in mosaic pixels. */
export type Outline = { color: string; width: number };

/** Thickness presets in mosaic pixels. A chat shows a tile at about 22 px, so 4 is about one screen pixel. */
export const OUTLINE_WIDTHS = [["none", "None", 0], ["thin", "Thin", 4], ["medium", "Medium", 8], ["bold", "Bold", 12], ["heavy", "Heavy", 18]] as const;
export type OutlineWidth = (typeof OUTLINE_WIDTHS)[number][0];

/** Telegram's own accent colours (its themes' palette), plus white for dark chats and black for light ones. */
export const OUTLINE_COLORS = [
  ["#FFFFFF", "White"], ["#000000", "Black"], ["#3390EC", "Blue"], ["#8774E1", "Violet"], ["#00C2ED", "Cyan"],
  ["#29B327", "Green"], ["#F08200", "Orange"], ["#EB6CA4", "Pink"], ["#E53935", "Red"],
] as const;

export function strokeOutline(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, radius: number, outline?: Outline) {
  if (!outline || outline.width <= 0) return;
  const w = outline.width;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = outline.color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.roundRect(w / 2, w / 2, width - w, height - w, Math.max(0, radius - w / 2));
  ctx.stroke();
  ctx.restore();
}

export function tileNames(cols: number, rows: number, ext: "webm" | "png"): string[] {
  const names: string[] = [];
  for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) names.push(`tiles/r${String(r).padStart(2, "0")}c${String(c).padStart(2, "0")}.${ext}`);
  return names;
}

export function utf16Length(text: string): number {
  return text.length; // JavaScript strings are UTF-16 already
}

/** sendMessage text and entities for a set's ids: one fallback emoji per tile, a line break per row. */
export function mosaicMessage(ids: string[], cols: number, fallback: string | string[] = DEFAULT_FALLBACK) {
  let text = "";
  const entities: { type: "custom_emoji"; offset: number; length: number; custom_emoji_id: string }[] = [];
  ids.forEach((id, i) => {
    const alt = (Array.isArray(fallback) ? fallback[i] : fallback) || DEFAULT_FALLBACK;
    if (i && i % cols === 0) text += "\n";
    entities.push({ type: "custom_emoji", offset: utf16Length(text), length: utf16Length(alt), custom_emoji_id: id });
    text += alt;
  });
  return { text, entities };
}

/** Emoji a visitor can put behind the tiles: one per tile, shown wherever the custom emoji can't be. */
export const FALLBACK_CHOICES = ["⬜", "🟦", "🖼️", "🎬", "✨", "⭐", "🔥", "💙", "🌅", "🌿", "🎉", "😊"];

export function isSingleEmoji(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 16) return false;
  const parts = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value)];
  return parts.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(value);
}

export type MosaicManifest = {
  schema: typeof MOSAIC_SCHEMA;
  format: "video" | "static";
  grid: { cols: number; rows: number };
  tile: number;
  fallback: string;
  /** The emoji behind each tile, in tile order; `fallback` where absent. */
  emoji?: string[];
  tiles: string[];
  source: { name: string; width: number; height: number; box: Rect; fit: "cover" | "contain"; background: "transparent"; start: number; duration: number; fps: number; pingpong: false };
  round: number;
  alpha: boolean;
  made_by: string;
};
