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

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "a":
            self.links.append(values)
        elif tag == "input":
            self.inputs.append(values)
        elif tag == "img":
            self.images.append(values)


class ReviewPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.parser = ReviewPageParser()
        cls.parser.feed(cls.html)

    def test_first_viewport_sells_the_decision_not_the_files(self):
        self.assertIn("Make the product decision before building the expensive mistake.", self.html)
        self.assertIn("one clear verdict", self.html)
        self.assertLess(self.html.index("one clear verdict"), self.html.index("private research film"))

    def test_page_has_self_qualification_before_checkout(self):
        fit_inputs = [item for item in self.parser.inputs if item.get("name") == "fit"]
        self.assertEqual(5, len(fit_inputs))
        self.assertIn("I own or co-own this decision and its budget", self.html)
        self.assertIn("The decision must be made within 30 days", self.html)
        self.assertIn("The cost of getting it wrong is meaningfully higher than $5,000", self.html)

    def test_checkout_is_honest_until_real_secure_url_is_configured(self):
        checkout = [link for link in self.parser.links if "data-checkout-link" in link]
        self.assertGreaterEqual(len(checkout), 1)
        self.assertTrue(all(link.get("aria-disabled") == "true" for link in checkout))
        self.assertRegex(self.html, r'const CHECKOUT_URL\s*=\s*"";')
        self.assertNotIn("mailto:", self.html)

    def test_materials_are_shown_before_purchase(self):
        for text in [
            "The decision in one sentence",
            "The alternatives being considered",
            "The product context and constraints",
            "The materials your team is ready to share",
            "The date the decision must be made",
        ]:
            self.assertIn(text, self.html)

    def test_only_existing_local_image_has_intrinsic_dimensions(self):
        self.assertEqual(1, len(self.parser.images))
        image = self.parser.images[0]
        self.assertEqual("/img/video-shot.jpg", image.get("src"))
        self.assertEqual("2978", image.get("width"))
        self.assertEqual("1670", image.get("height"))
        self.assertTrue(image.get("alt"))

    def test_tracking_contract_covers_video_to_completed_intake(self):
        for event in [
            "review_cta_click",
            "review_fit_started",
            "review_fit_passed",
            "review_checkout_unavailable",
        ]:
            self.assertIn(event, self.html)


if __name__ == "__main__":
    unittest.main()
