"""Tests for base scraper classes and data validation."""

import pytest
from scrapers.base import RawListing, parse_arrondissement


# ---------------------------------------------------------------------------
# RawListing
# ---------------------------------------------------------------------------

class TestRawListing:
    def test_valid_listing(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=300_000, surface=50.0,
        )
        assert listing.is_valid()

    def test_invalid_no_price(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=None, surface=50.0,
        )
        assert not listing.is_valid()

    def test_invalid_no_surface(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=300_000, surface=None,
        )
        assert not listing.is_valid()

    def test_invalid_zero_surface(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=300_000, surface=0.0,
        )
        assert not listing.is_valid()

    def test_invalid_negative_surface(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=300_000, surface=-10.0,
        )
        assert not listing.is_valid()

    def test_to_db_dict_calculates_price_per_sqm(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=350_000, surface=50.0,
        )
        d = listing.to_db_dict()
        assert d["price_per_sqm"] == 7_000.0

    def test_to_db_dict_no_price_per_sqm_without_surface(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=350_000, surface=None,
        )
        d = listing.to_db_dict()
        assert "price_per_sqm" not in d

    def test_to_db_dict_no_price_per_sqm_without_price(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=None, surface=50.0,
        )
        d = listing.to_db_dict()
        assert "price_per_sqm" not in d

    def test_to_db_dict_preserves_all_fields(self):
        listing = RawListing(
            source="bienici", source_id="abc", url="https://example.com",
            title="Bel appart", price=400_000, surface=60.0, rooms=3,
            arrondissement="75011", description="Description", floor=4,
            has_elevator=True, dpe="C", charges=250.0,
            seller_type="particulier", photos=["photo1.jpg", "photo2.jpg"],
            published_at="2025-01-01",
        )
        d = listing.to_db_dict()
        assert d["source"] == "bienici"
        assert d["source_id"] == "abc"
        assert d["rooms"] == 3
        assert d["arrondissement"] == "75011"
        assert d["floor"] == 4
        assert d["has_elevator"] is True
        assert d["dpe"] == "C"
        assert d["charges"] == 250.0
        assert d["seller_type"] == "particulier"
        assert len(d["photos"]) == 2
        assert d["published_at"] == "2025-01-01"

    def test_to_db_dict_handles_zero_surface(self):
        listing = RawListing(
            source="test", source_id="1", url="https://example.com",
            title="Test", price=350_000, surface=0.0,
        )
        d = listing.to_db_dict()
        assert "price_per_sqm" not in d


# ---------------------------------------------------------------------------
# parse_arrondissement
# ---------------------------------------------------------------------------

class TestParseArrondissement:
    @pytest.mark.parametrize("text,expected", [
        ("75001", "75001"),
        ("75011", "75011"),
        ("75020", "75020"),
        ("Paris 10e", "75010"),
        ("Paris 1er", "75001"),
        ("Paris 2ème", "75002"),
        ("Paris 3eme", "75003"),
        ("Paris 15", "75015"),
        ("10e arr", "75010"),
        ("1er arr", "75001"),
        ("Appartement Paris 75018", "75018"),
        ("Vente Paris 11e arrondissement", "75011"),
    ])
    def test_valid_patterns(self, text, expected):
        assert parse_arrondissement(text) == expected

    @pytest.mark.parametrize("text", [
        "",
        "Lyon",
        "Marseille 13000",
        "Paris 0e",
        "Paris 21e",  # Only 1-20 valid
        "75000",  # Invalid
        "75021",  # Invalid
        "random text",
    ])
    def test_invalid_patterns_return_none(self, text):
        assert parse_arrondissement(text) is None

    def test_case_insensitive(self):
        assert parse_arrondissement("PARIS 10E") == "75010"
        assert parse_arrondissement("paris 5eme") == "75005"

    def test_extracts_from_longer_text(self):
        result = parse_arrondissement("Bel appartement à Paris 75011 avec vue")
        assert result == "75011"
