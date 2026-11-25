// Lets `node --test` import the route handlers as Next.js builds them: the "@/" alias and
// extensionless imports resolve to src/*.ts, JSON and .txt files import as their contents (the
// turbopack "raw" rule), and the few Next.js runtime APIs the handlers call outside a request are
// stubbed. Nothing here ships; the handlers themselves run unchanged.
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../../src/", import.meta.url);
const STUBS = {
  "server-only": "export {};",
  // connection() only marks a route dynamic; cacheLife() only tunes the cache of a "use cache" function.
  "next/server": "export async function connection() {}",
  "next/cache": "export function cacheLife() {}",
};

function file(url) {
  const path = fileURLToPath(url);
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in STUBS) return { url: `stub:${specifier}`, format: "module", shortCircuit: true };
    let url = null;
    if (specifier.startsWith("@/")) url = file(new URL(specifier.slice(2), SRC));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && /\.(ts|tsx)$/.test(context.parentURL)) {
      url = file(new URL(specifier, context.parentURL));
    }
    const resolved = url ? { url, shortCircuit: true } : nextResolve(specifier, context);
    // The package has no "type": say what .ts files are instead of letting Node guess (and warn).
    return resolved.url.endsWith(".ts") ? { ...resolved, format: "module-typescript" } : resolved;
  },
  load(url, context, nextLoad) {
    if (url.startsWith("stub:")) return { format: "module", source: STUBS[url.slice(5)], shortCircuit: true };
    if (url.startsWith("file:") && (url.endsWith(".json") || url.endsWith(".txt"))) {
      const text = readFileSync(fileURLToPath(url), "utf8");
      const source = `export default ${url.endsWith(".json") ? text : JSON.stringify(text)};`;
      return { format: "module", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
