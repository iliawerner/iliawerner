from html.parser import HTMLParser
from pathlib import Path
import json
import re
import unittest


PAGE = Path(__file__).parents[1] / "public" / "review" / "index.html"
SPECIMEN = PAGE.parent / "specimen" / "index.html"
THUMBNAIL = PAGE.parent / "apple-three-buttons-thumbnail.jpg"


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

    def test_first_viewport_states_the_bounded_offer(self):
        for text in [
            "Private Design Decision Stress-Test",
            "When the evidence is in, but the direction is still open.",
            "one interface decision",
            "ten working days",
            "US $5,000",
        ]:
            self.assertIn(text, self.html)
        self.assertLess(self.html.index("one interface decision"), self.html.index('id="fit"'))

    def test_page_retires_the_draft_and_overconfident_verdict_language(self):
        for retired in [
            "One verdict.",
            "Draft — booking is not open",
            "not a live offer",
            "research prototype",
            "$25,000",
        ]:
            self.assertNotIn(retired, self.html)

    def test_page_order_matches_the_narrow_purchase_path(self):
        ordered_ids = ["overview", "fit", "sample", "return", "offer"]
        positions = [self.html.index(f'id="{section_id}"') for section_id in ordered_ids]
        self.assertEqual(positions, sorted(positions))

    def test_public_work_is_labelled_as_method_evidence_not_client_proof(self):
        for text in [
            "Public proof of method",
            "It demonstrates the method, not a client outcome.",
            "Self-initiated public demonstration; no client and no observed outcome.",
            "specimen/",
            "https://www.youtube.com/watch?v=z1ZrserYjZo",
        ]:
            self.assertIn(text, self.html)

    def test_offer_qualifies_existing_evidence_and_one_changeable_decision(self):
        for text in [
            "one directional interface decision",
            "two or three live alternatives",
            "existing user and product evidence ready to share",
            "a real decision date within 30 days",
            "When the central unknown is what people need or do, primary research comes first.",
        ]:
            self.assertIn(text, self.html)

    def test_full_fee_has_a_written_framing_and_refund_checkpoint(self):
        for text in [
            "<strong>$5,000</strong>",
            "a written framing of the decision and research path",
            "you confirm it before the stress-test",
            "ten working days after approval",
            "full refund if the framing is not approved",
        ]:
            self.assertIn(text, self.html)

    def test_publication_does_not_fake_a_connected_checkout(self):
        self.assertIn("Public booking is not yet open.", self.html)
        self.assertIn("Preview the written intake", self.html)
        self.assertNotIn("CHECKOUT_URL", self.html)
        self.assertNotIn("data-checkout", self.html)
        self.assertNotIn("mailto:", self.html)

    def test_accountable_output_precedes_format(self):
        for text in [
            "The decision record is accountable. The film carries the argument.",
            "The supported position, rejected alternative, evidence map, assumptions, confidence, strongest objection and next test.",
            "A chaptered 20–30 minute film",
            "bounded written challenge round",
        ]:
            self.assertIn(text, self.html)
        self.assertLess(self.html.index("Decision memo"), self.html.index("Research film"))

    def test_runtime_image_is_local_and_intrinsically_sized(self):
        self.assertTrue(THUMBNAIL.is_file())
        self.assertEqual(1, len(self.parser.images))
        image = self.parser.images[0]
        self.assertEqual("apple-three-buttons-thumbnail.jpg", image.get("src"))
        self.assertEqual("1280", image.get("width"))
        self.assertEqual("720", image.get("height"))

    def test_specimen_is_published_and_preserves_every_proof_boundary(self):
        specimen = SPECIMEN.read_text(encoding="utf-8")
        for text in [
            "Self-initiated public demonstration",
            "No client · no confidential materials · no observed outcome",
            "Persistence alone does not prove user value.",
            "None. This is a public specimen, not a client result.",
            'href="../">Back to the service</a>',
        ]:
            self.assertIn(text, specimen)

    def test_metadata_and_schema_describe_the_same_product(self):
        self.assertIn("https://www.iliawerner.com/review/", self.html)
        match = re.search(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', self.html, re.S)
        self.assertIsNotNone(match)
        schema = json.loads(match.group(1))
        self.assertEqual("Private Design Decision Stress-Test", schema["name"])
        self.assertNotIn("verdict", schema["description"].lower())

    def test_interactions_are_named_and_tracked_without_claiming_conversion(self):
        for event in [
            "review_sample_click",
            "review_fit_click",
            "review_film_click",
            "review_intake_preview",
        ]:
            self.assertIn(event, self.html)
        for unavailable_event in ["payment_succeeded", "intake_completed", "refund_issued"]:
            self.assertNotIn(unavailable_event, self.html)
        self.assertTrue(all(button.get("type") == "button" for button in self.parser.buttons[-2:]))


if __name__ == "__main__":
    unittest.main()
