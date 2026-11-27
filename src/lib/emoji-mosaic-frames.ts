// Rebuilds frames of a mosaic from its tiles, server side, for the authoritative content check: the tiles are read
// back from Telegram (what the set really holds), stacked into the grid with ffmpeg and sampled as JPEG frames.
import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { request } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { type BotCall, MosaicError } from "./emoji-mosaic-server";

const TILE = 100;
const FRAMES = 6;
const WIDTH = 768;
const DOWNLOADS = 8;
const FILE_MAX = 300 * 1024;

function download(token: string, path: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const req = request({ host: "api.telegram.org", path: `/file/bot${token}/${path}`, method: "GET", timeout: 20_000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new MosaicError(502, "TELEGRAM", "couldn't read a tile back from Telegram"));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        size += c.length;
        if (size > FILE_MAX) req.destroy(new Error("too large"));
        else chunks.push(c);
      });
      res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", () => reject(new MosaicError(504, "TELEGRAM_UNREACHABLE", "couldn't read a tile back from Telegram")));
    req.end();
  });
}

/** The bytes of each sticker, in set order, as Telegram stores them. */
export async function readTiles(call: BotCall, token: string, fileIds: string[]): Promise<Uint8Array[]> {
  const out: Uint8Array[] = new Array(fileIds.length);
  let next = 0;
  const worker = async () => {
    while (next < fileIds.length) {
      const i = next++;
      const file = (await call("getFile", { file_id: fileIds[i] })) as { file_path?: string };
      if (!file.file_path || !/^[\w./-]+$/.test(file.file_path)) throw new MosaicError(502, "TELEGRAM", "Telegram gave no path for a tile");
      out[i] = await download(token, file.file_path);
    }
  };
  await Promise.all(Array.from({ length: Math.min(DOWNLOADS, fileIds.length) }, worker));
  return out;
}

function run(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new MosaicError(503, "CHECK_UNAVAILABLE", "the content check can't run here"));
    const child = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd, stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d: Buffer) => { err = (err + d.toString()).slice(-400); });
    const timer = setTimeout(() => child.kill("SIGKILL"), 40_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        console.error("mosaic: ffmpeg failed", err.replace(/\s+/g, " "));
        reject(new MosaicError(503, "CHECK_UNAVAILABLE", "the content check couldn't read the tiles"));
      }
    });
    child.on("error", () => { clearTimeout(timer); reject(new MosaicError(503, "CHECK_UNAVAILABLE", "the content check can't run here")); });
  });
}

/** Up to six JPEG frames of the whole mosaic, at most 768 px wide. */
export async function framesFromTiles(tiles: Uint8Array[], cols: number, format: "video" | "static"): Promise<Uint8Array[]> {
  const dir = await mkdtemp(join(/* turbopackIgnore: true */ tmpdir(), "mosaic-check-"));
  try {
    const ext = format === "video" ? "webm" : "png";
    const inputs: string[] = [];
    for (let i = 0; i < tiles.length; i++) {
      const name = `t${String(i).padStart(3, "0")}.${ext}`;
      await writeFile(join(/* turbopackIgnore: true */ dir, name), tiles[i]);
      inputs.push("-i", name);
    }
    const layout = tiles.map((_, i) => `${(i % cols) * TILE}_${Math.floor(i / cols) * TILE}`).join("|");
    const stack = tiles.length > 1 ? `${tiles.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${tiles.length}:layout=${layout}:fill=black[s]` : "[0:v]null[s]";
    const sample = format === "video" ? `[s]fps=2,scale='min(${WIDTH},iw)':-2[o]` : `[s]scale='min(${WIDTH},iw)':-2[o]`;
    await run([...inputs, "-filter_complex", `${stack};${sample}`, "-map", "[o]", "-frames:v", String(format === "video" ? FRAMES : 1), "-q:v", "4", "frame_%02d.jpg"], dir);
    const names = (await readdir(dir)).filter((n) => n.startsWith("frame_")).sort();
    if (!names.length) throw new MosaicError(503, "CHECK_UNAVAILABLE", "the content check got no frames");
    return Promise.all(names.map(async (n) => new Uint8Array(await readFile(join(/* turbopackIgnore: true */ dir, n)))));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
