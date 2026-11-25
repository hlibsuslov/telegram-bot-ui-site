// Keeps the site and the agent docs the skill generates in step. Run with `npm test` (node --test).
//
// Reads files only, nothing is built or fetched. The copies themselves are compared with the skill by
// `py -3 scripts/sync_agent_docs.py --skill <skill repo> --check`.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const APP = join(SITE, "src", "app");
const PUBLIC_DOCS = ["agents.md", "llms.txt", "llms-full.txt"];

const read = (...parts) => readFileSync(join(SITE, ...parts), "utf8").replace(/\r\n/g, "\n");
const generated = JSON.parse(read("src", "content", "agents.generated.json"));
const siteSource = read("src", "content", "site.ts");
const siteConst = (name) => siteSource.match(new RegExp(`export const ${name} = (.+?);$`, "m"))?.[1];

const ROUTE_FILE = /^(page|route)\.(tsx|ts|jsx|js|mdx)$/;
const GROUP = /^\(.+\)$/;
const DYNAMIC = /^\[[^\].]+\]$/;
// Metadata routes Next serves from a file convention: /sitemap.xml from sitemap.ts, /robots.txt from robots.ts.
const GENERATED_ROUTES = { "sitemap.xml": /^sitemap\.(ts|js)$/, "robots.txt": /^robots\.(ts|js)$/ };

/** Whether the App Router has a page, route handler or metadata file for these path segments under `dir`. */
function routeExists(dir, segments) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const subdirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const groups = subdirs.filter((name) => GROUP.test(name));
  const [head, ...rest] = segments;
  if (head === undefined) {
    return entries.some((entry) => entry.isFile() && ROUTE_FILE.test(entry.name)) || groups.some((name) => routeExists(join(dir, name), segments));
  }
  if (rest.length === 0) {
    const generatedRoute = GENERATED_ROUTES[head];
    if (entries.some((entry) => entry.isFile() && (entry.name === head || generatedRoute?.test(entry.name)))) return true;
  }
  return subdirs.some((name) => {
    if (name === head || DYNAMIC.test(name)) return routeExists(join(dir, name), rest);
    return GROUP.test(name) && routeExists(join(dir, name), segments);
  });
}

const segmentsOf = (pathname) => pathname.split("/").filter(Boolean).map(decodeURIComponent);

test("the generated JSON carries what the site reads", () => {
  assert.match(generated.version, /^\d+\.\d+\.\d+$/);
  assert.match(generated.botApi, /^\d+\.\d+$/);
  assert.match(generated.verified, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(generated.hosts.length > 0 && generated.hosts.every((host) => host.host && host.commands.length > 0));
  assert.ok(generated.commands.length > 0 && generated.commands.every((cmd) => cmd.verb && cmd.short && cmd.example));
});

test("the version, Bot API and verification date the site shows come from the generated JSON", () => {
  assert.equal(siteConst("VERSION"), "agents.version");
  assert.equal(siteConst("BOT_API"), "agents.botApi");
  assert.equal(siteConst("VERIFIED_ON"), "agents.verified");
  assert.equal(siteConst("AGENT_HOSTS"), "agents.hosts");
  assert.equal(siteConst("AGENT_COMMANDS"), "agents.commands");
});

test("the site address and repository in the generated JSON are the ones the site uses", () => {
  assert.equal(siteConst("SITE_ORIGIN"), JSON.stringify(generated.site));
  assert.equal(generated.repository, `https://github.com/${JSON.parse(siteConst("REPO"))}`);
});

test("the served copies are of the same release as the generated JSON", () => {
  assert.match(read("public", "agents.md"), new RegExp(`Version ${generated.version.replaceAll(".", "\\.")}`));
  for (const name of PUBLIC_DOCS) {
    const text = read("public", name);
    assert.ok(text.includes(`Bot API ${generated.botApi}`), `${name} names Bot API ${generated.botApi}`);
    assert.ok(text.includes(generated.verified), `${name} names ${generated.verified}`);
    assert.match(text, new RegExp(`[Vv]ersion ${generated.version.replaceAll(".", "\\.")}`), `${name} names version ${generated.version}`);
  }
});

test("llms.txt links to the site's own address land on a file or a route that exists", () => {
  for (const name of PUBLIC_DOCS) {
    const own = [...read("public", name).matchAll(/https?:\/\/[^\s)>\]"'`]+/g)]
      .map((match) => match[0].replace(/[.,;:]+$/, ""))
      .filter((link) => link.startsWith(generated.site));
    for (const link of own) {
      const { pathname } = new URL(link);
      const served = existsSync(join(SITE, "public", ...segmentsOf(pathname))) || routeExists(APP, segmentsOf(pathname));
      assert.ok(served, `${name} links to ${link}, which neither public/ nor src/app serves`);
    }
    if (name === "llms.txt") assert.ok(own.length > 0, "llms.txt links to the site at least once");
  }
});

test("no route is served on a path the public docs already own", () => {
  for (const name of PUBLIC_DOCS) {
    assert.equal(routeExists(APP, [name]), false, `src/app also serves /${name}`);
  }
});
