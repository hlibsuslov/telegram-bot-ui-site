// GET /emoji-library.ndjson.gz: the whole emoji catalog for offline use (lib/emoji-export.ts).
// Prerendered at build time and served as a static file; the ETag is a hash of its bytes. Its size is in
// the OpenAPI document and llms.txt (Next.js answers cached routes chunked, without Content-Length).
import { catalogExport } from "@/lib/emoji-export";

export function GET() {
  const { body, etag } = catalogExport();
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": 'attachment; filename="emoji-library.ndjson.gz"',
      ETag: etag,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
