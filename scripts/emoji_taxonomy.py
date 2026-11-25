"""Faceted tags for the emoji library: every pack and every emoji, normalized, with a confidence.

    py -3 scripts/emoji_taxonomy.py fetch --base https://telegram-bot-ui.hlixli.com   # snapshot, ~30 packs/min
    py -3 scripts/emoji_taxonomy.py build --sheets .emoji-sheets --slots <skill>/data/emoji/slots.json
    py -3 scripts/emoji_taxonomy.py eval --gold gold.json                               # accuracy per facet
    py -3 scripts/emoji_taxonomy.py check                                               # overrides and output valid

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
OUT = os.path.join(CONTENT, "emoji-facets.json")
WORK = os.path.join(ROOT, ".emoji-taxonomy")
FULL = os.path.join(WORK, "facets-full.json")  # every tag with its sources, for eval and review
CODE = {"color": "c", "palette": "p", "fit": "f", "style": "s", "topic": "t", "mood": "m", "role": "r"}
SNAP = os.path.join(WORK, "snapshot")
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
NEUTRAL_TOPICS = {"interface", "status", "brands", "finance", "letters", "flags", "tech", "travel", "music", "office", "people", "symbols"}
SOURCE = {"telegram": 1.0, "manual": 1.0, "category": 0.9, "words": 0.75, "fallback": 0.6}


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
                    a = alias.lower().replace("ё", "е")
                    if " " in a or "-" in a:
                        self.phrases.append((a, (facet, value)))
                    else:
                        self.single[stem(a)].add((facet, value))

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


def measure_sheets(dirs: list[str]) -> dict[str, dict[str, dict]]:
    """pack name (lower) -> emoji id -> measurement."""
    out: dict[str, dict[str, dict]] = {}
    try:
        from PIL import Image
    except ImportError:
        print("Pillow is missing: colours are taken from words only", file=sys.stderr)
        return out
    for d in dirs:
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith(".json") or f.lower()[:-5] in out:
                continue
            png = os.path.join(d, f[:-5] + ".png")
            if not os.path.isfile(png):
                continue
            raw = load_json(os.path.join(d, f))
            cells = raw["emoji"] if isinstance(raw.get("emoji"), dict) else raw  # newer sheets nest the index
            img = Image.open(png).convert("RGB")
            got = {}
            for num, (eid, _fb) in cells.items():
                m = measure_cell(img, int(num) - 1)
                if m:
                    got[str(eid)] = m
            out[f.lower()[:-5]] = got
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


def build(args) -> int:
    tax = load_json(TAXONOMY)
    th = tax["thresholds"]
    vocab = Vocabulary(tax)
    tags = free_tags()
    slots_by_emoji, slot_group, slot_version = slot_index(args.slots)
    role_of_group = {g: r for r, v in tax["facets"]["role"]["values"].items() for g in v.get("slot_groups", [])}
    mood_of = {VS.sub("", ch): mood for mood, chars in FALLBACK_MOOD.items() for ch in chars}
    measured = measure_sheets(args.sheets or [])
    overrides, errors = parse_overrides(OVERRIDES, tax)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 2
    unknown_words: Counter = Counter()
    report = {"packs": 0, "emoji": 0, "measured_emoji": 0, "packs_without_snapshot": [], "packs_without_sheet": [],
              "duplicate_free_tags": 0, "duplicate_emoji_ids": [], "overrides_applied": 0}
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
            if m:
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
            topics_here = set(s.d.get("topic", {}))
            if not s.d.get("mood") and (topics_here & NEUTRAL_TOPICS or "adaptive" in s.d.get("fit", {})):
                s.add("mood", "serious", 0.55, "default")
            if not s.d.get("role"):
                s.add("role", "decoration", 0.5, "default")
        meanings = {v for s in per_emoji.values() for v in s.d.get("meaning", {})}
        # Distinct interface meanings per role (from the fallback's slots), not emoji: 26 letters that share
        # one fallback are one meaning, not broad coverage.
        role_count = Counter(role_of_group.get(slot_group.get(m, ""), "") for m in meanings)
        styles = {v for v, (c, _) in p.d.get("style", {}).items() if c >= 0.4}
        topics = {v for v, (c, _) in p.d.get("topic", {}).items() if c >= 0.5}
        moods = {v for v, (c, _) in p.d.get("mood", {}).items() if c >= 0.3}
        for use, spec in tax["facets"]["use"]["values"].items():
            needs = spec.get("needs", [])
            need_score = sum(min(1.0, role_count[r] / 3) for r in needs) / len(needs) if needs else 0.0
            extra = [bool(styles & set(spec.get("styles", []))), bool(topics & set(spec.get("topics", []))),
                     bool(moods & set(spec.get("moods", [])))]
            wanted = [k for k in ("styles", "topics", "moods") if spec.get(k)]
            match = sum(x for x, k in zip(extra, ("styles", "topics", "moods")) if k in wanted) / len(wanted) if wanted else 0
            score = 0.65 * need_score + 0.35 * match if needs else match * 0.9
            top_topic = max(p.d.get("topic", {}).items(), key=lambda kv: kv[1][0], default=(None, None))[0]
            if top_topic in spec.get("avoid_topics", []):
                score *= 0.5  # an alphabet or a holiday pack is not a toolbar for a support bot
            if score >= 0.45:
                p.add("use", use, round(score, 2), "rules")
        apply_overrides(p, overrides.get(name.lower(), []))
        report["overrides_applied"] += len(overrides.get(name.lower(), []))
        out_packs[name] = {"category": category, "count": n, "meanings": len(meanings),
                           "facets": p.compact(th["pack"], LIMITS_PACK, prefer={"topic": CATEGORY_TOPIC.get(category, "")})}
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
    print(json.dumps({k: (v if not isinstance(v, list) else len(v)) for k, v in report.items() if k != "unknown_words_top"},
                     ensure_ascii=False))
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
def fetch(args) -> int:
    os.makedirs(SNAP, exist_ok=True)
    todo = [n for n, _ in listed_packs() if args.force or not os.path.isfile(os.path.join(SNAP, f"{n.lower()}.json"))]
    print(f"{len(todo)} pack(s) to fetch", file=sys.stderr)
    for i, name in enumerate(todo, 1):
        for attempt in range(4):
            try:
                req = urllib.request.Request(f"{args.base.rstrip('/')}/api/emoji-pack/{name}", headers={"User-Agent": "emoji-taxonomy"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    body = json.loads(r.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as err:
                if err.code == 429:
                    time.sleep(int(err.headers.get("Retry-After") or 60))
                    continue
                body = {"ok": False, "status": err.code}
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                time.sleep(5)
                body = None
        if body and body.get("ok"):
            with open(os.path.join(SNAP, f"{name.lower()}.json"), "w", encoding="utf-8") as fh:
                json.dump({"name": body.get("name"), "emoji": [{k: e.get(k) for k in ("id", "fallback", "format", "adaptive")}
                                                              for e in body.get("emoji", [])]}, fh, ensure_ascii=False)
        else:
            print(f"skip {name}: {body}", file=sys.stderr)
        if i % 25 == 0:
            print(f"{i}/{len(todo)}", file=sys.stderr)
        time.sleep(args.delay)
    return 0


def evaluate(args) -> int:
    """Precision and recall of the facets against hand labels (scripts/emoji_taxonomy_gold.json)."""
    gold = load_json(args.gold)
    if args.split != "all":  # tune = first gold pack of each category, holdout = the rest
        first: dict[str, str] = {}
        for name, cat in listed_packs():
            if name in gold.get("packs", {}) and cat not in first:
                first[cat] = name
        keep = set(first.values()) if args.split == "tune" else set(gold.get("packs", {})) - set(first.values())
        gold = {"packs": {k: v for k, v in gold["packs"].items() if k in keep},
                "emoji": {k: v for k, v in gold.get("emoji", {}).items() if k.split("/")[0] in keep}}
    facets = load_json(FULL if os.path.isfile(FULL) else OUT)
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
        for facet in ("style", "color", "palette", "topic", "mood", "fit"):
            truth = set(g[facet] if isinstance(g.get(facet), list) else [g[facet]] if g.get(facet) else [])
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
        for facet in ("color", "style", "topic", "mood", "role"):
            truth = set(g[facet] if isinstance(g.get(facet), list) else [g[facet]] if g.get(facet) else [])
            score("emoji", facet, top(e, facet, max(1, len(truth))), truth, facet in g.get("unsure", []))
    rows = {}
    for key, c in sorted(stats.items()):
        prec = c["tp"] / max(1, c["tp"] + c["fp"])
        rec = c["tp"] / max(1, c["tp"] + c["fn"])
        rows[key] = {"n": c["n"], "precision": round(prec, 2), "recall": round(rec, 2),
                     "hit_rate": round(c["top1"] / max(1, c["n"]), 2)}
    print(json.dumps(rows, indent=1))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, indent=1)
    return 0


def check(_args) -> int:
    tax = load_json(TAXONOMY)
    _, errors = parse_overrides(OVERRIDES, tax)
    aliases: dict[str, list[str]] = defaultdict(list)
    for facet, f in tax["facets"].items():
        for value, v in f["values"].items():
            for a in v.get("aliases", []):
                aliases[a.lower()].append(f"{facet}:{value}")
            if not v.get("en") or not v.get("ru"):
                errors.append(f"{facet}:{value} needs en and ru labels")
    same_facet = {a: vs for a, vs in aliases.items() if len({x.split(':')[0] for x in vs}) < len(vs)}
    errors += [f"alias {a!r} maps to two values of one facet: {vs}" for a, vs in same_facet.items()]
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
    print("\n".join(errors) or "OK: taxonomy, overrides and facets consistent")
    return 1 if errors else 0


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
    e.add_argument("--gold", default=os.path.join(ROOT, "scripts", "emoji_taxonomy_gold.json"))
    e.add_argument("--out")
    e.add_argument("--split", choices=["all", "tune", "holdout"], default="all")
    sub.add_parser("check")
    a = ap.parse_args(argv)
    return {"fetch": fetch, "build": build, "eval": evaluate, "check": check}[a.cmd](a)


if __name__ == "__main__":
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except (AttributeError, OSError):
            pass
    sys.exit(main())
