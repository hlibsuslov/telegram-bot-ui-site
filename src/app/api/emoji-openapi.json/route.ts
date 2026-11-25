// GET /api/emoji-openapi.json: the emoji library API as an OpenAPI 3.1 document (lib/emoji-openapi.ts).
// Prerendered at build time, like the catalog export it describes.
import { openApiDocument } from "@/lib/emoji-openapi";
import { siteUrl } from "@/lib/site-url";

export function GET() {
  return Response.json(openApiDocument(siteUrl()), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
  });
}
