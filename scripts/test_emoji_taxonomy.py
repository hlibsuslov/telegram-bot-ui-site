"""Guards of `emoji_taxonomy.py check`: py -3 -m unittest discover -s scripts -p "test_*.py"."""
import contextlib
import copy
import gzip
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import emoji_taxonomy as et  # noqa: E402

STYLE = {"definition": "Thin even strokes, no fill, flat view, no shadow.", "not": ["Solid fill", "Visible shading"]}
TAX = {
    "facets": {
        "style": {"values": {
            "outline": {"en": "Outline", "ru": "Контурный", "aliases": ["outline", "contour"], **STYLE},
            "flat": {"en": "Flat", "ru": "Плоский", "aliases": ["flat"], **STYLE},
        }},
        "topic": {"values": {
            "symbols": {"en": "Symbols", "ru": "Символы", "aliases": ["star", "crown"]},
            "decor": {"en": "Decor", "ru": "Декор", "aliases": ["sparkle"]},
        }},
        "role": {"values": {"decoration": {"en": "Decoration", "ru": "Украшение", "aliases": ["star"]}}},
    }
}


def with_value(facet: str, value: str, **fields) -> dict:
    tax = copy.deepcopy(TAX)
    tax["facets"][facet]["values"][value] = {"en": value, "ru": value, **fields}
    return tax


class TaxonomyErrors(unittest.TestCase):
    def test_valid_taxonomy_has_no_errors(self):
        self.assertEqual(et.taxonomy_errors(TAX), [])

    def test_same_alias_in_other_facets_is_fine(self):
        self.assertEqual(et.taxonomy_errors(TAX), [])  # "star" is a topic and a role alias

    def test_one_alias_in_two_values_of_a_facet_fails(self):
        tax = with_value("topic", "space", aliases=["Star"])
        self.assertTrue(any("star" in e and "topic" in e for e in et.taxonomy_errors(tax)))

    def test_plural_and_yo_forms_collide_like_the_matcher_sees_them(self):
        tax = with_value("topic", "space", aliases=["stars", "звёзда"])
        tax["facets"]["topic"]["values"]["symbols"]["aliases"].append("звезда")
        errors = et.taxonomy_errors(tax)
        self.assertTrue(any("stars" in e or "star" in e for e in errors), errors)
        self.assertTrue(any("звезда" in e for e in errors), errors)

    def test_phrase_alias_in_two_values_of_a_facet_fails(self):
        tax = with_value("topic", "space", aliases=["gold star"])
        tax["facets"]["topic"]["values"]["symbols"]["aliases"].append("gold star")
        self.assertTrue(any("gold star" in e for e in et.taxonomy_errors(tax)))

    def test_style_without_definition_fails(self):
        tax = copy.deepcopy(TAX)
        del tax["facets"]["style"]["values"]["flat"]["definition"]
        errors = et.taxonomy_errors(tax)
        self.assertTrue(any("style:flat" in e and "definition" in e for e in errors), errors)

    def test_style_without_not_list_fails(self):
        for bad in (None, [], [""]):
            tax = copy.deepcopy(TAX)
            if bad is None:
                del tax["facets"]["style"]["values"]["flat"]["not"]
            else:
                tax["facets"]["style"]["values"]["flat"]["not"] = bad
            errors = et.taxonomy_errors(tax)
            self.assertTrue(any("style:flat" in e and "not" in e for e in errors), (bad, errors))

    def test_blank_definition_fails(self):
        tax = copy.deepcopy(TAX)
        tax["facets"]["style"]["values"]["flat"]["definition"] = "  "
        self.assertTrue(any("style:flat" in e for e in et.taxonomy_errors(tax)))

    def test_other_facets_need_no_definition(self):
        self.assertFalse([e for e in et.taxonomy_errors(TAX) if "topic" in e])

    def test_missing_label_fails(self):
        tax = with_value("topic", "people", aliases=["hand"])
        tax["facets"]["topic"]["values"]["people"]["ru"] = ""
        self.assertTrue(any("topic:people" in e and "labels" in e for e in et.taxonomy_errors(tax)))


class Matching(unittest.TestCase):
    tax = {
        "masks": ["hand drawn", "hand-drawn"],
        "facets": {
            "style": {"values": {"hand-drawn": {"aliases": ["hand drawn", "hand-drawn", "doodle"]}}},
            "topic": {"values": {"people": {"aliases": ["hand", "hands"]}, "symbols": {"aliases": ["star"]}}},
        },
    }

    def hits(self, text: str) -> set:
        return et.Vocabulary(self.tax).facets_of(text)[0]

    def test_a_word_alias_still_matches_alone(self):
        self.assertEqual(self.hits("ok hand, star"), {("topic", "people"), ("topic", "symbols")})

    def test_masked_phrase_does_not_match_its_words(self):
        self.assertEqual(self.hits("heart outline, hand drawn, line art"), {("style", "hand-drawn")})
        self.assertEqual(self.hits("Hand-Drawn star"), {("style", "hand-drawn"), ("topic", "symbols")})

    def test_the_word_next_to_a_masked_phrase_still_matches(self):
        self.assertEqual(self.hits("hand drawn hands"), {("style", "hand-drawn"), ("topic", "people")})


class ShippedTaxonomy(unittest.TestCase):
    """Words of the real taxonomy that once matched the wrong thing or nothing."""

    vocab = et.Vocabulary(et.load_json(et.TAXONOMY))

    def hits(self, text: str) -> set:
        return self.vocab.facets_of(text)[0]

    def test_paper_plane_is_a_send_icon_not_travel(self):
        got = self.hits("paper plane, telegram, send")
        self.assertNotIn(("topic", "travel"), got)
        self.assertIn(("role", "action"), got)

    def test_hand_drawn_is_not_a_hand(self):
        self.assertNotIn(("topic", "people"), self.hits("heart outline, hand drawn, line art"))

    def test_sports_car_is_travel_not_sport(self):
        got = self.hits("sports car, black")
        self.assertIn(("topic", "travel"), got)
        self.assertNotIn(("topic", "sport"), got)

    def test_hot_dog_is_food_not_an_animal(self):
        got = self.hits("hot dog, mustard")
        self.assertIn(("topic", "food"), got)
        self.assertNotIn(("topic", "animals"), got)

    def test_clear_words_map_to_one_value(self):
        for text, want in (
            ("anime girl, long hair, portrait", ("topic", "characters")),
            ("map pin, red", ("topic", "interface")),
            ("birthday candle, digit 3", ("topic", "holidays")),
            ("bat, halloween", ("topic", "animals")),
            ("alien, green", ("topic", "nature")),
            ("sunglasses, duck", ("mood", "playful")),
            ("russian letter, keyboard key", ("topic", "letters")),
        ):
            self.assertIn(want, self.hits(text), text)


class ReviewFindings(unittest.TestCase):
    """Regression tests for the Codex review of taxonomy v2 (task 20261125-164434-review-cc64)."""

    vocab = et.Vocabulary(et.load_json(et.TAXONOMY))

    def hits(self, text: str) -> set:
        return self.vocab.facets_of(text)[0]

    def test_send_icons_are_actions_not_travel_in_every_spelling(self):
        for row in ("paper plane, telegram, send, самолетик", "paper airplane, send", "paper plane",
                    "бумажный самолетик"):
            with self.subTest(row):
                got = self.hits(row)
                self.assertIn(("role", "action"), got)
                self.assertNotIn(("topic", "travel"), got)
        self.assertIn(("topic", "travel"), self.hits("airplane, flight"))

    def test_palm_trees_and_computer_mice(self):
        self.assertNotIn(("topic", "people"), self.hits("palm tree, beach"))
        self.assertIn(("topic", "nature"), self.hits("palm tree, beach"))
        self.assertNotIn(("topic", "animals"), self.hits("компьютерная мышь, клик"))
        self.assertIn(("topic", "people"), self.hits("palm, hand"))

    def test_default_mood_needs_a_neutral_leading_topic(self):
        def scores(topics, adaptive=False):
            s = et.Scores()
            for value, conf in topics:
                s.add("topic", value, conf, "words")
            if adaptive:
                s.add("fit", "adaptive", 1.0, "telegram")
            return s
        self.assertIsNone(et.default_mood(scores([("faces", 0.75)], adaptive=True)))
        self.assertIsNone(et.default_mood(scores([("faces", 0.75), ("interface", 0.4)])))
        self.assertEqual(et.default_mood(scores([("interface", 0.75)])), "serious")
        self.assertEqual(et.default_mood(scores([], adaptive=True)), "serious")
        self.assertIsNone(et.default_mood(scores([])))
        # a repainting icon that is not a face or a character still reads as serious
        self.assertEqual(et.default_mood(scores([("decor", 0.6)], adaptive=True)), "serious")
        self.assertIsNone(et.default_mood(scores([("characters", 0.6)], adaptive=True)))
        self.assertIsNone(et.default_mood(scores([("decor", 0.6)])))

    def test_a_phrase_alias_may_not_emit_two_values_of_its_facet(self):
        tax = copy.deepcopy(TAX)
        tax["facets"]["topic"]["values"]["decor"]["aliases"].append("gold star")
        self.assertTrue(any("gold star" in e for e in et.taxonomy_errors(tax)), et.taxonomy_errors(tax))
        tax["masks"] = ["gold star"]
        self.assertEqual(et.taxonomy_errors(tax), [])

    def test_masks_must_be_a_list_of_phrases(self):
        for masks in ([""], "hand drawn", None, [3]):
            with self.subTest(masks):
                tax = copy.deepcopy(TAX)
                tax["masks"] = masks
                self.assertTrue(any("masks" in e for e in et.taxonomy_errors(tax)))

    def test_style_definition_must_be_text(self):
        for definition in (None, False, {}):
            with self.subTest(definition):
                tax = copy.deepcopy(TAX)
                tax["facets"]["style"]["values"]["flat"]["definition"] = definition
                self.assertTrue(any("definition" in e for e in et.taxonomy_errors(tax)))


class Gate(unittest.TestCase):
    """E3: gold v2, labeler agreement and the accuracy gate CI runs on the committed site output."""

    FACETS = {"packs": {"P": {"facets": {"style": [["flat", 0.9]], "topic": [["symbols", 0.9]],
                                         "use": [["utility", 0.7]]}}},
              "emoji": {"P": {"1": {"style": [["flat", 0.72]], "topic": [["symbols", 0.72]]}}}}
    GOLD = {"packs": {"P": {"style": ["flat"], "topic": ["symbols"], "use": ["utility", "shop"], "unsure": []}},
            "emoji": {"P/1": {"style": "flat", "topic": "decor", "unsure": []}},
            "second": {"packs": {"P": {"style": ["outline"], "topic": ["symbols"], "use": ["utility"], "unsure": []}},
                       "emoji": {"P/1": {"style": "flat", "topic": "decor", "unsure": ["topic"]}}}}

    def test_site_output_decodes_and_inherits_like_the_full_output(self):
        self.assertEqual(et.decode("c:blue@9,white@6;s:outline@6"),
                         {"color": [["blue", 0.9], ["white", 0.6]], "style": [["outline", 0.6]]})
        site = {"packs": self.FACETS["packs"], "emoji": {"P": {"1": ""}}}
        view = et.site_view(site)
        self.assertEqual(view["emoji"]["P"]["1"]["style"], [["flat", 0.72]])

    def test_metrics_score_bot_use(self):
        rows = et.metrics(self.GOLD, self.FACETS, "all")
        self.assertEqual(rows["pack.use"]["recall"], 0.5)
        self.assertEqual(rows["pack.style"]["recall"], 1.0)
        self.assertEqual(rows["emoji.topic"]["recall"], 0.0)

    def test_agreement_skips_unsure_labels(self):
        agree = et.agreement(self.GOLD)
        self.assertEqual(agree["pack.style"], {"n": 1, "agree": 0.0})
        self.assertEqual(agree["pack.topic"], {"n": 1, "agree": 1.0})
        self.assertNotIn("emoji.topic", agree)

    def test_gate_reports_each_metric_below_its_floor(self):
        rows = {"pack.style": {"recall": 0.8, "hit_rate": 0.9}, "emoji.role": {"recall": 0.4, "hit_rate": 0.4}}
        floor = {"pack.style": {"recall": 0.85}, "emoji.role": {"recall": 0.4}, "pack.mood": {"recall": 0.5}}
        self.assertEqual(et.gate_failures(rows, floor),
                         ["pack.style recall 0.8 < 0.85", "pack.mood: no result (gold or output lost?)"])


CARD = {"style": ["outline"], "line_weight": "thin", "fill": "none", "perspective": "front", "shadows": "none",
        "characters": "none", "drawn": "thin even strokes, no fill", "confidence": 0.9, "unsure": [],
        "source": "vision"}


class StyleCards(unittest.TestCase):
    """src/content/emoji-pack-styles.json: one look card per pack from the vision pass (E1)."""

    def errors(self, packs: dict, listed=("tgiosicons",)) -> list:
        return et.style_card_errors({"packs": packs}, TAX, set(listed))

    def test_a_valid_card_passes(self):
        self.assertEqual(self.errors({"tgiosicons": CARD}), [])

    def test_each_broken_rule_is_reported(self):
        cases = {
            "not in emoji-packs.txt": ({"nosuchpack": CARD}, None),
            "unknown style": ({"tgiosicons": {**CARD, "style": ["oil-painting"]}}, None),
            "1-2 style ids": ({"tgiosicons": {**CARD, "style": ["outline", "flat", "outline"]}}, None),
            "line_weight": ({"tgiosicons": {**CARD, "line_weight": "chunky"}}, None),
            "drawn": ({"tgiosicons": {**CARD, "drawn": "x" * 200}}, None),
            "confidence": ({"tgiosicons": {**CARD, "confidence": 1.5}}, None),
            "source": ({"tgiosicons": {**CARD, "source": "words"}}, None),
            "unknown field": ({"tgiosicons": {**CARD, "mood": "calm"}}, None),
        }
        for expected, (packs, _) in cases.items():
            with self.subTest(expected):
                found = self.errors(packs)
                self.assertTrue(any(expected in e for e in found), found)

    def test_a_sure_card_replaces_word_styles(self):
        p = et.Scores()
        p.add("style", "flat", 0.75, "words")
        et.apply_style_card(p, {**CARD, "style": ["outline", "flat"]})
        self.assertEqual(p.d["style"]["outline"], [0.9, {"vision"}])
        self.assertEqual(p.d["style"]["flat"][1], {"words", "vision"})
        p = et.Scores()
        p.add("style", "glossy", 0.75, "words")
        et.apply_style_card(p, CARD)
        self.assertNotIn("glossy", p.d["style"])

    def test_an_unsure_card_only_adds(self):
        p = et.Scores()
        p.add("style", "glossy", 0.75, "words")
        et.apply_style_card(p, {**CARD, "confidence": 0.6})
        self.assertIn("glossy", p.d["style"])
        self.assertEqual(p.d["style"]["outline"][0], 0.6)


class BotUse(unittest.TestCase):
    """The `use` facet with the shipped rules: interface and status packs get utility, shop or support only where
    they cover the roles those bots need; decorative and character packs lean to content and community."""

    USES = et.load_json(et.TAXONOMY)["facets"]["use"]["values"]

    def ranked(self, meanings: dict, **facets) -> list:
        """Uses the build would tag (score of at least 0.45), best first, for a pack with these distinct interface
        meanings per role and these pack facets ({facet: {value: confidence}})."""
        p = et.Scores()
        for facet, vals in facets.items():
            for value, conf in vals.items():
                p.add(facet, value, conf, "test")
        scores = et.use_scores(self.USES, et.Counter(meanings), p)
        return [u for u, s in sorted(scores.items(), key=lambda t: (-t[1], t[0])) if s >= 0.45]

    def test_a_general_interface_pack_suits_utility_before_shop_and_support(self):
        every_role = {"navigation": 6, "status": 6, "settings": 6, "commerce": 6, "communication": 6}
        ranked = self.ranked(every_role, topic={"interface": 1.0}, style={"outline": 1.0},
                             role={r: 0.2 for r in every_role})
        self.assertEqual(ranked[0], "utility", ranked)

    def test_a_pack_led_by_carts_and_coins_suits_shop(self):
        ranked = self.ranked({"commerce": 8, "navigation": 3, "status": 3}, topic={"interface": 1.0},
                             style={"glyph": 1.0}, role={"commerce": 0.9})
        self.assertEqual(ranked[0], "shop", ranked)

    def test_a_character_pack_suits_community_not_games_or_shop(self):
        ranked = self.ranked({"status": 4, "navigation": 3, "commerce": 3}, topic={"characters": 1.0},
                             style={"cartoon": 0.9})
        self.assertEqual(ranked[0], "community", ranked)
        self.assertFalse({"games", "shop", "utility", "support"} & set(ranked), ranked)

    def test_reaction_faces_in_the_interface_category_are_not_a_toolbar(self):
        ranked = self.ranked({"status": 3, "settings": 3, "navigation": 3, "commerce": 3},
                             topic={"interface": 1.0, "faces": 0.9}, style={"emoji-like": 1.0})
        self.assertEqual(ranked[0], "community", ranked)
        self.assertFalse({"utility", "shop", "support"} & set(ranked), ranked)

    def test_an_alphabet_suits_channels(self):
        ranked = self.ranked({}, topic={"letters": 1.0}, style={"lettering": 1.0}, mood={"joyful": 0.9},
                             role={"content": 1.0})
        self.assertEqual(ranked[0], "content", ranked)
        self.assertNotIn("utility", ranked)

    def test_incidental_status_icons_do_not_make_a_holiday_pack_a_learning_pack(self):
        ranked = self.ranked({"navigation": 6, "status": 7, "settings": 2, "commerce": 3},
                             topic={"holidays": 1.0, "decor": 0.9}, style={"hand-drawn": 1.0})
        self.assertTrue(ranked and set(ranked) <= {"content", "community"}, ranked)

    def test_a_set_of_check_marks_partly_covers_a_monitoring_bot(self):
        ranked = self.ranked({"status": 2}, topic={"status": 1.0}, style={"flat": 0.8}, role={"status": 1.0})
        self.assertEqual(ranked[:1], ["utility"], ranked)


DESC = {lang: {"what": "Thin line icons that take the text colour.", "for": "Menus and buttons",
                "not_for": "Festive posts"} for lang in ("en", "ru", "uk")}


class Descriptions(unittest.TestCase):
    """src/content/emoji-pack-descriptions.json (E2): one en/ru/uk description per listed pack."""

    def errors(self, packs, listed=("tgiosicons",)):
        return et.description_errors({"packs": packs}, set(listed))

    def test_a_valid_description_passes(self):
        self.assertEqual(self.errors({"tgiosicons": DESC}), [])

    def test_each_broken_rule_is_reported(self):
        cases = {
            "no description": ({}, ("tgiosicons",)),
            "not in emoji-packs.txt": ({"tgiosicons": DESC, "nosuchpack": DESC}, ("tgiosicons",)),
            "uk.for": ({"tgiosicons": {**DESC, "uk": {**DESC["uk"], "for": ""}}}, ("tgiosicons",)),
            "en.what is 141": ({"tgiosicons": {**DESC, "en": {**DESC["en"], "what": "x" * 141}}}, ("tgiosicons",)),
            "marketing word": ({"tgiosicons": {**DESC, "ru": {**DESC["ru"], "for": "Лучший выбор для меню"}}},
                               ("tgiosicons",)),
            "exclamation": ({"tgiosicons": {**DESC, "en": {**DESC["en"], "for": "Menus!"}}}, ("tgiosicons",)),
            "unknown field": ({"tgiosicons": {**DESC, "en": {**DESC["en"], "tagline": "x"}}}, ("tgiosicons",)),
        }
        for expected, (packs, listed) in cases.items():
            with self.subTest(expected):
                found = self.errors(packs, listed)
                self.assertTrue(any(expected in e for e in found), found)

    def test_the_shipped_file_describes_every_pack(self):
        listed = {n for n, _ in et.listed_packs()}
        self.assertEqual(et.description_errors(et.load_json(et.DESCRIPTIONS), listed), [])


try:
    from PIL import Image
except ImportError:  # CI runs without Pillow: the sheet tests skip, the chain runs with a fake sheet
    Image = None


def slurp(path: str) -> bytes:
    with open(path, "rb") as fh:
        return fh.read()


def text_of(path: str) -> str:
    return slurp(path).decode("utf-8").replace("\r\n", "\n")


class AddChain(unittest.TestCase):
    """E4: `add` lists a pack and runs the chain on a fixture library, without network; `apply-pending`
    merges the vision pass; `check` names the packs still waiting for it."""

    NEW = {"ok": True, "name": "NewCats", "title": "Cute cats", "emoji": [
        {"id": "9001", "fallback": "🐱", "format": "static", "adaptive": False,
         "preview": "/api/emoji-pack/NewCats/9001", "animation": None, "still": None},
        {"id": "9002", "fallback": "😺", "format": "animated", "adaptive": False,
         "preview": None, "animation": "/api/emoji-pack/NewCats/9002/anim", "still": None}]}

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root, True)
        content = os.path.join(self.root, "src", "content")
        work = os.path.join(self.root, ".emoji-taxonomy")
        os.makedirs(content)
        paths = {"ROOT": self.root, "PACKS": os.path.join(content, "emoji-packs.txt"),
                 "TAGS": os.path.join(content, "emoji-tags.txt"), "OVERRIDES": os.path.join(content, "none.txt"),
                 "STYLES": os.path.join(content, "emoji-pack-styles.json"),
                 "DESCRIPTIONS": os.path.join(content, "emoji-pack-descriptions.json"),
                 "OUT": os.path.join(content, "emoji-facets.json"), "WORK": work,
                 "FULL": os.path.join(work, "facets-full.json"), "SNAP": os.path.join(work, "snapshot"),
                 "PENDING": os.path.join(work, "work", "pending"), "DONE": os.path.join(work, "work", "done"),
                 "SHEETS_OUT": os.path.join(self.root, ".emoji-sheets")}
        patcher = mock.patch.multiple(et, **paths, fetch_pack=self.fake_fetch, make_sheet=self.fake_sheet,
                                      interactive=lambda: False)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.fetches = 0
        with open(et.PACKS, "w", encoding="utf-8") as fh:
            fh.write("# packs\n## Interface & icons\nhttps://t.me/addemoji/OldPack\n\n## Animals\n"
                     "https://t.me/addemoji/CatPack\n\n## Effects & decor\n")
        open(et.TAGS, "w", encoding="utf-8").close()
        for path, value in ((et.STYLES, CARD), (et.DESCRIPTIONS, DESC)):
            self.write_json(path, {"packs": {"CatPack": value, "OldPack": value}})
        os.makedirs(et.SNAP)
        for name, eid in (("oldpack", "1001"), ("catpack", "1002")):
            self.write_json(os.path.join(et.SNAP, f"{name}.json"), {"name": name, "emoji": [
                {"id": eid, "fallback": "⭐", "format": "static", "adaptive": False}]})

    @staticmethod
    def write_json(path, doc):
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")

    def fake_fetch(self, base, name):
        self.fetches += 1
        return copy.deepcopy(self.NEW) if name.lower() == "newcats" else {"ok": False, "status": 404}

    def fake_sheet(self, base, name, out, body):
        os.makedirs(out, exist_ok=True)
        with open(os.path.join(out, f"{name}.json"), "w", encoding="utf-8") as fh:
            json.dump({"pack": name, "emoji": {str(i + 1): [e["id"], e["fallback"]] for i, e in enumerate(body["emoji"])}}, fh)
        if Image:
            Image.new("RGB", (12 * 92, 92), (214, 214, 218)).save(os.path.join(out, f"{name}.png"))
        else:
            open(os.path.join(out, f"{name}.png"), "wb").close()
        return f"{name}: {len(body['emoji'])} emoji"

    def run_cli(self, *argv) -> tuple[int, str]:
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
            code = et.main(list(argv))
        return code, out.getvalue()

    def tree(self) -> dict:
        return {os.path.relpath(os.path.join(d, f), self.root): slurp(os.path.join(d, f))
                for d, _, files in os.walk(self.root) for f in files}

    def add_new(self) -> tuple[int, str]:
        return self.run_cli("add", "https://t.me/addemoji/NewCats", "--category", "animals", "--sheets", et.SHEETS_OUT)

    def test_add_runs_the_chain_and_a_second_run_changes_nothing(self):
        code, out = self.add_new()
        self.assertEqual(code, 0, out)
        packs = text_of(et.PACKS)
        self.assertIn("## Animals\nhttps://t.me/addemoji/CatPack\nhttps://t.me/addemoji/NewCats\n\n## Effects", packs)
        self.assertTrue(os.path.isfile(os.path.join(et.SNAP, "newcats.json")))
        self.assertIn("NewCats", et.load_json(et.OUT)["packs"])
        item = et.load_json(os.path.join(et.PENDING, "NewCats.json"))
        self.assertEqual(item["sheet"], os.path.join(".emoji-sheets", "NewCats.png"))
        self.assertIn("outline", item["rubric"]["style"])
        self.assertEqual(item["example"]["pack"], "CatPack")
        self.assertIn("apply-pending", out)
        before, fetches = self.tree(), self.fetches
        code, out = self.run_cli("add", "NewCats")  # no --category, no --sheets: kept and remembered
        self.assertEqual(code, 0, out)
        self.assertEqual(self.fetches, fetches, "a repeat must not fetch again")
        after = self.tree()
        self.assertEqual(sorted(after), sorted(before))
        self.assertEqual([p for p in before if before[p] != after[p]], [])
        self.assertEqual(packs.count("NewCats"), 1)

    def test_a_new_pack_needs_a_confirmed_category(self):
        before = self.tree()
        code, out = self.run_cli("add", "NewCats", "--sheets", et.SHEETS_OUT)
        self.assertEqual(code, 2)
        self.assertIn("suggested category: Animals (from: cats)", out)
        self.assertIn('--category "Animals"', out)
        self.assertEqual(self.tree(), before, "nothing is written before the category is confirmed")
        code, out = self.run_cli("add", "NewCats", "--category", "Pets", "--sheets", et.SHEETS_OUT)
        self.assertEqual(code, 2)
        self.assertIn("unknown category 'Pets'", out)
        self.assertEqual(self.tree(), before)

    def test_the_prompt_confirms_the_suggestion(self):
        with mock.patch.object(et, "interactive", lambda: True), mock.patch("builtins.input", return_value=""):
            code, out = self.run_cli("add", "NewCats", "--sheets", et.SHEETS_OUT)
        self.assertEqual(code, 0, out)
        self.assertIn("addemoji/CatPack\nhttps://t.me/addemoji/NewCats", text_of(et.PACKS))

    def test_check_names_the_packs_waiting_for_the_vision_pass(self):
        self.add_new()
        errors = et.check_errors()
        waiting = [e for e in errors if "NewCats" in e]
        self.assertEqual(len(waiting), 2, errors)
        self.assertTrue(any("no look card" in e for e in waiting), waiting)
        self.assertTrue(any("no description" in e for e in waiting), waiting)
        self.assertTrue(all("apply-pending" in e and "NewCats.json" in e for e in waiting), waiting)
        self.assertEqual(self.run_cli("check")[0], 1)

    def test_apply_pending_rejects_a_bad_card_and_merges_a_good_one(self):
        self.add_new()
        path = os.path.join(et.PENDING, "NewCats.json")
        styles = slurp(et.STYLES)
        item = et.load_json(path)
        self.write_json(path, {**item, "card": {**CARD, "style": ["oil-painting"]}, "description": DESC})
        code, out = self.run_cli("apply-pending")
        self.assertEqual(code, 1)
        self.assertIn("unknown style 'oil-painting'", out)
        self.assertEqual(slurp(et.STYLES), styles)
        self.assertTrue(os.path.isfile(path))
        self.write_json(path, {**item, "card": {**CARD, "unsure": ["fill"]}, "description": DESC})
        code, out = self.run_cli("apply-pending")
        self.assertEqual(code, 0, out)
        self.assertEqual(list(et.load_json(et.STYLES)["packs"]), ["CatPack", "NewCats", "OldPack"])
        self.assertEqual(et.load_json(et.STYLES)["packs"]["NewCats"]["unsure"], ["fill"])
        self.assertEqual(et.load_json(et.DESCRIPTIONS)["packs"]["NewCats"], DESC)
        self.assertFalse(os.path.exists(path))
        self.assertTrue(os.path.isfile(os.path.join(et.DONE, "NewCats.json")))
        self.assertEqual([e for e in et.check_errors() if "NewCats" in e], [])
        code, out = self.run_cli("add", "NewCats")
        self.assertEqual(code, 0, out)
        self.assertIn("look card and description: present", out)


@unittest.skipUnless(Image, "needs Pillow")
class FillSheets(unittest.TestCase):
    """An emoji the pack's sheet left empty is measured from its fill sheet (emoji_sheets.py --gaps)."""

    def test_a_fill_sheet_measures_the_empty_cells_only(self):
        import emoji_sheets as es
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        red, blue = (Image.new("RGBA", (64, 64), c) for c in ((220, 30, 30, 255), (30, 60, 220, 255)))
        emoji = [{"id": "1", "fallback": "x"}, {"id": "2", "fallback": "y"}]
        with contextlib.redirect_stdout(io.StringIO()):
            es.draw(emoji, [red, None], d, "Pack", "t")
            es.draw(emoji, [blue, blue], d, "Pack.fill", None)
        got = et.measure_sheets([d])
        self.assertEqual(set(got), {"pack"})
        self.assertIn("red", got["pack"]["1"]["shares"])  # the pack's own sheet wins
        self.assertIn("blue", got["pack"]["2"]["shares"])

    def test_a_tgs_without_a_thumbnail_is_drawn_from_its_first_frame(self):
        import emoji_sheets as es
        try:
            import rlottie_python  # noqa: F401
        except ImportError:
            self.skipTest("needs rlottie-python")
        tf = {"a": 0, "k": 0}
        lottie = {"v": "5.5.2", "fr": 30, "ip": 0, "op": 30, "w": 100, "h": 100, "layers": [
            {"ty": 1, "sc": "#2050e0", "sw": 100, "sh": 100, "ip": 0, "op": 30, "st": 0, "ks": {
                "o": {"a": 0, "k": 100}, "r": tf, "p": {"a": 0, "k": [50, 50, 0]}, "a": {"a": 0, "k": [50, 50, 0]},
                "s": {"a": 0, "k": [100, 100, 100]}}}]}
        img = es.picture("application/x-tgsticker", gzip.compress(json.dumps(lottie).encode()))
        self.assertIsNotNone(img)
        r, g, b, a = img.getpixel((img.width // 2, img.height // 2))
        self.assertEqual(et.colour_family(r, g, b), "blue")


if __name__ == "__main__":
    unittest.main()
