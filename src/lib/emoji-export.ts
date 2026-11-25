// The whole catalog in one file, for agents that work offline: /emoji-library.ndjson.gz, one JSON
// line per pack (name, title, category, count, facets, look, description when the catalog has one,
// compatible packs, and every emoji id with its tag string), built from the committed
// emoji-facets.json at build time. No Telegram call, so the same commit always gives the same bytes,
// and the ETag only changes when the catalog does.
import "server-only";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { catalogPacks, catalogVersion, type CatalogPack } from "./emoji-facets";

export type CatalogLine = CatalogPack & typeof catalogVersion;

export interface CatalogExport { body: Buffer; bytes: number; etag: string; lines: number }

let built: CatalogExport | null = null;

/** The gzip file, its size and a strong ETag (a hash of the bytes); built once per process. */
export function catalogExport(): CatalogExport {
  if (built) return built;
  const lines = catalogPacks().map((p): CatalogLine => ({ ...p, ...catalogVersion }));
  const body = gzipSync(lines.map((l) => JSON.stringify(l)).join("\n") + "\n", { level: 9 });
  const etag = `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"`;
  built = { body, bytes: body.length, etag, lines: lines.length };
  return built;
}
