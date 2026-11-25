"""Copies the agent docs that the skill repository generates into the site, so the site never drifts from the skill.

Needs a checkout of the skill repository (docs/agents/ comes from its generator). Standard library only.

    py -3 scripts/sync_agent_docs.py --skill ../telegram-bot-ui          copy
    py -3 scripts/sync_agent_docs.py --skill ../telegram-bot-ui --check  exit 1 when a copy differs

Copies, and all of them are committed so the site deploys without Python:
  public/agents.md, public/llms.txt, public/llms-full.txt   served at /agents.md, /llms.txt, /llms-full.txt
  src/content/agents.generated.json                         version, Bot API, hosts and commands for the site
"""
from __future__ import annotations

import argparse
import json
import os
import sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (file in <skill>/docs/agents, path inside the site)
FILES = [
    ("agents.md", os.path.join("public", "agents.md")),
    ("llms.txt", os.path.join("public", "llms.txt")),
    ("llms-full.txt", os.path.join("public", "llms-full.txt")),
    ("agents.json", os.path.join("src", "content", "agents.generated.json")),
]

REQUIRED_KEYS = ("version", "botApi", "verified", "repository", "site", "hosts", "commands")


def read(path: str) -> bytes:
    with open(path, "rb") as fh:
        return fh.read()


def same(a: bytes, b: bytes) -> bool:
    # git on Windows may check the copies out with CRLF; the content is what has to match.
    return a.replace(b"\r\n", b"\n") == b.replace(b"\r\n", b"\n")


def validate(data: bytes) -> dict:
    try:
        doc = json.loads(data)
    except ValueError as exc:
        raise SystemExit(f"agents.json is not valid JSON: {exc}")
    missing = [key for key in REQUIRED_KEYS if key not in doc]
    if missing:
        raise SystemExit(f"agents.json lacks {', '.join(missing)}: regenerate the skill's docs/agents/")
    return doc


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    ap.add_argument("--skill", required=True, help="path to the telegram-bot-ui skill repository")
    ap.add_argument("--check", action="store_true", help="write nothing; exit 1 when a copy differs from the skill")
    args = ap.parse_args()

    source_dir = os.path.join(os.path.abspath(args.skill), "docs", "agents")
    if not os.path.isdir(source_dir):
        raise SystemExit(f"{source_dir} is missing: is --skill the skill repository, with its docs generated?")
    sources = {}
    for name, _ in FILES:
        path = os.path.join(source_dir, name)
        if not os.path.isfile(path):
            raise SystemExit(f"{path} is missing: generate the skill's docs/agents/ first")
        sources[name] = read(path)
    doc = validate(sources["agents.json"])

    stale = []
    for name, target in FILES:
        path = os.path.join(SITE, target)
        shown = target.replace(os.sep, "/")
        current = read(path) if os.path.isfile(path) else None
        if current is not None and same(current, sources[name]):
            print(f"up to date  {shown}")
            continue
        stale.append(target)
        if args.check:
            print(f"differs     {shown}" if current is not None else f"missing     {shown}")
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(sources[name])
        print(f"copied      {shown}")

    print(f"skill {doc['version']}, Bot API {doc['botApi']}, verified {doc['verified']}")
    if args.check and stale:
        print(f"{len(stale)} file(s) differ from the skill: run this script without --check and commit the result", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
