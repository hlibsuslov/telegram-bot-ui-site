// The landing's GitHub star count: a count when GitHub answers, null (kept briefly) when it refuses, and the
// optional token is sent when set.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getStarCount } from "@/lib/github";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.GITHUB_TOKEN;
});

function fake(status: number, body: unknown, seen: Headers[] = []) {
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    seen.push(new Headers(init?.headers));
    return new Response(JSON.stringify(body), { status, headers: { "x-ratelimit-remaining": "0" } });
  }) as typeof fetch;
}

test("a count comes back as a number", async () => {
  fake(200, { stargazers_count: 22 });
  assert.equal(await getStarCount(), 22);
});

test("a rate-limited answer gives null, not an error", async () => {
  fake(403, { message: "API rate limit exceeded" });
  assert.equal(await getStarCount(), null);
});

test("GITHUB_TOKEN is sent when set", async () => {
  const seen: Headers[] = [];
  process.env.GITHUB_TOKEN = "test-token";
  fake(200, { stargazers_count: 5 }, seen);
  assert.equal(await getStarCount(), 5);
  assert.equal(seen[0].get("authorization"), "Bearer test-token");
});
