// The mosaic maker's rules match the skill's emoji_mosaic.py: the same default grids, crops, tile names and
// UTF-16 message, and a ZIP the skill's loader can read (stored entries, CRC-32, UTF-8 names).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { autoGrid, centeredCrop, clampCrop, columnFit, gridOptions, gridProblem, maxRadius, mosaicMessage, placement, tileNames } from "@/lib/emoji-mosaic";
import { crc32, zip } from "@/lib/emoji-mosaic-zip";

describe("grid", () => {
  test("the default keeps the shape and at most 8 columns, like the skill", () => {
    assert.deepEqual(autoGrid(1280, 720), { cols: 7, rows: 4 });
    assert.deepEqual(autoGrid(720, 1280), { cols: 4, rows: 7 });
    assert.deepEqual(autoGrid(1000, 1000), { cols: 6, rows: 6 });
    const square = autoGrid(1000, 1000);
    assert.equal(square.cols, square.rows);
    for (const [w, h] of [[1920, 1080], [1080, 1920], [3000, 1000]]) {
      const g = autoGrid(w, h);
      assert.ok(g.cols <= 8 && g.cols * g.rows <= 40);
    }
  });
  test("options are sorted by crop and labelled by column fit", () => {
    const crops = gridOptions(1280, 720).map((o) => Math.round(o.crop * 100));
    assert.deepEqual(crops, [...crops].sort((a, b) => a - b));
    assert.equal(columnFit(8), "safe");
    assert.equal(columnFit(12), "check-narrow-phone");
    assert.equal(columnFit(13), "likely-wraps");
  });
  test("limits", () => {
    assert.equal(gridProblem(10, 10), null);
    assert.match(gridProblem(11, 10)!, /at most 100/);
    assert.equal(maxRadius(8, 4), 200);
  });
});

describe("crop", () => {
  test("the centred crop has the grid's shape", () => {
    assert.deepEqual(centeredCrop(1280, 720, 2), { x: 0, y: 40, w: 1280, h: 640 });
    assert.deepEqual(centeredCrop(1000, 1000, 2), { x: 0, y: 250, w: 1000, h: 500 });
  });
  test("a crop stays inside the frame and keeps the aspect", () => {
    const r = clampCrop({ x: 1200, y: -50, w: 400, h: 400 }, 1280, 720, 2);
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1280 && r.y + r.h <= 720);
    assert.equal(Math.round(r.w / r.h), 2);
  });
  test("cover fills the canvas, contain pads it", () => {
    assert.deepEqual(placement({ x: 0, y: 0, w: 800, h: 400 }, 8, 4, "cover"), { x: 0, y: 0, w: 800, h: 400 });
    const c = placement({ x: 0, y: 0, w: 400, h: 400 }, 8, 4, "contain");
    assert.deepEqual(c, { x: 200, y: 0, w: 400, h: 400 });
  });
});

describe("message and files", () => {
  test("tiles go row by row", () => {
    assert.deepEqual(tileNames(2, 2, "webm"), ["tiles/r01c01.webm", "tiles/r01c02.webm", "tiles/r02c01.webm", "tiles/r02c02.webm"]);
  });
  test("entity offsets are UTF-16 code units", () => {
    const body = mosaicMessage(["1", "2", "3", "4"], 2, "🟦");
    assert.equal(body.text, "🟦🟦\n🟦🟦");
    assert.deepEqual(body.entities.map((e) => e.offset), [0, 2, 5, 7]);
  });
  test("the ZIP is valid: stored entries, CRC-32, central directory", () => {
    const data = new TextEncoder().encode("hello mosaic");
    const out = zip([{ name: "emoji-mosaic/mosaic.json", data }, { name: "emoji-mosaic/tiles/r01c01.png", data: new Uint8Array([1, 2, 3]) }]);
    const view = new DataView(out.buffer);
    assert.equal(view.getUint32(0, true), 0x04034b50);
    assert.equal(view.getUint32(14, true), crc32(data));
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
    const end = out.length - 22;
    assert.equal(view.getUint32(end, true), 0x06054b50);
    assert.equal(view.getUint16(end + 10, true), 2);
    const nameLength = view.getUint16(26, true);
    assert.equal(new TextDecoder().decode(out.slice(30 + nameLength, 30 + nameLength + data.length)), "hello mosaic");
  });
});
