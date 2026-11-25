"""Contact sheets of the emoji library, for tagging what each emoji shows.

Telegram does not tell bots what a custom emoji depicts (creators' keywords cannot be read through
the Bot API), so search needs our own words for logos, icons and letters. This script draws every
emoji of the chosen packs on a numbered grid; a person or a vision model writes one line per number
(`7: nvidia, logo, gpu`), and `emoji_tags_merge.py` turns those lines into src/content/emoji-tags.txt.

Reads packs through a running site (dev server with EMOJI_RESOLVER_BOT_TOKEN in .env.development.local):

    py -3 scripts/emoji_sheets.py --base http://127.0.0.1:3021 --out .emoji-sheets \
        --category "Brands & logos" --category "Interface & icons"

Writes <out>/<pack>.png (grid, numbered from 1) and <out>/<pack>.json ({"1": [id, fallback], ...}).
Needs Pillow; video emoji need ffmpeg on PATH (first frame); an animated (TGS) emoji Telegram gives no
thumbnail is drawn from its first frame with rlottie-python (`py -3 -m pip install rlottie-python`), or a
later one (1/4, 1/2, 3/4) when the first is empty. Existing sheets are kept unless --force.

Emoji the build could not measure (an empty cell: a TGS without a thumbnail on an older sheet) are drawn
again on a small fill sheet, <out>/<pack>.fill.png/.json, which `emoji_taxonomy.py build` reads after the
pack's own sheet:

    py -3 scripts/emoji_sheets.py --base https://telegram-bot-ui.hlixli.com --gaps .emoji-taxonomy/report.json

Against any host but localhost the requests go one at a time and wait out a 429 (the site allows 30 packs
and 1000 animations a minute per client).
"""
from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageDraw, ImageFont

PACKS = os.path.join(os.path.dirname(__file__), "..", "src", "content", "emoji-packs.txt")
LINK = re.compile(r"^(?:https?://)?(?:www\.)?(?:t\.me|telegram\.me)/addemoji/([A-Za-z0-9_]{1,64})/?$", re.I)
CELL, ICON, COLS, LABEL = 92, 64, 12, 18
_n = 0


def listed(categories: set[str]) -> list[str]:
    out, cat = [], "Other"
    for raw in open(PACKS, encoding="utf-8"):
        line = raw.strip()
        if line.startswith("## "):
            cat = line[3:].strip()
            continue
        m = LINK.match(line)
        if m and (not categories or cat in categories):
            out.append(m.group(1))
    return out


def is_local(url: str) -> bool:
    return (urllib.parse.urlsplit(url).hostname or "") in ("localhost", "127.0.0.1", "::1")


def get(url: str) -> tuple[str, bytes]:
    global _n
    headers = {"User-Agent": "emoji-sheets"}
    if is_local(url):  # the local dev resolver limits per client address; spread the requests
        _n += 1
        headers["X-Forwarded-For"] = f"10.9.{_n // 250 % 250}.{_n % 250}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as r:
                return r.headers.get("Content-Type", ""), r.read()
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == 3:
                raise
            time.sleep(min(120, int(err.headers.get("Retry-After") or 60)))
    raise OSError("unreachable")


_rlottie_warned = False


def tgs_frame(data: bytes) -> Image.Image | None:
    """The first frame of a TGS (gzip Lottie), or a later one when the first is empty (a loader that fades
    in): the first with ink, else the one with most. None without rlottie-python or for a file it cannot read."""
    global _rlottie_warned
    try:
        from rlottie_python import LottieAnimation
    except ImportError:
        if not _rlottie_warned:
            print("rlottie-python is missing: a TGS without a thumbnail stays an empty cell "
                  "(py -3 -m pip install rlottie-python)", file=sys.stderr)
            _rlottie_warned = True
        return None
    try:
        raw = gzip.decompress(data) if data[:2] == b"\x1f\x8b" else data
        if len(raw) > 8 << 20:
            return None
        anim = LottieAnimation.from_data(raw.decode("utf-8"))
        total = anim.lottie_animation_get_totalframe()
        best, most = None, -1
        for frame in dict.fromkeys((0, total // 4, total // 2, 3 * total // 4)):
            img = anim.render_pillow_frame(frame_num=frame, width=ICON * 2, height=ICON * 2)
            if ink(img) >= 0.01:
                return img
            if ink(img) > most:
                best, most = img, ink(img)
        return best
    except (OSError, ValueError, UnicodeDecodeError, AttributeError):
        return None


def ink(img: Image.Image) -> float:
    """Share of the picture that is not transparent."""
    alpha = img.getchannel("A").point(lambda a: 255 if a > 32 else 0)
    return alpha.histogram()[255] / (img.width * img.height)


def picture(ctype: str, data: bytes) -> Image.Image | None:
    if "tgsticker" in ctype or data[:2] == b"\x1f\x8b":
        return tgs_frame(data)
    if "webm" in ctype:
        try:
            png = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1"],
                                 input=data, capture_output=True, timeout=30).stdout
            return Image.open(io.BytesIO(png)).convert("RGBA") if png else None
        except (OSError, subprocess.SubprocessError):
            return None
    try:
        return Image.open(io.BytesIO(data)).convert("RGBA")
    except OSError:
        return None


def sheet(base: str, name: str, out: str, pack: dict | None = None, stem: str | None = None) -> str:
    """Draw the sheet of a pack. `pack` is the site's /api/emoji-pack/<name> answer when the caller has it
    already, or a subset of its emoji for a fill sheet named `stem`."""
    if pack is None:
        pack = json.loads(get(f"{base}/api/emoji-pack/{name}")[1])
    emoji = pack["emoji"]

    def load(e: dict) -> Image.Image | None:
        for key in ("preview", "animation"):  # a TGS without a thumbnail: render the animation itself
            if not e.get(key):
                continue
            try:
                img = picture(*get(base + e[key]))
            except OSError:
                img = None
            if img is not None:
                return img
        return None

    with ThreadPoolExecutor(max_workers=4 if is_local(base) else 1) as pool:
        images = list(pool.map(load, emoji))
    return draw(emoji, images, out, stem or name, pack.get("title"))


def draw(emoji: list[dict], images: list, out: str, stem: str, title: str | None) -> str:
    rows = (len(emoji) + COLS - 1) // COLS
    canvas = Image.new("RGB", (COLS * CELL, rows * CELL), (200, 200, 204))  # mid grey: white and black emoji both show
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=15)
    for i, img in enumerate(images):
        x, y = (i % COLS) * CELL, (i // COLS) * CELL
        draw.rectangle([x + 1, y + 1, x + CELL - 2, y + CELL - LABEL - 1], fill=(214, 214, 218))
        if img is not None:
            img.thumbnail((ICON, ICON))
            canvas.paste(img, (x + (CELL - img.width) // 2, y + (CELL - LABEL - img.height) // 2), img)
        draw.rectangle([x + 1, y + CELL - LABEL, x + CELL - 2, y + CELL - 2], fill=(255, 255, 255))
        draw.text((x + CELL // 2, y + CELL - LABEL // 2 - 1), str(i + 1), fill=(0, 0, 0), font=font, anchor="mm")
    canvas.save(os.path.join(out, f"{stem}.png"), optimize=True)
    index = {str(i + 1): [e["id"], e["fallback"]] for i, e in enumerate(emoji)}
    with open(os.path.join(out, f"{stem}.json"), "w", encoding="utf-8") as fh:
        json.dump({"pack": stem.split(".")[0], "title": title, "emoji": index}, fh, ensure_ascii=False)
    return f"{stem}: {len(emoji)} emoji, {sum(1 for i in images if i is None)} without a picture"


def fill_sheets(base: str, report: str, out: str, force: bool) -> None:
    """A fill sheet per pack for the emoji the last build could not measure. A static emoji with an empty
    cell is a blank or a fragment of a larger picture, so only animated and video ones are drawn again; their
    file URLs follow the site's routes, so no pack is fetched again."""
    with open(report, encoding="utf-8") as fh:
        gaps = json.load(fh).get("unmeasured") or {}
    for name, ids in sorted(gaps.items()):
        todo = [{"id": eid, "fallback": fb, "preview": f"/api/emoji-pack/{name}/{eid}" if fmt == "video" else None,
                 "animation": f"/api/emoji-pack/{name}/{eid}/anim" if fmt == "animated" else None}
                for eid, (fmt, fb) in ids.items() if fmt != "static"]
        if not todo or (not force and os.path.exists(os.path.join(out, f"{name}.fill.json"))):
            continue
        try:
            print(sheet(base, name, out, pack={"emoji": todo}, stem=f"{name}.fill"), flush=True)
        except Exception as err:  # one pack failing must not stop the rest
            print(f"{name}: failed: {err}", file=sys.stderr, flush=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--base", default="http://127.0.0.1:3021")
    ap.add_argument("--out", default=".emoji-sheets")
    ap.add_argument("--category", action="append", default=[], help="only packs under this ## heading (repeatable)")
    ap.add_argument("--pack", action="append", default=[], help="only these packs (repeatable)")
    ap.add_argument("--gaps", help="emoji_taxonomy.py's report.json: fill sheets of the emoji the build could not measure")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    if args.gaps:
        fill_sheets(args.base.rstrip("/"), args.gaps, args.out, args.force)
        return 0
    names = args.pack or listed(set(args.category))
    for name in names:
        if not args.force and os.path.exists(os.path.join(args.out, f"{name}.json")):
            continue
        try:
            print(sheet(args.base.rstrip("/"), name, args.out), flush=True)
        except Exception as err:  # one pack failing must not stop the rest
            print(f"{name}: failed: {err}", file=sys.stderr, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
