"""Merge tags written for contact sheets (emoji_sheets.py) into src/content/emoji-tags.txt.

For each <pack>.json sheet index the tagger writes <pack>.tags.txt next to it:

    pack: words for the whole pack, comma-separated     (optional, first line)
    1: nvidia, logo, gpu, нвидиа
    2: apple, logo, яблоко
    ...

Numbers are the grid labels. The merge replaces the generated block for every pack it has tags
for and keeps everything written by hand above the block.

    py -3 scripts/emoji_tags_merge.py .emoji-sheets
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

TAGS = os.path.join(os.path.dirname(__file__), "..", "src", "content", "emoji-tags.txt")
BEGIN = "# ---- generated from contact sheets (scripts/emoji_tags_merge.py); edit above this line ----"
WORD = re.compile(r"^[\w\s&'.+\-]{1,40}$", re.U)


def clean(raw: str) -> list[str]:
    out = []
    for t in raw.split(","):
        t = " ".join(t.strip().lower().split())
        if t and WORD.match(t) and t not in out:
            out.append(t)
    return out[:12]


def main() -> int:
    folder = sys.argv[1] if len(sys.argv) > 1 else ".emoji-sheets"
    generated: dict[str, list[str]] = {}
    for path in sorted(glob.glob(os.path.join(folder, "*.tags.txt"))):
        name = os.path.basename(path)[: -len(".tags.txt")]
        index = json.load(open(os.path.join(folder, f"{name}.json"), encoding="utf-8"))["emoji"]
        lines = []
        for raw in open(path, encoding="utf-8"):
            key, _, value = raw.partition(":")
            key, tags = key.strip().lower(), clean(value)
            if not tags:
                continue
            if key == "pack":
                lines.append(f"{name}: {', '.join(tags)}")
            elif key in index:
                lines.append(f"{name}/{index[key][0]}: {', '.join(tags)}")
        generated[name] = lines
    text = open(TAGS, encoding="utf-8").read()
    head = text.split(BEGIN)[0].rstrip("\n")
    body = [line for name in sorted(generated, key=str.lower) for line in generated[name]]
    with open(TAGS, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(head + "\n\n" + BEGIN + "\n" + "\n".join(body) + "\n")
    print(f"{len(generated)} packs, {len(body)} tag lines -> {os.path.relpath(TAGS)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
