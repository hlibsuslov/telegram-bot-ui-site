// The emoji library API's limits and error codes. The routes and the resolver take them from here,
// and the OpenAPI document (lib/emoji-openapi.ts) is built from the same table, so the two cannot
// drift apart. No imports: every route can use it without pulling in the catalog data.

/** Requests per client (IP), per endpoint and per server instance in a one-minute window. */
export const RATE_LIMITS = { search: 240, pack: 30, ids: 30, facets: 60, file: 1500, anim: 1000 } as const;
export const RATE_WINDOW_SECONDS = 60;

/** Every `error.code` an endpoint answers with, its HTTP status and what it means. */
export const ERRORS = {
  BAD_REQUEST: { status: 400, meaning: "Malformed parameters: an invalid id list, pack name or emoji id, or a query string on a media URL." },
  PACK_NAME: { status: 400, meaning: "A pack name is 1-64 ASCII letters, digits or underscores." },
  PACK_NOT_FOUND: { status: 404, meaning: "Telegram has no pack with this name." },
  NO_PREVIEW: { status: 404, meaning: "This emoji has no picture (or no still thumbnail), or it is not in this pack." },
  NO_ANIMATION: { status: 404, meaning: "This emoji is not an animated (TGS) emoji, or it is not in this pack." },
  TOO_LARGE: { status: 413, meaning: "Telegram's answer or file is larger than the resolver accepts." },
  NOT_EMOJI_PACK: { status: 422, meaning: "The set exists but is a sticker set, not a custom emoji pack." },
  RATE_LIMITED: { status: 429, meaning: "Too many requests from this client, or Telegram asked the resolver to slow down. Wait for Retry-After when present, else a minute." },
  INTERNAL: { status: 500, meaning: "Unexpected server error." },
  TELEGRAM_ERROR: { status: 502, meaning: "Telegram answered with an error." },
  TELEGRAM_UNREACHABLE: { status: 502, meaning: "Telegram did not answer in time." },
  BUSY: { status: 503, meaning: "The resolver's queue is full; retry after Retry-After seconds." },
  RESOLVER_OFF: { status: 503, meaning: "The resolver has no working bot token in this deployment." },
} as const;

export type ErrorCode = keyof typeof ERRORS;
