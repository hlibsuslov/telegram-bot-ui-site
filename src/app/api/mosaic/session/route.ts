// Who is making packs on the mosaic page. GET: whether the feature is on and who is logged in. POST: the Telegram
// Login Widget's answer, checked against the mosaic bot's token, becomes a signed HttpOnly cookie. DELETE: log out.
import { allow, clientKey } from "@/lib/emoji-pack";
import { clearedCookie, MosaicError, mosaicConfig, mosaicErrorResponse, readSession, sameOrigin, sessionCookie, verifyLogin } from "@/lib/emoji-mosaic-server";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const config = await mosaicConfig();
  if (!config) return Response.json({ ok: true, enabled: false }, { headers: NO_STORE });
  return Response.json({ ok: true, enabled: true, bot: config.username, user: readSession(req, config.token) }, { headers: NO_STORE });
}

export async function POST(req: Request) {
  try {
    const config = await mosaicConfig();
    if (!config) throw new MosaicError(404, "DISABLED", "pack creation isn't set up on this site");
    sameOrigin(req);
    if (!allow(`mosaic-login:${clientKey(req)}`, 20)) throw new MosaicError(429, "RATE_LIMITED", "too many logins; retry in a minute", 60);
    const data = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const user = data && typeof data === "object" ? verifyLogin(data, config.token) : null;
    if (!user) throw new MosaicError(401, "BAD_LOGIN", "Telegram couldn't confirm this login; try again");
    return Response.json({ ok: true, user }, { headers: { ...NO_STORE, "Set-Cookie": sessionCookie(user, config.token) } });
  } catch (err) {
    return mosaicErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
  } catch (err) {
    return mosaicErrorResponse(err);
  }
  return Response.json({ ok: true }, { headers: { ...NO_STORE, "Set-Cookie": clearedCookie } });
}
