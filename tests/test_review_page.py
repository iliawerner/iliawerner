from html.parser import HTMLParser
from pathlib import Path
import re
import unittest


PAGE = Path(__file__).parents[1] / "public" / "review" / "index.html"


class ReviewPageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.inputs = []
        self.images = []
        self.buttons = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "a":
            self.links.append(values)
        elif tag == "input":
            self.inputs.append(values)
        elif tag == "img":
            self.images.append(values)
        elif tag == "button":
            self.buttons.append(values)


class ReviewPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.parser = ReviewPageParser()
        cls.parser.feed(cls.html)

    def test_first_viewport_is_a_transactional_offer_not_a_file_catalogue(self):
        for text in [
            "One decision.",
            "One verdict.",
            "Before the build.",
            "US $5,000",
            "ten working days",
            "one review at a time",
        ]:
            self.assertIn(text, self.html)
        self.assertLess(self.html.index("One verdict."), self.html.index("private research film"))

    def test_page_is_visibly_and_structurally_not_the_previous_paper_layout(self):
        for retired_class in ["sheet", "handwritten", "evidence-image", "cover-note"]:
            self.assertNotRegex(self.html, rf'class="[^"]*\b{retired_class}\b')
        self.assertIn("Draft — booking is not open", self.html)

    def test_hero_does_not_expand_indefinitely_on_a_tall_viewport(self):
        self.assertIn("min-height: min(820px, calc(100vh - 120px));", self.html)

    def test_page_order_matches_the_forum_decision_path(self):
        ordered_ids = ["offer", "situations", "proof", "output", "intake", "fit", "terms"]
        positions = [self.html.index(f'id="{section_id}"') for section_id in ordered_ids]
        self.assertEqual(positions, sorted(positions))

    def test_public_work_proves_the_reasoning_without_inventing_a_client_result(self):
        for text in [
            "Public question",
            "Evidence",
            "Verdict",
            "Product implication",
            "Public example, not a client result.",
            "The Three Buttons Apple Never Had the Guts to Remove",
        ]:
            self.assertIn(text, self.html)
        self.assertIn("https://www.youtube.com/watch?v=z1ZrserYjZo", self.html)

    def test_page_has_self_qualification_before_checkout(self):
        fit_inputs = [item for item in self.parser.inputs if item.get("name") == "fit"]
        self.assertEqual(5, len(fit_inputs))
        self.assertIn("I own or co-own this decision and its budget", self.html)
        self.assertIn("The decision must be made within 30 days", self.html)
        self.assertIn("The estimated cost of getting it wrong is at least $25,000", self.html)

    def test_draft_does_not_pretend_checkout_or_intake_are_connected(self):
        checkout = [button for button in self.parser.buttons if "data-checkout" in button]
        self.assertEqual(1, len(checkout))
        self.assertIn("disabled", checkout[0])
        self.assertIn("Checkout and intake are not connected in this draft.", self.html)
        self.assertNotIn("CHECKOUT_URL", self.html)
        self.assertNotIn("mailto:", self.html)

    def test_materials_are_shown_before_purchase(self):
        for text in [
            "The decision in one sentence",
            "The alternatives being considered",
            "The product context and constraints",
            "The materials your team is ready to share",
            "The date the decision must be made",
            "Your estimate of what a wrong decision would cost",
        ]:
            self.assertIn(text, self.html)
        self.assertLess(self.html.index('id="intake"'), self.html.index('id="fit"'))

    def test_intake_completion_rule_is_stated_before_purchase(self):
        self.assertIn("complete the intake within 24 hours of payment", self.html)
        self.assertIn("payment is refunded and the slot reopens", self.html)

    def test_redesign_does_not_use_a_photo_as_proof(self):
        self.assertEqual([], self.parser.images)

    def test_draft_tracks_only_actions_that_exist_on_the_page(self):
        for event in [
            "review_cta_click",
            "review_fit_started",
            "review_fit_passed",
            "review_checkout_unavailable",
        ]:
            self.assertIn(event, self.html)
        for unavailable_event in ["payment_succeeded", "intake_completed", "refund"]:
            self.assertNotIn(f"track('{unavailable_event}'", self.html)


if __name__ == "__main__":
    unittest.main()
