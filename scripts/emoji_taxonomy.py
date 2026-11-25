"""Faceted tags for the emoji library: every pack and every emoji, normalized, with a confidence.

    py -3 scripts/emoji_taxonomy.py fetch --base https://telegram-bot-ui.hlixli.com   # snapshot, ~30 packs/min
    py -3 scripts/emoji_taxonomy.py build --sheets .emoji-sheets --slots <skill>/data/emoji/slots.json
    py -3 scripts/emoji_taxonomy.py eval --gold gold.json                               # accuracy per facet
    py -3 scripts/emoji_taxonomy.py check                                               # overrides, taxonomy and output valid
    py -3 scripts/emoji_taxonomy.py add t.me/addemoji/<name> [--category "Animals"]     # one new pack, whole chain
    py -3 scripts/emoji_taxonomy.py apply-pending                                       # merge filled work items

`add` is safe to repeat; each step keeps what it finds: (1) the link goes under its ## category in
emoji-packs.txt (a category is suggested from the name, title and tags; --category or an answer at the
prompt confirms it), (2) a snapshot from the site, (3) a contact sheet in .emoji-sheets, (4) build with
the sheet folders and slots of the last build, (5) a work item .emoji-taxonomy/work/pending/<pack>.json
for the look card and the en/ru/uk description, which need eyes on the sheet (an agent fills it, then
runs `apply-pending`), (6) check, which names every pack still waiting for its card or description.

Sources and how much each is trusted (the confidence of a tag):
* Telegram data (format, needs_repainting), from the library API snapshot: 1.0.
* Pixels of the contact sheets (scripts/emoji_sheets.py): colour families, palette and whether an
  emoji stays visible on a light and on a dark chat background: 0.6-0.95 by how clear the measure is.
* The free-text tags in src/content/emoji-tags.txt (written from the same pictures by a person or a
  vision model), mapped onto src/content/emoji-taxonomy.json through its aliases: 0.75.
* The pack's category in emoji-packs.txt (kept by hand): 0.9 for the pack's topic.
* The ordinary emoji a custom emoji stands for (its fallback): meaning and interface role through the
  telegram-bot-ui slot vocabulary, and a few moods: 0.6.
* src/content/emoji-tag-overrides.txt, by hand: 1.0, applied last. This script never writes it, so a
  correction survives every rebuild. Line format: `<pack>[/<emoji id>] <facet>: +value, -value`.

Writes src/content/emoji-facets.json (read by lib/emoji-facets.ts) and .emoji-taxonomy/report.json
(coverage, words the taxonomy does not know yet, duplicates). Pillow is needed only for colours.
"""
from __future__ import annotations

import argparse
import colorsys
import glob
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "src", "content")
TAXONOMY = os.path.join(CONTENT, "emoji-taxonomy.json")
PACKS = os.path.join(CONTENT, "emoji-packs.txt")
TAGS = os.path.join(CONTENT, "emoji-tags.txt")
OVERRIDES = os.path.join(CONTENT, "emoji-tag-overrides.txt")
STYLES = os.path.join(CONTENT, "emoji-pack-styles.json")  # curated look cards from the vision pass; never generated
DESCRIPTIONS = os.path.join(CONTENT, "emoji-pack-descriptions.json")  # curated en/ru/uk texts; never generated
DESC_LIMITS = {"what": 140, "for": 70, "not_for": 70}
DESC_LANGS = ("en", "ru", "uk")
# Words that sell instead of describe (a stem matches its forms).
MARKETING = ("best", "amazing", "perfect", "stunning", "unique", "ultimate", "awesome", "beautiful",
             "лучш", "идеальн", "потрясающ", "уникальн", "крут", "шикарн",
             "найкращ", "ідеальн", "неймовірн", "унікальн", "крутий")
OUT = os.path.join(CONTENT, "emoji-facets.json")
WORK = os.path.join(ROOT, ".emoji-taxonomy")
FULL = os.path.join(WORK, "facets-full.json")  # every tag with its sources, for eval and review
CODE = {"color": "c", "palette": "p", "fit": "f", "style": "s", "topic": "t", "mood": "m", "role": "r"}
SNAP = os.path.join(WORK, "snapshot")
PENDING = os.path.join(WORK, "work", "pending")  # `add` writes a work item per pack still without card/description
DONE = os.path.join(WORK, "work", "done")  # `apply-pending` moves applied items here
SHEETS_OUT = os.path.join(ROOT, ".emoji-sheets")  # where `add` draws a new pack's contact sheet
LINK = re.compile(r"(?:t\.me|telegram\.me)/addemoji/([A-Za-z0-9_]{1,64})", re.I)
VS = re.compile("[︎️]")
CATEGORY_TOPIC = {
    "Interface & icons": "interface", "Status & signs": "status", "Brands & logos": "brands", "Crypto & finance": "finance",
    "Letters & fonts": "letters", "Faces & emotions": "faces", "Memes & characters": "characters", "Animals": "animals",
    "Food & drink": "food", "Nature & weather": "nature", "Holidays & seasons": "holidays", "Hearts & love": "love",
    "Flags & places": "flags", "Games & pixel art": "games", "Effects & decor": "decor",
}
FALLBACK_MOOD = {
    "joyful": "😀😃😄😁😆😊🙂😂🤣🥳🎉", "playful": "😜😝😛😉🤪😋😎", "loving": "😍🥰😘❤💕💖💗😻",
    "sad": "😢😭😞😔🥺💔", "angry": "😡😠🤬👿", "surprised": "😱😮😲🤯😳", "scary": "💀👻🎃☠", "calm": "😐😑😴😌🙏",
}
EXPRESSIVE_TOPICS = {"faces", "characters", "love"}  # a repainting face still has a mood of its own
NEUTRAL_TOPICS = {"interface", "status", "brands", "finance", "letters", "flags", "tech", "travel", "music", "office", "people", "symbols"}
SOURCE = {"telegram": 1.0, "manual": 1.0, "category": 0.9, "vision": 0.9, "words": 0.75, "fallback": 0.6}
LOOK = {"line_weight": {"none", "hairline", "thin", "medium", "bold"}, "fill": {"none", "flat", "gradient", "textured", "photo"},
        "perspective": {"front", "three-quarter", "isometric", "mixed"}, "shadows": {"none", "soft", "hard", "glow"},
        "characters": {"none", "some", "all"}}
CARD_FIELDS = {"style", "drawn", "confidence", "unsure", "source", *LOOK}
SURE_CARD = 0.7  # a card at least this sure replaces the styles guessed from words


# ------------------------------------------------------------------ inputs
def load_json(path: str):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def listed_packs() -> list[tuple[str, str]]:
    out, cat, seen = [], "Other", set()
    for raw in open(PACKS, encoding="utf-8"):
        line = raw.strip()
        if line.startswith("## "):
            cat = line[3:].strip()
            continue
        m = LINK.search(line)
        if m and m.group(1).lower() not in seen:
            seen.add(m.group(1).lower())
            out.append((m.group(1), cat))
    return out


def free_tags() -> dict[str, list[str]]:
    out: dict[str, list[str]] = defaultdict(list)
    for raw in open(TAGS, encoding="utf-8"):
        line = raw.strip()
        colon = line.find(":")
        if not line or line.startswith("#") or colon < 1:
            continue
        out[line[:colon].strip().lower()] += [t.strip().lower() for t in line[colon + 1:].split(",") if t.strip()]
    return out


def stem(word: str) -> str:
    if re.search("[а-яёіїєґ]", word):
        for e in ("ого", "его", "ая", "яя", "ое", "ые", "ий", "ый", "ой", "а", "я", "ы", "и", "е"):
            if len(word) - len(e) >= 4 and word.endswith(e):
                return word[: -len(e)]
        return word
    return word[:-1] if len(word) > 3 and word.endswith("s") and not word.endswith("ss") else word


def alias_key(alias: str) -> tuple[bool, str]:
    """An alias as the matcher sees it: (is a phrase, key). A word is matched by its stem, a phrase as text."""
    a = alias.lower().replace("ё", "е")
    return (True, a) if " " in a or "-" in a else (False, stem(a))


class Vocabulary:
    """Alias -> [(facet, value)], with multi-word aliases matched as phrases."""

    def __init__(self, tax: dict):
        self.tax = tax
        self.single: dict[str, set[tuple[str, str]]] = defaultdict(set)
        self.phrases: list[tuple[str, tuple[str, str]]] = []
        # Phrases whose words mean something else on their own ("hand drawn" is not a hand): cut out of
        # the text once the phrase aliases have matched, before the words are looked up.
        self.masks = [m.lower().replace("ё", "е") for m in tax.get("masks", [])]
        for facet, f in tax["facets"].items():
            for value, v in f["values"].items():
                for alias in v.get("aliases", []):
                    is_phrase, key = alias_key(alias)
                    if is_phrase:
                        self.phrases.append((key, (facet, value)))
                    else:
                        self.single[key].add((facet, value))

    def facets_of(self, text: str) -> tuple[set[tuple[str, str]], list[str]]:
        t = text.lower().replace("ё", "е")
        hits: set[tuple[str, str]] = set()
        for phrase, fv in self.phrases:
            if phrase in t:
                hits.add(fv)
        for mask in self.masks:
            t = t.replace(mask, " ")
        unknown = []
        for w in re.findall(r"[\w]+", t, re.U):
            got = self.single.get(stem(w))
            if got:
                hits |= got
            elif len(w) > 2 and not w.isdigit():
                unknown.append(w)
        return hits, unknown


def slot_index(path: str | None) -> tuple[dict[str, list[str]], dict[str, str], str]:
    """fallback emoji -> slot ids, slot -> group, and the vocabulary version."""
    if not path or not os.path.isfile(path):
        return {}, {}, "none"
    d = load_json(path)
    by_emoji: dict[str, list[str]] = defaultdict(list)
    group = {}
    for slot, s in d["slots"].items():
        group[slot] = s["group"]
        for u in s.get("unicode") or []:
            by_emoji[VS.sub("", u)].append(slot)
    return by_emoji, group, f"{d.get('version', '?')}/{d.get('checked', '?')}"


# ------------------------------------------------------------------ pixels
def colour_family(r: int, g: int, b: int) -> str:
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    h *= 360
    if v < 0.18:
        return "black"
    if s < 0.16:
        return "white" if v > 0.86 else "gray"
    if 33 <= h < 52 and s > 0.45 and v < 0.85:
        return "gold"
    if 15 <= h < 45 and v < 0.6:
        return "brown"
    if h < 15 or h >= 345:
        return "red"
    if h < 40:
        return "orange"
    if h < 66:
        return "yellow"
    if h < 160:
        return "green"
    if h < 195:
        return "teal"
    if h < 258:
        return "blue"
    if h < 290:
        return "purple"
    return "pink"


def luminance(r: int, g: int, b: int) -> float:
    def ch(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


DARK_BG = luminance(0x21, 0x21, 0x21)  # a dark Telegram chat background; light is white


def measure_cell(img, i: int) -> dict | None:
    """Colour families, palette and visibility of one cell of a contact sheet (layout of emoji_sheets.py)."""
    cell, cols, label = 92, 12, 18
    x0, y0 = (i % cols) * cell + 2, (i // cols) * cell + 2
    px = img.load()
    fam: Counter = Counter()
    sat, light_ok, dark_ok, n = [], 0, 0, 0
    xs, ys = [], []
    for y in range(y0, y0 + cell - label - 4, 2):
        for x in range(x0, x0 + cell - 4, 2):
            r, g, b = px[x, y][:3]
            if abs(r - 214) + abs(g - 214) + abs(b - 218) < 30:
                continue  # the cell's grey background
            n += 1
            xs.append(x)
            ys.append(y)
            fam[colour_family(r, g, b)] += 1
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s >= 0.16 and v >= 0.18:
                sat.append((s, v))
            lum = luminance(r, g, b)
            light_ok += (1.05 / (lum + 0.05)) >= 1.6
            dark_ok += ((lum + 0.05) / (DARK_BG + 0.05)) >= 1.6
    if n < 25:
        return None  # no picture in the sheet (an animated emoji without a thumbnail)
    shares = {k: c / n for k, c in fam.items()}
    chroma = [k for k, s in shares.items() if s >= 0.1 and k not in ("black", "white", "gray")]
    if not chroma:
        palette = "monochrome"
    elif len(chroma) >= 3:
        palette = "multicolor"
    else:
        ms = sum(s for s, _ in sat) / len(sat) if sat else 0
        mv = sum(v for _, v in sat) / len(sat) if sat else 0
        palette = "vivid" if ms > 0.55 and mv > 0.5 else "muted"
    lf, df = light_ok / n, dark_ok / n
    fit = "both" if lf >= 0.3 and df >= 0.3 else "light" if lf >= 0.3 else "dark"
    clarity = max(abs(lf - 0.3), abs(df - 0.3))
    # Ink over the picture's bounding box (pixels sampled every 2): a line icon leaves most of its box
    # empty, a solid glyph fills it.
    box = ((max(xs) - min(xs)) // 2 + 1) * ((max(ys) - min(ys)) // 2 + 1)
    return {"shares": shares, "palette": palette, "fit": fit, "fit_conf": round(min(0.95, 0.6 + clarity), 2),
            "fill": round(n / box, 2)}


def sheet_titles(dirs: list[str]) -> dict[str, str]:
    """Pack title from each contact sheet's metadata (<Pack>.json beside the PNG); the first folder wins."""
    titles: dict[str, str] = {}
    for d in dirs:
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if not f.endswith(".json") or f.count(".") != 1:
                continue
            try:
                title = load_json(os.path.join(d, f)).get("title")
            except (OSError, ValueError):
                continue
            if isinstance(title, str) and title.strip():
                titles.setdefault(f[:-5].lower(), title.strip())
    return titles


def measure_sheets(dirs: list[str]) -> dict[str, dict[str, dict]]:
    """pack name (lower) -> emoji id -> measurement. The first folder with a pack's sheet wins; a fill sheet
    (<pack>.fill.png, emoji_sheets.py --gaps) then measures the emoji that sheet left empty."""
    out: dict[str, dict[str, dict]] = {}
    try:
        from PIL import Image
    except ImportError:
        print("Pillow is missing: colours are taken from words only", file=sys.stderr)
        return out

    def cells_of(d: str, f: str) -> dict[str, dict]:
        raw = load_json(os.path.join(d, f))
        cells = raw["emoji"] if isinstance(raw.get("emoji"), dict) else raw  # newer sheets nest the index
        img = Image.open(os.path.join(d, f[:-5] + ".png")).convert("RGB")
        got = {}
        for num, (eid, _fb) in cells.items():
            m = measure_cell(img, int(num) - 1)
            if m:
                got[str(eid)] = m
        return got

    sheets = [(d, f) for d in dirs if os.path.isdir(d) for f in sorted(os.listdir(d))
              if f.endswith(".json") and os.path.isfile(os.path.join(d, f[:-5] + ".png"))]
    for d, f in sheets:
        if not f.endswith(".fill.json") and f.lower()[:-5] not in out:
            out[f.lower()[:-5]] = cells_of(d, f)
    for d, f in sheets:
        if f.endswith(".fill.json"):
            got = out.setdefault(f.lower()[: -len(".fill.json")], {})
            for eid, m in cells_of(d, f).items():
                got.setdefault(eid, m)
    return out


# ------------------------------------------------------------------ scoring
class Scores:
    """facet -> value -> (confidence, sources)."""

    def __init__(self):
        self.d: dict[str, dict[str, list]] = defaultdict(dict)

    def add(self, facet: str, value: str, conf: float, source: str):
        cur = self.d[facet].get(value)
        if cur is None:
            self.d[facet][value] = [round(conf, 2), {source}]
        else:  # two sources agree: more sure, never above 1
            cur[0] = round(min(1.0, max(cur[0], conf) + 0.1 * (source not in cur[1])), 2)
            cur[1].add(source)

    def drop(self, facet: str, value: str):
        self.d.get(facet, {}).pop(value, None)

    def compact(self, threshold: float, limits: dict[str, int], skip_sources: frozenset = frozenset(),
                prefer: dict[str, str] | None = None) -> dict[str, list]:
        """Tags at or above `threshold`, best first. Ties are broken the same way on every run: the
        `prefer` value of a facet (the pack's hand-kept category for topic), then alphabetical order."""
        out = {}
        prefer = prefer or {}
        for facet in sorted(self.d):
            vals = self.d[facet]
            kept = sorted(((v, c) for v, (c, src) in vals.items() if c >= threshold and not src <= skip_sources),
                          key=lambda x: (-x[1], x[0] != prefer.get(facet), x[0]))
            if kept:
                out[facet] = [[v, c] for v, c in kept[: limits.get(facet, 3)]]
        return out


LIMITS_EMOJI = {"color": 2, "palette": 1, "fit": 1, "style": 2, "topic": 2, "mood": 1, "role": 1, "meaning": 2}
LIMITS_PACK = {"color": 3, "palette": 1, "fit": 1, "motion": 2, "style": 2, "topic": 3, "mood": 2, "role": 4, "use": 4}


def parse_overrides(path: str, tax: dict) -> tuple[dict[str, list[tuple[str, str, str]]], list[str]]:
    out: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    errors = []
    if not os.path.isfile(path):
        return out, errors
    for n, raw in enumerate(open(path, encoding="utf-8"), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z0-9_]{1,64}(?:/\d{1,20})?)\s+([a-z]+)\s*:\s*(.+)$", line)
        if not m:
            errors.append(f"overrides line {n}: expected `<pack>[/<id>] <facet>: +value, -value`")
            continue
        key, facet, ops = m.group(1).lower(), m.group(2), m.group(3)
        if facet not in tax["facets"] and facet != "meaning":
            errors.append(f"overrides line {n}: unknown facet {facet!r}")
            continue
        for op in [o.strip() for o in ops.split(",") if o.strip()]:
            sign, value = op[0], op[1:].strip()
            if sign not in "+-" or (facet != "meaning" and value not in tax["facets"][facet]["values"]):
                errors.append(f"overrides line {n}: {op!r} is not +value or -value of {facet}")
                continue
            out[key].append((sign, facet, value))
    return out, errors


def apply_overrides(scores: Scores, ops: list[tuple[str, str, str]]):
    for sign, facet, value in ops:
        if sign == "-":
            scores.drop(facet, value)
        else:
            scores.d[facet][value] = [1.0, {"manual"}]


def style_card_errors(doc: dict, tax: dict, listed: set[str]) -> list[str]:
    """Problems in emoji-pack-styles.json: a card per listed pack, taxonomy styles, the look enums."""
    errors = []
    styles = tax["facets"]["style"]["values"]
    by_lower = {n.lower() for n in listed}
    for name, card in (doc.get("packs") or {}).items():
        at = f"emoji-pack-styles.json: {name}"
        if name.lower() not in by_lower:
            errors.append(f"{at}: not in emoji-packs.txt")
        if not isinstance(card, dict):
            errors.append(f"{at}: card must be an object")
            continue
        errors += [f"{at}: unknown field {k!r}" for k in sorted(set(card) - CARD_FIELDS)]
        style = card.get("style")
        if not isinstance(style, list) or not 1 <= len(style) <= 2 or len(set(style)) != len(style):
            errors.append(f"{at}: style must be 1-2 style ids")
        else:
            errors += [f"{at}: unknown style {v!r}" for v in style if v not in styles]
        for key, allowed in LOOK.items():
            if card.get(key) not in allowed:
                errors.append(f"{at}: {key} must be one of {', '.join(sorted(allowed))}")
        if not isinstance(card.get("drawn"), str) or not card["drawn"].strip() or len(card["drawn"]) > 120:
            errors.append(f"{at}: drawn must be one line of at most 120 characters")
        conf = card.get("confidence")
        if not isinstance(conf, (int, float)) or not 0 < conf <= 1:
            errors.append(f"{at}: confidence must be in (0, 1]")
        if card.get("source") != "vision":
            errors.append(f"{at}: source must be \"vision\"")
    return errors


def pending_hint(name: str) -> str:
    """Where the missing look card and description of a pack come from."""
    item = os.path.join(PENDING, f"{name}.json")
    if os.path.isfile(item):
        return (f"fill {os.path.relpath(item, ROOT)} from its contact sheet, then run "
                "`py -3 scripts/emoji_taxonomy.py apply-pending`")
    return f"run `py -3 scripts/emoji_taxonomy.py add {name}` for a work item, fill it, then run `apply-pending`"


def missing_card_errors(doc: dict, listed: set[str]) -> list[str]:
    """Listed packs without a look card (build works without one; check does not)."""
    have = {n.lower() for n in doc.get("packs") or {}}
    return [f"emoji-pack-styles.json: {n}: no look card; {pending_hint(n)}" for n in sorted(listed) if n.lower() not in have]


def description_errors(doc: dict, listed: set[str]) -> list[str]:
    """Problems in emoji-pack-descriptions.json: every listed pack described in en/ru/uk, plain and short."""
    errors = []
    packs = doc.get("packs") or {}
    by_lower = {n.lower() for n in packs}
    errors += [f"emoji-pack-descriptions.json: {n}: no description; {pending_hint(n)}"
               for n in sorted(listed) if n.lower() not in by_lower]
    known = {n.lower() for n in listed}
    for name, desc in packs.items():
        at = f"emoji-pack-descriptions.json: {name}"
        if name.lower() not in known:
            errors.append(f"{at}: not in emoji-packs.txt")
        for lang in DESC_LANGS:
            part = desc.get(lang) if isinstance(desc, dict) else None
            if not isinstance(part, dict):
                errors.append(f"{at}: {lang} missing")
                continue
            errors += [f"{at}: {lang} unknown field {k!r}" for k in sorted(set(part) - set(DESC_LIMITS))]
            for field, limit in DESC_LIMITS.items():
                text = part.get(field)
                where = f"{at}: {lang}.{field}"
                if not isinstance(text, str) or not text.strip():
                    errors.append(f"{where} is empty")
                    continue
                if len(text) > limit:
                    errors.append(f"{where} is {len(text)} characters, at most {limit}")
                low = text.lower()
                if any(re.search(r"(?<!\w)" + w, low) for w in MARKETING):
                    errors.append(f"{where} has a marketing word: {text}")
                if "!" in text:
                    errors.append(f"{where} has an exclamation mark")
    return errors


def stale_descriptions(curated: dict, out: dict) -> list[str]:
    """Packs whose generated description no longer equals the curated one: the site would show old text."""
    generated = {k.lower(): v.get("description") for k, v in (out.get("packs") or {}).items()}
    return [f"{name}: description in emoji-facets.json differs from emoji-pack-descriptions.json (run build)"
            for name, desc in (curated.get("packs") or {}).items()
            if name.lower() in generated and generated[name.lower()] != desc]


def apply_style_card(p: "Scores", card: dict) -> None:
    """The look card of the vision pass: its styles at up to 0.9 (second one 0.1 lower). A sure card drops
    the styles that only the pack's words or its emoji suggested; an unsure one only adds."""
    conf = min(SOURCE["vision"], float(card.get("confidence", SOURCE["vision"])))
    wanted = card.get("style", [])[:2]
    if conf >= SURE_CARD:
        for value in [v for v in p.d.get("style", {}) if v not in wanted]:
            del p.d["style"][value]
    for i, value in enumerate(wanted):
        p.add("style", value, round(conf - 0.1 * i, 2), "vision")


def default_mood(s: "Scores") -> str | None:
    """"serious" for an emoji with no emotional cue whose leading topic is neutral (an interface icon, a
    brand, a letter), or that repaints in the text colour and is not a face, a character or a heart. Those
    keep no mood rather than a wrong one."""
    topics = s.d.get("topic", {})
    adaptive = "adaptive" in s.d.get("fit", {})
    if not topics:
        return "serious" if adaptive else None
    lead = max(topics.items(), key=lambda kv: (kv[1][0], kv[0]))[0]
    if lead in NEUTRAL_TOPICS or (adaptive and lead not in EXPRESSIVE_TOPICS):
        return "serious"
    return None


def finish_pack(p: "Scores", ops: list, uses: dict, role_count: Counter) -> None:
    """Hand corrections to the pack's own tags first, then the bot uses derived from them, then corrections
    to the uses themselves: a corrected topic must change the use it implied."""
    apply_overrides(p, [o for o in ops if o[1] != "use"])
    for use, score in use_scores(uses, role_count, p).items():
        if score >= 0.45:
            p.add("use", use, score, "rules")
    apply_overrides(p, [o for o in ops if o[1] == "use"])


def use_scores(uses: dict, role_count: Counter, p: "Scores") -> dict[str, float]:
    """How well a pack suits each kind of bot (the `use` facet), by the rule in the taxonomy's facets.use.rule:
    topic x role coverage x lead x look, halved for an avoided topic. `role_count` holds the distinct interface
    meanings per role (from the fallbacks: 26 letters that share one fallback are one meaning)."""
    def conf(facet: str, floor: float) -> dict[str, float]:
        return {v: c for v, (c, _) in p.d.get(facet, {}).items() if c >= floor}

    have = {"topics": conf("topic", 0.5), "styles": conf("style", 0.4), "moods": conf("mood", 0.3)}
    roles = conf("role", 0.0)  # share of the pack's emoji tagged with the role, and the pack's own words
    out = {}
    for use, spec in uses.items():
        topic = max(have["topics"].get(t, 0.0) for t in spec["topics"]) if spec.get("topics") else 1.0
        covered = [max(min(1.0, role_count[r] / 3), roles.get(r, 0.0)) for r in spec.get("needs", [])]
        # the best covered need and the average count half each: a set of check marks is half a monitoring kit
        coverage = (max(covered) + sum(covered) / len(covered)) / 2 if covered else 1.0
        lead = roles.get(spec["lead"], 0.0) if spec.get("lead") else 1.0
        fits = [max(have[k].get(v, 0.0) for v in spec[k]) if have[k] else 0.5 for k in ("styles", "moods") if spec.get(k)]
        look = 0.8 + 0.2 * (sum(fits) / len(fits) if fits else 0.5)
        score = topic * coverage * lead * look
        if set(have["topics"]) & set(spec.get("avoid_topics", [])):
            score *= 0.5  # an icon pack that is also about letters, holidays or faces is decoration, not a toolbar
        out[use] = round(score, 2)
    return out


def build(args) -> int:
    tax = load_json(TAXONOMY)
    th = tax["thresholds"]
    vocab = Vocabulary(tax)
    tags = free_tags()
    slots_by_emoji, slot_group, slot_version = slot_index(args.slots)
    role_of_group = {g: r for r, v in tax["facets"]["role"]["values"].items() for g in v.get("slot_groups", [])}
    mood_of = {VS.sub("", ch): mood for mood, chars in FALLBACK_MOOD.items() for ch in chars}
    measured = measure_sheets(args.sheets or [])
    titles = sheet_titles(args.sheets or [])
    overrides, errors = parse_overrides(OVERRIDES, tax)
    cards = (load_json(STYLES) if os.path.isfile(STYLES) else {}).get("packs", {})
    errors += style_card_errors({"packs": cards}, tax, {n for n, _ in listed_packs()})
    descriptions = (load_json(DESCRIPTIONS) if os.path.isfile(DESCRIPTIONS) else {}).get("packs", {})
    descriptions = {k.lower(): v for k, v in descriptions.items()}
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 2
    cards = {k.lower(): v for k, v in cards.items()}
    unknown_words: Counter = Counter()
    report = {"packs": 0, "emoji": 0, "measured_emoji": 0, "packs_without_snapshot": [], "packs_without_sheet": [],
              "duplicate_free_tags": 0, "duplicate_emoji_ids": [], "overrides_applied": 0,
              "unmeasured": {},  # pack -> {id: [format, fallback]}: emoji_sheets.py --gaps draws them again
              "inputs": {"sheets": [os.path.abspath(d) for d in args.sheets or []],
                         "slots": os.path.abspath(args.slots) if args.slots else None}}
    seen_ids: dict[str, str] = {}
    out_packs, out_emoji, site_emoji = {}, {}, {}
    pack_vectors = {}
    for name, category in listed_packs():
        snap_path = os.path.join(SNAP, f"{name.lower()}.json")
        if not os.path.isfile(snap_path):
            report["packs_without_snapshot"].append(name)
            continue
        snap = load_json(snap_path)
        emoji = [e for e in snap.get("emoji", []) if isinstance(e, dict) and str(e.get("id", "")).isdigit()]
        if not emoji:
            continue
        meas = measured.get(name.lower(), {})
        if not meas:
            report["packs_without_sheet"].append(name)
        per_emoji: dict[str, Scores] = {}
        for e in emoji:
            eid = str(e["id"])
            if eid in seen_ids and seen_ids[eid] != name:
                report["duplicate_emoji_ids"].append(f"{eid}: {seen_ids[eid]}, {name}")
            seen_ids[eid] = name
            s = Scores()
            fmt = e.get("format") if e.get("format") in ("static", "animated", "video") else "static"
            s.add("motion", fmt, 1.0, "telegram")
            m = meas.get(eid)
            if e.get("adaptive"):
                s.add("fit", "adaptive", 1.0, "telegram")
            elif m:
                s.add("fit", m["fit"], m["fit_conf"], "pixels")
            if not m:
                report["unmeasured"].setdefault(name, {})[eid] = [fmt, e.get("fallback") or ""]
            else:
                report["measured_emoji"] += 1
                for fam, share in sorted(m["shares"].items(), key=lambda x: -x[1]):
                    if share >= 0.18 and not (e.get("adaptive") and fam in ("black", "white", "gray")):
                        s.add("color", fam, min(0.95, 0.5 + share), "pixels")
                s.add("palette", m["palette"], 0.8, "pixels")
                if m["palette"] == "monochrome" or e.get("adaptive"):  # one-colour icons only: shapes, not shading
                    if m["fill"] < 0.3:
                        s.add("style", "outline", 0.6, "pixels")
                    elif m["fill"] > 0.6:
                        s.add("style", "glyph", 0.6, "pixels")
            words = tags.get(f"{name.lower()}/{eid}", [])
            report["duplicate_free_tags"] += len(words) - len(set(words))
            hits, unknown = vocab.facets_of(", ".join(words))
            unknown_words.update(unknown)
            for facet, value in sorted(hits):
                if facet in ("motion", "fit"):
                    continue
                s.add(facet, value, SOURCE["words"], "words")
            fb = VS.sub("", e.get("fallback") or "")
            for slot in slots_by_emoji.get(fb, [])[:2]:
                s.add("meaning", slot, SOURCE["fallback"], "fallback")
                role = role_of_group.get(slot_group.get(slot, ""))
                if role:
                    s.add("role", role, SOURCE["fallback"], "fallback")
            if fb in mood_of:
                s.add("mood", mood_of[fb], SOURCE["fallback"], "fallback")
            apply_overrides(s, overrides.get(f"{name.lower()}/{eid}", []))
            report["overrides_applied"] += len(overrides.get(f"{name.lower()}/{eid}", []))
            per_emoji[eid] = s
        # pack: the share of its emoji that carry a value, the pack's own words and its category
        p = Scores()
        n = len(per_emoji)
        sums: dict[tuple[str, str], float] = defaultdict(float)
        for s in per_emoji.values():
            for facet, vals in s.d.items():
                for value, (c, _) in vals.items():
                    sums[(facet, value)] += c
        for (facet, value), total in sums.items():
            share = total / n
            if facet in ("color", "palette", "fit", "motion"):
                p.add(facet, value, share, "aggregate")
            elif facet != "meaning":
                p.add(facet, value, min(1.0, share * 1.6), "aggregate")
        hits, unknown = vocab.facets_of(", ".join(tags.get(name.lower(), [])))
        unknown_words.update(unknown)
        for facet, value in sorted(hits):
            if facet not in ("motion", "fit"):
                p.add(facet, value, 0.8, "words")
        if category in CATEGORY_TOPIC:
            p.add("topic", CATEGORY_TOPIC[category], SOURCE["category"], "category")
        card = cards.get(name.lower())
        if card:
            apply_style_card(p, card)
        # an emoji with no style or topic of its own takes the pack's (a pack is drawn in one hand)
        for s in per_emoji.values():
            for facet in ("style", "topic"):
                if not s.d.get(facet):
                    for value, (c, _) in p.d.get(facet, {}).items():
                        if c >= 0.5:
                            s.add(facet, value, round(c * 0.8, 2), "pack")
        # Defaults the taxonomy defines: an emoji with no emotional cue in a neutral topic, or one that
        # repaints in the text colour (an interface icon), reads as "serious"; one with no interface meaning
        # is "decoration". Low confidence, so any real signal wins.
        for s in per_emoji.values():
            mood = None if s.d.get("mood") else default_mood(s)
            if mood:
                s.add("mood", mood, 0.55, "default")
            if not s.d.get("role"):
                s.add("role", "decoration", 0.5, "default")
        meanings = {v for s in per_emoji.values() for v in s.d.get("meaning", {})}
        # Distinct interface meanings per role (from the fallback's slots), not emoji: 26 letters that share
        # one fallback are one meaning, not broad coverage.
        role_count = Counter(role_of_group.get(slot_group.get(m, ""), "") for m in meanings)
        finish_pack(p, overrides.get(name.lower(), []), tax["facets"]["use"]["values"], role_count)
        report["overrides_applied"] += len(overrides.get(name.lower(), []))
        out_packs[name] = {"category": category, "title": titles.get(name.lower(), ""), "count": n, "meanings": len(meanings),
                           "facets": p.compact(th["pack"], LIMITS_PACK, prefer={"topic": CATEGORY_TOPIC.get(category, "")})}
        if name.lower() in descriptions:  # what it is, what it suits, where it fits badly (en/ru/uk)
            out_packs[name]["description"] = descriptions[name.lower()]
        if card:  # how the pack is drawn, for descriptions and the API
            out_packs[name]["look"] = {k: card[k] for k in ("line_weight", "fill", "perspective", "shadows", "characters",
                                                            "drawn")}
        prefer = {"topic": CATEGORY_TOPIC.get(category, "")}
        out_emoji[name] = {eid: s.compact(th["emoji"], LIMITS_EMOJI, prefer=prefer) for eid, s in per_emoji.items()}
        site_emoji[name] = {eid: encode(s.compact(th["emoji"], LIMITS_EMOJI, frozenset({"pack"}), prefer=prefer))
                            for eid, s in per_emoji.items()}
        vec = {}
        for facet, weight in (("style", 1.0), ("palette", 0.6), ("color", 0.5), ("motion", 0.6), ("fit", 0.8)):
            for value, (c, _) in p.d.get(facet, {}).items():
                vec[f"{facet}:{value}"] = c * weight
        pack_vectors[name] = vec
        report["packs"] += 1
        report["emoji"] += n
    # compatibility: packs drawn alike (style, palette, colours, motion, theme fit) mix well
    for a, va in pack_vectors.items():
        na = math.sqrt(sum(x * x for x in va.values())) or 1
        sims = []
        for b, vb in pack_vectors.items():
            if a == b:
                continue
            nb = math.sqrt(sum(x * x for x in vb.values())) or 1
            sim = sum(va[k] * vb.get(k, 0) for k in va) / (na * nb)
            if sim >= 0.75:
                sims.append((round(sim, 2), b))
        out_packs[a]["compatible"] = [[b, sim] for sim, b in sorted(sims, reverse=True)[:6]]
    head = {"format": "emoji-facets/v1", "taxonomy": tax["version"], "slots": slot_version,
            "generated": time.strftime("%Y-%m-%d"), "thresholds": th, "packs": out_packs}
    os.makedirs(WORK, exist_ok=True)
    with open(FULL, "w", encoding="utf-8") as fh:
        json.dump({**head, "emoji": out_emoji}, fh, ensure_ascii=False, separators=(",", ":"))
    # The site's copy: per emoji one string, "c:blue@9,white@6;s:outline@6" (confidence x10). Motion and
    # "adaptive" are in Telegram's data already, meanings come from the fallback; style and topic an
    # emoji only inherits from its pack are read from the pack (lib/emoji-facets.ts).
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump({**head, "emojiFormat": "facet-codes/v1", "codes": CODE, "emoji": site_emoji}, fh,
                  ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        fh.write("\n")
    report["unknown_words_top"] = unknown_words.most_common(200)
    report["coverage"] = coverage(out_packs, out_emoji)
    os.makedirs(WORK, exist_ok=True)
    with open(os.path.join(WORK, "report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    shown = {k: len(v) if isinstance(v, list) else v for k, v in report.items()
             if k not in ("unknown_words_top", "unmeasured", "inputs")}
    print(json.dumps(shown, ensure_ascii=False))
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) // 1024} KB)")
    return 0


def encode(facets: dict[str, list]) -> str:
    parts = []
    for facet, code in CODE.items():
        vals = [(v, c) for v, c in facets.get(facet, []) if not (facet == "fit" and v == "adaptive")]
        if vals:
            parts.append(code + ":" + ",".join(f"{v}@{round(c * 10)}" for v, c in vals))
    return ";".join(parts)


def coverage(packs: dict, emoji: dict) -> dict:
    out = {}
    for facet in ("color", "palette", "fit", "style", "topic", "mood", "role", "meaning"):
        total = sum(len(v) for v in emoji.values())
        has = sum(1 for v in emoji.values() for e in v.values() if facet in e)
        out[f"emoji.{facet}"] = round(has / max(1, total), 3)
    for facet in ("color", "fit", "motion", "style", "topic", "mood", "role", "use"):
        out[f"pack.{facet}"] = round(sum(1 for p in packs.values() if facet in p["facets"]) / max(1, len(packs)), 3)
    return out


# ------------------------------------------------------------------ fetch, eval, check
def fetch_pack(base: str, name: str) -> dict | None:
    """The site's /api/emoji-pack/<name> answer (it waits out a 429), or {"ok": false, ...} or None."""
    for _ in range(4):
        try:
            req = urllib.request.Request(f"{base.rstrip('/')}/api/emoji-pack/{name}", headers={"User-Agent": "emoji-taxonomy"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 429:
                time.sleep(int(err.headers.get("Retry-After") or 60))
                continue
            try:
                return {"ok": False, "status": err.code, **json.loads(err.read().decode("utf-8"))}
            except ValueError:
                return {"ok": False, "status": err.code}
        except (urllib.error.URLError, TimeoutError, ValueError):
            time.sleep(5)
    return None


def write_snapshot(name: str, body: dict) -> None:
    os.makedirs(SNAP, exist_ok=True)
    with open(os.path.join(SNAP, f"{name.lower()}.json"), "w", encoding="utf-8") as fh:
        json.dump({"name": body.get("name"), "emoji": [{k: e.get(k) for k in ("id", "fallback", "format", "adaptive")}
                                                      for e in body.get("emoji", [])]}, fh, ensure_ascii=False)


def fetch(args) -> int:
    os.makedirs(SNAP, exist_ok=True)
    todo = [n for n, _ in listed_packs() if args.force or not os.path.isfile(os.path.join(SNAP, f"{n.lower()}.json"))]
    print(f"{len(todo)} pack(s) to fetch", file=sys.stderr)
    for i, name in enumerate(todo, 1):
        body = fetch_pack(args.base, name)
        if body and body.get("ok"):
            write_snapshot(name, body)
        else:
            print(f"skip {name}: {body}", file=sys.stderr)
        if i % 25 == 0:
            print(f"{i}/{len(todo)}", file=sys.stderr)
        time.sleep(args.delay)
    return 0


GOLD_V2 = os.path.join(ROOT, "scripts", "emoji_taxonomy_gold_v2.json")
GATE = os.path.join(ROOT, "scripts", "emoji_taxonomy_gate.json")
DECODE = {v: k for k, v in CODE.items()}
PACK_FACETS = ("style", "color", "palette", "topic", "mood", "fit", "use")
EMOJI_FACETS = ("color", "style", "topic", "mood", "role")


def decode(code: str) -> dict[str, list]:
    """One emoji of the site output ("c:blue@9,white@6;s:outline@6") back to facet -> [[value, confidence]]."""
    out: dict[str, list] = {}
    for part in filter(None, (code or "").split(";")):
        key, _, vals = part.partition(":")
        if key in DECODE:
            out[DECODE[key]] = [[v, int(c) / 10] for v, c in (x.split("@", 1) for x in vals.split(",") if "@" in x)]
    return out


def site_view(doc: dict) -> dict:
    """The committed site output read like facets-full.json, so CI can evaluate without the sheets: emoji codes
    decoded, and the style and topic an emoji only inherits from its pack filled in the way the build does
    (pack values of at least 0.5, times 0.8)."""
    emoji: dict[str, dict] = {}
    for name, entries in doc.get("emoji", {}).items():
        pack = (doc.get("packs", {}).get(name) or {}).get("facets", {})
        emoji[name] = {}
        for eid, code in entries.items():
            e = decode(code) if isinstance(code, str) else dict(code)
            for facet in ("style", "topic"):
                if not e.get(facet):
                    inherited = [[v, round(c * 0.8, 2)] for v, c in pack.get(facet, []) if c >= 0.5]
                    if inherited:
                        e[facet] = inherited
            emoji[name][eid] = e
    return {"packs": doc.get("packs", {}), "emoji": emoji}


def split_gold(gold: dict, split: str) -> dict:
    """tune = the first gold pack of each category, holdout = the rest."""
    if split == "all":
        return gold
    first: dict[str, str] = {}
    for name, cat in listed_packs():
        if name in gold.get("packs", {}) and cat not in first:
            first[cat] = name
    keep = set(first.values()) if split == "tune" else set(gold.get("packs", {})) - set(first.values())
    return {"packs": {k: v for k, v in gold["packs"].items() if k in keep},
            "emoji": {k: v for k, v in gold.get("emoji", {}).items() if k.split("/")[0] in keep}}


def _truth(g: dict, facet: str) -> set:
    v = g.get(facet)
    return set(v) if isinstance(v, list) else {v} if v else set()


def metrics(gold: dict, facets: dict, split: str = "all") -> dict:
    """Precision, recall and hit rate of the facets against hand labels; labels marked unsure are skipped."""
    gold = split_gold(gold, split)
    stats: dict[str, Counter] = defaultdict(Counter)

    def score(kind: str, facet: str, predicted: set, truth: set, unsure: bool):
        if not truth or unsure:
            return
        key = f"{kind}.{facet}"
        stats[key]["tp"] += len(predicted & truth)
        stats[key]["fp"] += len(predicted - truth)
        stats[key]["fn"] += len(truth - predicted)
        stats[key]["top1"] += bool(predicted) and next(iter(predicted)) in truth if len(predicted) == 1 else bool(predicted & truth)
        stats[key]["n"] += 1

    def top(entry: dict, facet: str, k: int) -> set:
        return {v for v, _ in (entry.get(facet) or [])[:k]}

    for name, g in gold.get("packs", {}).items():
        p = next((v for k, v in facets["packs"].items() if k.lower() == name.lower()), None)
        if p is None:
            continue
        for facet in PACK_FACETS:
            truth = _truth(g, facet)
            pred = top(p["facets"], facet, max(1, len(truth)))
            if facet == "fit":
                pred = {"both" if v == "adaptive" else v for v in pred}
            score("pack", facet, pred, truth, facet in g.get("unsure", []))
    for key, g in gold.get("emoji", {}).items():
        pack, eid = key.split("/", 1)
        packd = next((v for k, v in facets["emoji"].items() if k.lower() == pack.lower()), {})
        e = packd.get(eid)
        if e is None:
            continue
        for facet in EMOJI_FACETS:
            truth = _truth(g, facet)
            score("emoji", facet, top(e, facet, max(1, len(truth))), truth, facet in g.get("unsure", []))
    rows = {}
    for key, c in sorted(stats.items()):
        prec = c["tp"] / max(1, c["tp"] + c["fp"])
        rec = c["tp"] / max(1, c["tp"] + c["fn"])
        rows[key] = {"n": c["n"], "precision": round(prec, 2), "recall": round(rec, 2),
                     "hit_rate": round(c["top1"] / max(1, c["n"]), 2)}
    return rows


def agreement(gold: dict) -> dict:
    """How often the second blind labeler shares at least one value with the first, per facet."""
    second = gold.get("second") or {}
    counts: dict[str, Counter] = defaultdict(Counter)
    for kind, facets in (("packs", PACK_FACETS), ("emoji", EMOJI_FACETS)):
        for key, b in (second.get(kind) or {}).items():
            a = gold.get(kind, {}).get(key)
            if not a:
                continue
            for facet in facets:
                ta, tb = _truth(a, facet), _truth(b, facet)
                if not ta or not tb or facet in a.get("unsure", []) or facet in b.get("unsure", []):
                    continue
                name = f"{kind[:-1] if kind == 'packs' else kind}.{facet}"
                counts[name]["n"] += 1
                counts[name]["agree"] += bool(ta & tb)
    return {k: {"n": c["n"], "agree": round(c["agree"] / c["n"], 2)} for k, c in sorted(counts.items())}


def gate_failures(rows: dict, floor: dict) -> list[str]:
    out = []
    for metric, mins in floor.items():
        if metric not in rows:
            out.append(f"{metric}: no result (gold or output lost?)")
            continue
        out += [f"{metric} {k} {rows[metric][k]} < {m}" for k, m in mins.items() if rows[metric][k] < m - 1e-9]
    return out


def _facets_for_eval(from_site: bool) -> dict:
    if from_site or not os.path.isfile(FULL):
        return site_view(load_json(OUT))
    return load_json(FULL)


def evaluate(args) -> int:
    """Precision and recall of the facets against hand labels (gold v2 by default)."""
    gold = load_json(args.gold)
    rows = metrics(gold, _facets_for_eval(args.from_site), args.split)
    print(json.dumps(rows, indent=1))
    if args.agreement:
        print(json.dumps({"agreement": agreement(gold)}, indent=1))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, indent=1)
    return 0


def gate(write: bool = False) -> list[str]:
    """Holdout of gold v2 against the committed site output (what CI sees); the floor only rises by hand."""
    rows = metrics(load_json(GOLD_V2), site_view(load_json(OUT)), "holdout")
    if write:
        floor = {k: {"recall": v["recall"], "hit_rate": v["hit_rate"]} for k, v in rows.items()}
        with open(GATE, "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"$comment": "Accuracy floor per facet on the gold v2 holdout, measured on src/content/"
                                   "emoji-facets.json (`check --gate`). Raise it after an improvement with "
                                   "`check --write-gate`; never lower it to make a change pass.",
                       "gold": "scripts/emoji_taxonomy_gold_v2.json", "split": "holdout", "min": floor}, fh, indent=1)
            fh.write("\n")
        return []
    return gate_failures(rows, load_json(GATE)["min"]) if os.path.isfile(GATE) else ["no gate file: run check --write-gate"]


def taxonomy_errors(tax: dict) -> list[str]:
    errors = []
    masks = tax.get("masks", [])
    masks_ok = isinstance(masks, list) and all(isinstance(m, str) and m.strip() for m in masks)
    if not masks_ok:
        errors.append("masks must be a list of non-empty phrases")
    owners: dict[tuple[str, bool, str], dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    for facet, f in tax["facets"].items():
        for value, v in f["values"].items():
            if not v.get("en") or not v.get("ru"):
                errors.append(f"{facet}:{value} needs en and ru labels")
            for a in v.get("aliases", []):
                is_phrase, key = alias_key(a)
                owners[(facet, is_phrase, key)][value].append(a)
            if facet == "style":  # rubric for the labeling pass: what the style is and what it is not
                if not isinstance(v.get("definition"), str) or not v["definition"].strip():
                    errors.append(f"{facet}:{value} needs a definition")
                nots = v.get("not")
                if not isinstance(nots, list) or not nots or not all(isinstance(x, str) and x.strip() for x in nots):
                    errors.append(f"{facet}:{value} needs a `not` list of non-empty strings")
    if masks_ok:  # a phrase must not also match another value of its facet through its own words
        vocab = Vocabulary(tax)
        for facet, f in tax["facets"].items():
            for value, v in f["values"].items():
                for a in v.get("aliases", []):
                    if not alias_key(a)[0]:
                        continue
                    others = sorted(val for fct, val in vocab.facets_of(a)[0] if fct == facet and val != value)
                    if others:
                        errors.append(f"phrase alias {a!r} ({facet}:{value}) also matches "
                                      + ", ".join(f"{facet}:{o}" for o in others)
                                      + " through its words: add it to masks or drop the word alias")
    for (facet, _, _), by_value in owners.items():
        if len(by_value) > 1:
            spellings = sorted({a for words in by_value.values() for a in words})
            errors.append(f"alias {'/'.join(map(repr, spellings))} ({facet}) maps to two values of one facet: "
                          + ", ".join(f"{facet}:{v}" for v in sorted(by_value)))
    return errors


def check_errors() -> list[str]:
    """Everything `check` reports except the accuracy gate."""
    tax = load_json(TAXONOMY)
    _, errors = parse_overrides(OVERRIDES, tax)
    errors += taxonomy_errors(tax)
    listed = {n for n, _ in listed_packs()}
    if os.path.isfile(STYLES):
        styles = load_json(STYLES)
        errors += style_card_errors(styles, tax, listed) + missing_card_errors(styles, listed)
    if os.path.isfile(DESCRIPTIONS):
        errors += description_errors(load_json(DESCRIPTIONS), listed)
        if os.path.isfile(OUT):
            errors += stale_descriptions(load_json(DESCRIPTIONS), load_json(OUT))
    if os.path.isfile(OUT):
        doc = load_json(OUT)
        for name, p in doc["packs"].items():
            for facet, vals in p["facets"].items():
                if facet not in tax["facets"]:
                    errors.append(f"{name}: unknown facet {facet}")
                    continue
                for v, c in vals:
                    if v not in tax["facets"][facet]["values"] or not 0 <= c <= 1:
                        errors.append(f"{name}: {facet}:{v} ({c}) is not in the taxonomy or out of range")
    return errors


def check(args) -> int:
    errors = check_errors()
    if getattr(args, "write_gate", False):
        gate(write=True)
        print(f"wrote {os.path.relpath(GATE, ROOT)}")
    elif getattr(args, "gate", False):
        errors += [f"accuracy below the floor: {e}" for e in gate()]
    print("\n".join(errors) or "OK: taxonomy, overrides and facets consistent"
          + (" (accuracy at or above the floor)" if getattr(args, "gate", False) else ""))
    return 1 if errors else 0


# ------------------------------------------------------------------ add a pack, apply the vision pass
WORDS = re.compile(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])|[а-яёіїєґА-ЯЁІЇЄҐ]+")
BOT_SUFFIX = re.compile(r"_by_\w+$", re.I)
CARD_TEMPLATE = {"style": [], "line_weight": "", "fill": "", "perspective": "", "shadows": "", "characters": "",
                 "drawn": "", "confidence": None, "unsure": [], "source": "vision"}


def pack_name(arg: str) -> str | None:
    m = LINK.search(arg)
    name = m.group(1) if m else arg.strip().strip("/")
    return name if re.fullmatch(r"[A-Za-z0-9_]{1,64}", name) else None


def categories() -> list[str]:
    with open(PACKS, encoding="utf-8") as fh:
        return [raw.strip()[3:].strip() for raw in fh if raw.strip().startswith("## ")]


def suggest_category(name: str, title: str, tags: list[str]) -> tuple[str | None, list[str]]:
    """The category whose topic the pack's name, title and free tags name most often, and the words that named
    it. None when they name no category's topic: the caller then has to be told, never guessed for."""
    vocab = Vocabulary(load_json(TAXONOMY))
    by_topic = {t: c for c, t in CATEGORY_TOPIC.items()}
    chunks = WORDS.findall(BOT_SUFFIX.sub("", name)) + re.findall(r"[^\W\d_]+", title) + list(tags)
    votes: Counter = Counter()
    why: dict[str, list[str]] = defaultdict(list)
    for chunk in chunks:
        for facet, value in vocab.facets_of(chunk)[0]:
            if facet == "topic" and value in by_topic:
                votes[by_topic[value]] += 1
                why[by_topic[value]].append(chunk.lower())
    if not votes:
        return None, []
    order = categories()
    best = max(votes, key=lambda c: (votes[c], -order.index(c) if c in order else -99))
    return best, sorted(set(why[best]))


def interactive() -> bool:
    return sys.stdin.isatty()


def choose_category(given: str | None, suggestion: str | None, evidence: list[str]) -> str | None:
    cats = categories()
    by_lower = {c.lower(): c for c in cats}
    print(f"   suggested category: {suggestion} (from: {', '.join(evidence)})" if suggestion
          else "   no category suggested: the name, title and tags name no category's topic")
    if given:
        if given.strip().lower() in by_lower:
            return by_lower[given.strip().lower()]
        print(f"   unknown category {given!r}; one of: {'; '.join(cats)}")
        return None
    try:
        answer = input(f"   category [{suggestion or ''}]: ").strip() or (suggestion or "") if interactive() else None
    except EOFError:  # NUL on Windows passes for a terminal
        print()
        answer = None
    if answer is None:
        print(f"   confirm it: rerun with --category \"{suggestion or '<category>'}\" (one of: {'; '.join(cats)})")
        return None
    if answer.lower() in by_lower:
        return by_lower[answer.lower()]
    print(f"   unknown category {answer!r}; one of: {'; '.join(cats)}")
    return None


def add_to_list(name: str, category: str) -> None:
    """The link goes at the end of its category's block (the Popular row follows the order of the list)."""
    with open(PACKS, encoding="utf-8", newline="") as fh:
        text = fh.read()
    eol = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(eol)
    head = next(i for i, l in enumerate(lines) if l.strip() == f"## {category}")
    end = next((i for i in range(head + 1, len(lines)) if lines[i].strip().startswith("## ")), len(lines))
    last = max(i for i in range(head, end) if lines[i].strip())
    lines.insert(last + 1, f"https://t.me/addemoji/{name}")
    with open(PACKS, "w", encoding="utf-8", newline="") as fh:
        fh.write(eol.join(lines))


def make_sheet(base: str, name: str, out: str, body: dict) -> str:
    import emoji_sheets  # Pillow, and rlottie-python for a TGS without a thumbnail
    os.makedirs(out, exist_ok=True)
    return emoji_sheets.sheet(base.rstrip("/"), name, out, pack=body)


def find_sheet(name: str, dirs: list[str]) -> str | None:
    for d in dirs:
        if os.path.isdir(d):
            hit = next((f for f in os.listdir(d) if f.lower() == f"{name.lower()}.png"), None)
            if hit:
                return os.path.join(d, hit)
    return None


def build_inputs(args) -> tuple[list[str], str | None] | None:
    """The sheet folders and slots file of the last build (report.json), unless given: a build without them
    would drop every colour and meaning from the site output."""
    last = (load_json(os.path.join(WORK, "report.json")).get("inputs") or {}) \
        if os.path.isfile(os.path.join(WORK, "report.json")) else {}
    sheets = args.sheets or last.get("sheets")
    slots = args.slots or last.get("slots")
    if not sheets:
        return None
    if not any(os.path.abspath(d) == os.path.abspath(SHEETS_OUT) for d in sheets):
        sheets = [*sheets, SHEETS_OUT]
    return sheets, slots


def work_item(name: str, title: str, category: str, png: str) -> dict:
    """What the vision pass needs to write the look card and the en/ru/uk description of one pack."""
    tax = load_json(TAXONOMY)
    styles = (load_json(STYLES) if os.path.isfile(STYLES) else {}).get("packs", {})
    descs = (load_json(DESCRIPTIONS) if os.path.isfile(DESCRIPTIONS) else {}).get("packs", {})
    measured = (load_json(OUT)["packs"].get(name) if os.path.isfile(OUT) else None) or {}
    example = next((n for n, c in listed_packs() if c == category and n in styles and n in descs), None) \
        or next((n for n in styles if n in descs), None)
    return {
        "pack": name, "title": title, "category": category,
        "sheet": os.path.relpath(png, ROOT), "sheet_index": os.path.relpath(png[:-4] + ".json", ROOT),
        "measured": {k: measured[k] for k in ("count", "facets") if k in measured},
        "how": ["Open the sheet: every emoji of the pack on a numbered grid (an empty cell has no still picture).",
                "Fill `card` by rubric.card, with style ids from rubric.style and look values from rubric.look.",
                "Fill `description` by rubric.description in en, ru and uk; `measured` has the count and motion.",
                "Leave every other field as it is, then run: py -3 scripts/emoji_taxonomy.py apply-pending"],
        "rubric": {
            "card": "style: 1-2 ids from rubric.style, the leading one first, chosen by each style's definition "
                    "and `not` list. line_weight, fill, perspective, shadows, characters: one value each from "
                    "rubric.look. drawn: one line of at most 120 characters on how the pack is drawn. confidence "
                    f"in (0, 1]: how sure the style is ({SURE_CARD} or more replaces the styles guessed from words). "
                    "unsure: the field names the sheet does not settle. source stays \"vision\".",
            "style": {v: {"definition": s.get("definition"), "not": s.get("not")}
                      for v, s in tax["facets"]["style"]["values"].items()},
            "look": {k: sorted(v) for k, v in LOOK.items()},
            "description": {
                "languages": list(DESC_LANGS), "max_characters": DESC_LIMITS,
                "fields": {"what": "what the pack is: how many, what they show, how they are drawn",
                           "for": "the bots and messages it suits", "not_for": "where it fits badly"},
                "rules": "Plain words that describe, not sell: no exclamation marks and none of these stems: "
                         + ", ".join(MARKETING) + ". The ru and uk texts say what the en text says."},
        },
        "example": {"pack": example, "card": styles.get(example), "description": descs.get(example)} if example else None,
        "card": dict(CARD_TEMPLATE),
        "description": {lang: {"what": "", "for": "", "not_for": ""} for lang in DESC_LANGS},
    }


def has_curated(name: str) -> tuple[bool, bool]:
    def has(path: str) -> bool:
        return os.path.isfile(path) and name.lower() in {n.lower() for n in load_json(path).get("packs", {})}
    return has(STYLES), has(DESCRIPTIONS)


def add(args) -> int:
    """List a pack and run the whole chain; safe to repeat (every step keeps what it finds)."""
    name = pack_name(args.pack)
    if not name:
        print(f"{args.pack!r} is not t.me/addemoji/<name> or a pack name")
        return 2
    listed = {n.lower(): (n, c) for n, c in listed_packs()}
    body = None

    def site_pack() -> dict | None:
        nonlocal body
        if body is None:
            body = fetch_pack(args.base, name)
        if not body or not body.get("ok") or not body.get("emoji"):
            print(f"{name}: the site cannot read this pack: {body}")
            return None
        return body

    if name.lower() in listed:
        name, category = listed[name.lower()]
        print(f"1. list: {name} is already listed under {category}")
    else:
        if not site_pack():
            return 2
        name = body.get("name") or name
        print(f"1. list: {name} ({body.get('title')}, {len(body['emoji'])} emoji)")
        suggestion, evidence = suggest_category(name, body.get("title") or "", free_tags().get(name.lower(), []))
        category = choose_category(args.category, suggestion, evidence)
        if not category:
            return 2
        add_to_list(name, category)
        print(f"   added to {os.path.relpath(PACKS, ROOT)} under {category}")
    if os.path.isfile(os.path.join(SNAP, f"{name.lower()}.json")):
        print("2. snapshot: kept")
    else:
        if not site_pack():
            return 2
        write_snapshot(name, body)
        print(f"2. snapshot: {len(body['emoji'])} emoji")
    inputs = build_inputs(args)
    if not inputs:
        print("3. no sheet folders known: pass --sheets (and --slots) as for build once; later runs reuse them")
        return 2
    sheets, slots = inputs
    png = find_sheet(name, sheets)
    if png:
        print(f"3. sheet: kept {os.path.relpath(png, ROOT)}")
    else:
        if not site_pack():
            return 2
        print(f"3. sheet: {make_sheet(args.base, name, SHEETS_OUT, body)}")
        png = os.path.join(SHEETS_OUT, f"{name}.png")
    print("4. build")
    code = build(argparse.Namespace(sheets=sheets, slots=slots))
    if code:
        return code
    item = os.path.join(PENDING, f"{name}.json")
    if all(has_curated(name)):
        print("5. look card and description: present")
    elif os.path.isfile(item):
        print(f"5. work item: kept {os.path.relpath(item, ROOT)}")
    else:
        os.makedirs(PENDING, exist_ok=True)
        title = (body or {}).get("title") or name
        with open(item, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(work_item(name, title, category, png), fh, ensure_ascii=False, indent=1)
            fh.write("\n")
        print(f"5. work item: {os.path.relpath(item, ROOT)}")
    if not all(has_curated(name)):
        print(f"   The look card and the description need eyes on the sheet; this script has no model.\n"
              f"   Agent: open {os.path.relpath(png, ROOT)}, fill `card` and `description` in "
              f"{os.path.relpath(item, ROOT)} by its `rubric` (`example` shows the house style), then run\n"
              f"   py -3 scripts/emoji_taxonomy.py apply-pending")
    errors = check_errors()
    waiting = [e for e in errors if ": no look card; " in e or ": no description; " in e]  # any pack's vision pass
    others = [e for e in errors if e not in waiting]
    print("6. check: " + ("OK" if not errors else f"{len(waiting)} waiting for apply-pending, {len(others)} other"))
    for e in others + waiting:
        print("   " + e)
    return 1 if others else 0


def apply_pending(args) -> int:
    """Validate the filled work items and merge them into the two curated files; a bad item stays pending."""
    items = sorted(glob.glob(os.path.join(PENDING, "*.json")))
    if not items:
        print("nothing pending")
        return 0
    tax = load_json(TAXONOMY)
    listed = {n for n, _ in listed_packs()}
    styles, descs = load_json(STYLES), load_json(DESCRIPTIONS)
    applied, failed = [], 0
    for path in items:
        item = load_json(path)
        name = next((n for n in listed if n.lower() == str(item.get("pack", "")).lower()), item.get("pack"))
        card, desc = item.get("card"), item.get("description")
        errors = style_card_errors({"packs": {name: card}}, tax, listed) \
            + description_errors({"packs": {name: desc}}, {name})
        if errors:
            failed += 1
            print(f"{os.path.relpath(path, ROOT)}: not applied")
            print("\n".join("  " + e for e in dict.fromkeys(errors)))
            continue
        for doc, value in ((styles, {k: card[k] for k in CARD_TEMPLATE if k in card}), (descs, desc)):
            packs = {k: v for k, v in doc["packs"].items() if k.lower() != name.lower()}
            packs[name] = value
            doc["packs"] = dict(sorted(packs.items(), key=lambda kv: kv[0].lower()))
        applied.append((name, path))
    if applied:
        for path, doc in ((STYLES, styles), (DESCRIPTIONS, descs)):
            with open(path, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
        os.makedirs(DONE, exist_ok=True)
        for name, path in applied:
            os.replace(path, os.path.join(DONE, os.path.basename(path)))
            print(f"applied {name}: rebuild and check with `py -3 scripts/emoji_taxonomy.py add {name}`")
    return 1 if failed else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch")
    f.add_argument("--base", default="https://telegram-bot-ui.hlixli.com")
    f.add_argument("--delay", type=float, default=2.1, help="seconds between packs (the API allows 30 a minute)")
    f.add_argument("--force", action="store_true")
    b = sub.add_parser("build")
    b.add_argument("--sheets", action="append", help="contact sheet folder (repeatable)")
    b.add_argument("--slots", help="telegram-bot-ui data/emoji/slots.json (meanings and interface roles)")
    e = sub.add_parser("eval")
    e.add_argument("--gold", default=GOLD_V2, help="gold labels (default v2; v1 is scripts/emoji_taxonomy_gold.json)")
    e.add_argument("--out")
    e.add_argument("--split", choices=["all", "tune", "holdout"], default="all")
    e.add_argument("--from-site", action="store_true", help="evaluate the committed site output, as CI does")
    e.add_argument("--agreement", action="store_true", help="also print the two labelers' agreement")
    c = sub.add_parser("check")
    c.add_argument("--gate", action="store_true", help="also fail when accuracy falls below scripts/emoji_taxonomy_gate.json")
    c.add_argument("--write-gate", action="store_true", help="record the current holdout accuracy as the floor")
    n = sub.add_parser("add", help="list a pack and run the whole chain; safe to repeat")
    n.add_argument("pack", help="t.me/addemoji/<name> or the pack name")
    n.add_argument("--category", help="its ## category in emoji-packs.txt (asked when interactive)")
    n.add_argument("--base", default="https://telegram-bot-ui.hlixli.com")
    n.add_argument("--sheets", action="append", help="as for build; default: the last build's")
    n.add_argument("--slots", help="as for build; default: the last build's")
    sub.add_parser("apply-pending", help="merge filled work items into the look cards and descriptions")
    a = ap.parse_args(argv)
    return {"fetch": fetch, "build": build, "eval": evaluate, "check": check, "add": add,
            "apply-pending": apply_pending}[a.cmd](a)


if __name__ == "__main__":
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except (AttributeError, OSError):
            pass
    sys.exit(main())
