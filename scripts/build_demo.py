"""Builds the public Studio demo from the sample bot in demo/bot-ui.

Needs a checkout of the skill repository with the Studio (studio/ and skills/), its web client
built once (`cd studio/web && npm ci && npm run build:artifact`). Standard library only.

    py -3 scripts/build_demo.py --studio ../telegram-bot-ui/studio

Writes, and both are committed so the site deploys without Python:
  public/studio/demo.html          the Studio client in demo mode with the bot's snapshot
  src/content/demo-widgets.json    the bot's built widgets and the mock runtime for live previews
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = os.path.join(SITE, "demo", "bot-ui")
PAGE_OUT = os.path.join(SITE, "public", "studio", "demo.html")
WIDGETS_OUT = os.path.join(SITE, "src", "content", "demo-widgets.json")
MARK = "__BOT_UI_SNAPSHOT__"


def cli(studio: str, *args: str) -> str:
    cmd = [sys.executable, os.path.join(studio, "bot-ui.py"), *args, "--project", PROJECT]
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env)
    if res.returncode:
        raise SystemExit(f"{' '.join(args)} failed:\n{res.stdout}{res.stderr}")
    return res.stdout


def demo_page(studio: str, tmp: str) -> None:
    template = os.path.join(studio, "web", "dist-artifact", "index.html")
    if not os.path.isfile(template):
        raise SystemExit(f"{template} is missing: run `npm ci && npm run build:artifact` in studio/web")
    snap_path = os.path.join(tmp, "snapshot.json")
    # Every emoji of the imported packs gets its picture, so the demo shows the whole packs.
    cli(studio, "export-snapshot", "--format", "json", "--emoji-previews", "all", "--emoji-budget", "2500000",
        "--output", snap_path)
    with open(snap_path, encoding="utf-8") as fh:
        doc = json.load(fh)
    # Same surface as the artifact (edit texts and rules, simulate, export a patch) plus the demo copy.
    doc["features"] = {**doc.get("features", {}), "demo": True}
    payload = json.dumps(doc, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    with open(template, encoding="utf-8") as fh:
        page = fh.read()
    if MARK not in page:
        raise SystemExit(f"{template} has no {MARK} placeholder")
    page = page.replace(MARK, payload, 1).replace("<title>bot-ui Studio</title>", "<title>Brewline · bot-ui Studio demo</title>", 1)
    os.makedirs(os.path.dirname(PAGE_OUT), exist_ok=True)
    with open(PAGE_OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(page)


def widgets(studio: str, tmp: str) -> None:
    out_dir = os.path.join(tmp, "build")
    cli(studio, "build", "--output", out_dir)
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(studio)), "skills", "telegram-bot-ui", "scripts"))
    import preview_widget as pw  # the skill's mock runtime, the same one the Studio preview uses

    result: dict = {"mock": pw.MOCK_JS, "css": pw.DEFAULT_CSS, "themes": pw.THEMES, "widgets": {}}
    root = os.path.join(PROJECT, "widgets")
    for wid in sorted(os.listdir(root)):
        meta_path = os.path.join(root, wid, "widget.json")
        if wid.startswith("_") or not os.path.isfile(meta_path):
            continue
        with open(meta_path, encoding="utf-8") as fh:
            meta = json.load(fh)
        html, sizes = {}, {}
        for lang in meta["languages"]:
            with open(os.path.join(out_dir, f"{wid}.{lang}.html"), encoding="utf-8") as fh:
                html[lang] = fh.read()
            sizes[lang] = pw.build_widget.compressed_size(html[lang])
        result["widgets"][wid] = {key: meta.get(key) for key in ("title", "caption", "now", "fresh", "states")}
        result["widgets"][wid].update(html=html, compressedBytes=sizes)
    with open(WIDGETS_OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=1)
        fh.write("\n")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--studio", default=os.path.join(SITE, "..", "telegram-bot-ui", "studio"),
                    help="the studio/ folder of a skill checkout (default: ../telegram-bot-ui/studio)")
    studio = os.path.abspath(ap.parse_args().studio)
    print(cli(studio, "validate").strip().splitlines()[-1])
    print("\n".join(line for line in cli(studio, "simulate", "--all").splitlines() if line.startswith("==")))
    with tempfile.TemporaryDirectory() as tmp:
        demo_page(studio, tmp)
        widgets(studio, tmp)
    print(f"wrote {os.path.relpath(PAGE_OUT, SITE)} and {os.path.relpath(WIDGETS_OUT, SITE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
