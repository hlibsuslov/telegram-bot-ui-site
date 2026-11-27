// The server rebuilds whole-mosaic frames from tiles with ffmpeg for the authoritative content check.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import ffmpegPath from "ffmpeg-static";
import { framesFromTiles } from "@/lib/emoji-mosaic-frames";

test("four video tiles become JPEG frames of the whole 2x2 mosaic", { skip: !ffmpegPath }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "mosaic-frames-test-"));
  try {
    const tiles = [0, 1, 2, 3].map((i) => {
      const out = join(dir, `t${i}.webm`);
      execFileSync(ffmpegPath!, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `testsrc2=size=100x100:rate=30:duration=2`, "-vf", `hue=h=${i * 90}`, "-c:v", "libvpx-vp9", "-b:v", "100k", "-an", out]);
      return new Uint8Array(readFileSync(out));
    });
    const frames = await framesFromTiles(tiles, 2, "video");
    assert.ok(frames.length >= 3 && frames.length <= 6, `got ${frames.length} frames`);
    for (const f of frames) assert.deepEqual([f[0], f[1]], [0xff, 0xd8]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
