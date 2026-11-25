"""Guards of `emoji_taxonomy.py check`: py -3 -m unittest discover -s scripts -p "test_*.py"."""
import copy
import os
import sys
import unittest

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


if __name__ == "__main__":
    unittest.main()
