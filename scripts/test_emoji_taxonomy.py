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


if __name__ == "__main__":
    unittest.main()
