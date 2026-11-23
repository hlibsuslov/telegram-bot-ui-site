"""Contact sheets of the emoji library, for tagging what each emoji shows.

Telegram does not tell bots what a custom emoji depicts (creators' keywords cannot be read through
the Bot API), so search needs our own words for logos, icons and letters. This script draws every
emoji of the chosen packs on a numbered grid; a person or a vision model writes one line per number
(`7: nvidia, logo, gpu`), and `emoji_tags_merge.py` turns those lines into src/content/emoji-tags.txt.

Reads packs through a running site (dev server with EMOJI_RESOLVER_BOT_TOKEN in .env.development.local):

    py -3 scripts/emoji_sheets.py --base http://127.0.0.1:3021 --out .emoji-sheets \
        --category "Brands & logos" --category "Interface & icons"

Writes <out>/<pack>.png (grid, numbered from 1) and <out>/<pack>.json ({"1": [id, fallback], ...}).
Needs Pillow; video emoji need ffmpeg on PATH (first frame). Existing sheets are kept unless --force.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import subprocess
import sys
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


def get(url: str) -> tuple[str, bytes]:
    global _n
    _n += 1  # the local resolver limits per client address; spread the requests
    req = urllib.request.Request(url, headers={"X-Forwarded-For": f"10.9.{_n // 250 % 250}.{_n % 250}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.headers.get("Content-Type", ""), r.read()


def picture(ctype: str, data: bytes) -> Image.Image | None:
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


def sheet(base: str, name: str, out: str) -> str:
    _, body = get(f"{base}/api/emoji-pack/{name}")
    pack = json.loads(body)
    emoji = pack["emoji"]

    def load(e: dict) -> Image.Image | None:
        if not e.get("preview"):
            return None
        try:
            return picture(*get(base + e["preview"]))
        except OSError:
            return None

    with ThreadPoolExecutor(max_workers=4) as pool:
        images = list(pool.map(load, emoji))
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
    canvas.save(os.path.join(out, f"{name}.png"), optimize=True)
    index = {str(i + 1): [e["id"], e["fallback"]] for i, e in enumerate(emoji)}
    with open(os.path.join(out, f"{name}.json"), "w", encoding="utf-8") as fh:
        json.dump({"pack": name, "title": pack.get("title"), "emoji": index}, fh, ensure_ascii=False)
    return f"{name}: {len(emoji)} emoji, {sum(1 for i in images if i is None)} without a picture"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--base", default="http://127.0.0.1:3021")
    ap.add_argument("--out", default=".emoji-sheets")
    ap.add_argument("--category", action="append", default=[], help="only packs under this ## heading (repeatable)")
    ap.add_argument("--pack", action="append", default=[], help="only these packs (repeatable)")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
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
