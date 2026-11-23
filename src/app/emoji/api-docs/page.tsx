import Link from "next/link";
import { EmojiCode, EmojiDoc } from "@/components/emoji/emoji-doc";
import { IdLookup } from "@/components/emoji/id-lookup";
import { JsonLd } from "@/components/emoji/json-ld";
import { CHECKMARK } from "@/content/emoji-example";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { emojiBreadcrumbs, emojiMetadata } from "@/lib/emoji-metadata";
import { messageEmojiHtml } from "@/lib/emoji-snippets";

const TITLE = "Telegram Custom Emoji ID Lookup and JSON API";
const DESCRIPTION = "Find which Telegram pack owns a custom emoji ID, or use the Emoji Library API to search packs and get IDs for bot messages and buttons.";

export const metadata = emojiMetadata(EMOJI_API_DOCS_PATH, TITLE, DESCRIPTION);

const sample = {
  id: CHECKMARK.id, fallback: CHECKMARK.fallback, format: CHECKMARK.format, adaptive: CHECKMARK.adaptive,
  preview: CHECKMARK.preview, animation: CHECKMARK.animation, still: null,
};

export default function EmojiApiDocs() {
  return (
    <EmojiDoc title={TITLE} intro={DESCRIPTION}>
      <JsonLd value={emojiBreadcrumbs({ name: "Emoji Library", path: "/emoji" }, { name: TITLE, path: EMOJI_API_DOCS_PATH })} />
      <section aria-labelledby="lookup">
        <h2 id="lookup" className="scroll-mt-24">Find a pack by custom emoji ID</h2>
        <p>Paste the <code>custom_emoji_id</code> from your bot’s message entity or the <code>icon_custom_emoji_id</code> from a keyboard button. Try <code>{CHECKMARK.id}</code> to find the source of the animated checkmark.</p>
        <IdLookup />
      </section>

      <section aria-labelledby="endpoints">
        <h2 id="endpoints">Public JSON endpoints</h2>
        <p>Use <code>GET</code> on this site. These endpoints are read-only and require no API key. Resolve relative <code>pageUrl</code>, <code>preview</code>, <code>animation</code>, and <code>still</code> paths against the site origin. <code>still</code> is the thumbnail of a video emoji (its <code>preview</code> is the WEBM itself), or null. Use <code>pageUrl</code> to cite a library pack or <code>telegramUrl</code> for its original Telegram link. Keep every ID as a string.</p>

        <div className="mt-5">
          <h3 id="search"><code>GET /api/emoji-search</code></h3>
          <p>Pass <code>q</code> with words or a fallback emoji. Add <code>pack</code> to restrict matches to a catalog pack’s short name, case-insensitively. The query is clipped to 100 characters and uses up to six word tokens. Results contain up to 60 emoji, or up to 200 with a pack filter. <code>total</code> counts emoji matches before truncation. Pack matches and suggestions are returned separately. A blank query or unknown pack filter returns empty matches with HTTP 200.</p>
          <p className="mt-2"><a href={CHECKMARK.search}>Run this checkmark search</a></p>
          <EmojiCode>{JSON.stringify({
            ok: true, query: "checkmark",
            emoji: [{ pack: CHECKMARK.name, ...sample, score: 5, pageUrl: CHECKMARK.path }],
            packs: [{ name: CHECKMARK.name, score: 2.7, hits: 1, pageUrl: emojiPackPath(CHECKMARK.name) }],
            suggest: { complete: [], related: [], categories: [], didYouMean: null }, total: 1,
          }, null, 2)}</EmojiCode>
        </div>

        <div className="mt-5">
          <h3 id="pack"><code>GET /api/emoji-pack/[name]</code></h3>
          <p>Use the short name from a Telegram <code>t.me/addemoji/…</code> link. Names use 1–64 ASCII letters, digits, or underscores. The response contains the original pack title and up to 200 emoji. Each entry has a string <code>id</code>, a Unicode <code>fallback</code>, a <code>format</code> of <code>static</code>, <code>animated</code> (TGS), or <code>video</code> (WebM), an <code>adaptive</code> flag for text-color repainting, and relative media paths or <code>null</code>. <code>pageUrl</code> is <code>null</code> for a pack outside this catalog.</p>
          <p className="mt-2"><a href={CHECKMARK.api}>Get the full checkified pack</a>. This excerpt shows its checkmark.</p>
          <EmojiCode>{JSON.stringify({
            ok: true, name: CHECKMARK.name, title: CHECKMARK.title, emoji: [sample],
            pageUrl: emojiPackPath(CHECKMARK.name), telegramUrl: CHECKMARK.telegramUrl,
          }, null, 2)}</EmojiCode>
        </div>

        <div className="mt-5">
          <h3 id="by-id"><code>GET /api/emoji-pack/by-id</code></h3>
          <p>Pass <code>ids</code> as a comma-separated list of 1–200 distinct IDs. Each ID is 1–20 digits. Duplicates are collapsed, and unknown IDs are omitted. A valid lookup with no matches returns HTTP 200 and an empty <code>emoji</code> array. Use the returned <code>set</code> with the pack endpoint to get the emoji’s fallback and format.</p>
          <p className="mt-2"><a href={CHECKMARK.lookup}>Look up the checkmark ID</a></p>
          <EmojiCode>{JSON.stringify({ ok: true, emoji: [{ id: CHECKMARK.id, set: CHECKMARK.name, pageUrl: CHECKMARK.path, telegramUrl: CHECKMARK.telegramUrl }] }, null, 2)}</EmojiCode>
        </div>
      </section>

      <section aria-labelledby="errors">
        <h2 id="errors">Errors and request limits</h2>
        <p>Limits apply per client, endpoint, and running server instance over a one-minute window. Search allows 240 requests. Pack reads and ID lookups each allow 30. Cached responses can bypass those counters. On HTTP 429, wait for <code>Retry-After</code> when present, or wait a minute before retrying.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><code>400 BAD_REQUEST</code> for an invalid ID list, or <code>400 PACK_NAME</code> for an invalid pack name.</li>
          <li><code>404 PACK_NOT_FOUND</code> for an unknown pack and <code>422 NOT_EMOJI_PACK</code> for a sticker set with a different type.</li>
          <li><code>429 RATE_LIMITED</code> for throttling. The resolver can also return <code>413 TOO_LARGE</code>, <code>502 TELEGRAM_ERROR</code> or <code>TELEGRAM_UNREACHABLE</code>, and <code>503 BUSY</code> or <code>RESOLVER_OFF</code>. <code>500 INTERNAL</code> signals an unexpected server error.</li>
        </ul>
        <p className="mt-2"><a href={"/api/emoji-pack/by-id?ids=bad"}>Try an invalid ID list</a></p>
        <EmojiCode>{JSON.stringify({
          ok: false, error: { code: "BAD_REQUEST", message: "ids: 1 to 200 custom emoji ids (digits), comma-separated" },
        }, null, 2)}</EmojiCode>
      </section>

      <section aria-labelledby="use-id">
        <h2 id="use-id">Use the ID in your bot</h2>
        <p>For an HTML message, pass <code>{'parse_mode: "HTML"'}</code> with the pack’s fallback emoji inside the tag. A message entity stores the ID in <code>custom_emoji_id</code>. A keyboard button stores the same string in <code>icon_custom_emoji_id</code>.</p>
        <EmojiCode>{messageEmojiHtml(CHECKMARK.id, CHECKMARK.fallback)}</EmojiCode>
        <p>See the <Link href={EMOJI_GUIDE_PATH}>complete Telegram Bot API payloads</Link> and the <Link href={CHECKMARK.path}>source pack and checkmark</Link>.</p>
      </section>
    </EmojiDoc>
  );
}
