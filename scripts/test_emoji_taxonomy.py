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


if __name__ == "__main__":
    unittest.main()
