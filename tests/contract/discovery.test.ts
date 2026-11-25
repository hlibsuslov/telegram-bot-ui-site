import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogPacks, packFacets } from "@/lib/emoji-facets";
import { getLibraryPack } from "@/lib/emoji-library";
import { rankSimilarPacks } from "@/lib/emoji-recommendations";
import { search, type SearchSource } from "@/lib/emoji-search";
import { calls, FAKE_TOKEN, installFakeTelegram } from "./telegram";

test("opening a pack reads only that pack", async () => {
  process.env.EMOJI_RESOLVER_BOT_TOKEN = FAKE_TOKEN;
  const restore = installFakeTelegram();
  try {
    const before = calls.length;
    const pack = await getLibraryPack("fluentemojiset1");
    assert.equal(pack?.pack.name, "FluentEmojiSet1");
    assert.equal(calls.length - before, 1);
  } finally {
    restore();
  }
});

test("similar packs prefer the same subject and style over generic visual compatibility", () => {
  const source = {
    name: "Original", category: "Faces & emotions",
    facets: { topic: [["faces", 1]], style: [["3d", 1]], motion: [["video", 1]] },
    compatible: [["Unrelated", 0.98]],
  } satisfies Parameters<typeof rankSimilarPacks>[0];
  const candidates: Parameters<typeof rankSimilarPacks>[1] = [
    source,
    { ...source, name: "Unrelated", category: "Brands & logos", facets: { style: [["3d", 1]], motion: [["video", 1]] } },
    { ...source, name: "Flat faces", facets: { topic: [["faces", 1]], style: [["flat", 1]] } },
    { ...source, name: "3D faces" },
  ];
  assert.deepEqual(rankSimilarPacks(source, candidates), ["3D faces", "Flat faces"]);
});

const searchSource: SearchSource = {
  revision: "discovery-regression",
  packs: [
    { name: "AppleSet", title: "Apples", category: "Food", rank: 0, tags: [] },
    { name: "ApplicationEmoji", title: "Application Emoji", category: "Brands", rank: 400, tags: ["app icons"], fw: ["technology"] },
  ],
  emoji: [
    { p: 0, id: "1", f: "🍎", fmt: "static", ad: false, pv: true, st: false, tags: ["apples"], fc: ["motion:static"] },
    { p: 1, id: "2", f: "✨", fmt: "video", ad: false, pv: true, st: true, tags: [], fc: ["motion:video"] },
  ],
};

test("search ranks literal pack names and retains constraints in suggestions", () => {
  assert.equal(search(searchSource, "applicationemoji").packs[0]?.name, "ApplicationEmoji");
  assert.equal(search(searchSource, "technol").suggest.complete[0], "technology");
  assert.deepEqual(search(searchSource, "motion:video ✨ appl").suggest.complete, ["✨ application motion:video"]);
  const typo = search(searchSource, "motion:video ✨ aplicaton");
  assert.equal(typo.suggest.didYouMean, "✨ application motion:video");
  assert.ok(search(searchSource, typo.suggest.didYouMean).total > 0);
  assert.equal(search(searchSource, "motion:static ✨ aplicaton").suggest.didYouMean, null);
});

test("the requested packs each have one catalog entry with descriptions and tags", () => {
  for (const [name, count] of [["PERCEPTRON", 98], ["ApplicationEmoji", 150], ["RhymesTG", 99]] as const) {
    const found = catalogPacks().filter((pack) => pack.name.toLowerCase() === name.toLowerCase());
    assert.equal(found.length, 1, name);
    assert.equal(found[0].emoji.length, count, name);
    assert.ok(packFacets(name)?.description?.en?.what, name);
    assert.ok(packFacets(name)?.facets.topic?.length, name);
  }
});
