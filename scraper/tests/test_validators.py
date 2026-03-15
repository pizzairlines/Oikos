"""Tests for data validation and sanitization."""

import pytest
from validators import validate_listing, sanitize_listing


class TestValidateListing:
    def test_valid_listing(self):
        result = validate_listing({
            "price": 350_000, "surface": 50.0, "price_per_sqm": 7000,
            "arrondissement": "75011", "dpe": "C", "rooms": 3, "floor": 3,
        })
        assert result.is_valid
        assert len(result.errors) == 0

    def test_missing_price(self):
        result = validate_listing({"surface": 50.0})
        assert not result.is_valid
        assert any("missing_price" in e for e in result.errors)

    def test_missing_surface(self):
        result = validate_listing({"price": 350_000})
        assert not result.is_valid
        assert any("missing_surface" in e for e in result.errors)

    def test_negative_price(self):
        result = validate_listing({"price": -100, "surface": 50.0})
        assert not result.is_valid

    def test_zero_surface(self):
        result = validate_listing({"price": 350_000, "surface": 0})
        assert not result.is_valid

    def test_price_too_low(self):
        result = validate_listing({"price": 500, "surface": 50.0})
        assert not result.is_valid
        assert any("price_too_low" in e for e in result.errors)

    def test_surface_too_small(self):
        result = validate_listing({"price": 100_000, "surface": 3.0})
        assert not result.is_valid
        assert any("surface_too_small" in e for e in result.errors)

    def test_warns_on_high_price(self):
        result = validate_listing({"price": 25_000_000, "surface": 200.0})
        assert result.is_valid  # Not fatal
        assert any("price_very_high" in w for w in result.warnings)

    def test_warns_on_large_surface(self):
        result = validate_listing({"price": 1_000_000, "surface": 600.0})
        assert result.is_valid  # Not fatal
        assert any("surface_very_large" in w for w in result.warnings)

    def test_warns_on_invalid_dpe(self):
        result = validate_listing({"price": 350_000, "surface": 50.0, "dpe": "Z"})
        assert result.is_valid  # Non-fatal
        assert any("invalid_dpe" in w for w in result.warnings)

    def test_warns_on_invalid_arrondissement(self):
        result = validate_listing({
            "price": 350_000, "surface": 50.0, "arrondissement": "99999",
        })
        assert result.is_valid
        assert any("invalid_arrondissement" in w for w in result.warnings)

    def test_warns_on_suspicious_rooms(self):
        result = validate_listing({"price": 350_000, "surface": 50.0, "rooms": 0})
        assert any("suspicious_rooms" in w for w in result.warnings)

    def test_warns_on_low_price_per_sqm(self):
        result = validate_listing({
            "price": 350_000, "surface": 50.0, "price_per_sqm": 500,
        })
        assert any("suspiciously_low" in w for w in result.warnings)

    def test_cross_check_surface_per_room(self):
        result = validate_listing({
            "price": 350_000, "surface": 10.0, "rooms": 5,
        })
        assert any("surface_per_room" in w for w in result.warnings)


class TestSanitizeListing:
    def test_normalizes_dpe(self):
        result = sanitize_listing({"dpe": " c "})
        assert result["dpe"] == "C"

    def test_invalid_dpe_set_to_none(self):
        result = sanitize_listing({"dpe": "X"})
        assert result["dpe"] is None

    def test_strips_title(self):
        result = sanitize_listing({"title": "  Bel appart  "})
        assert result["title"] == "Bel appart"

    def test_recalculates_price_per_sqm(self):
        result = sanitize_listing({"price": 300_000, "surface": 40.0})
        assert result["price_per_sqm"] == 7_500.0

    def test_caps_photos(self):
        photos = [f"photo{i}.jpg" for i in range(20)]
        result = sanitize_listing({"photos": photos})
        assert len(result["photos"]) == 10

    def test_truncates_description(self):
        result = sanitize_listing({"description": "x" * 5000})
        assert len(result["description"]) == 2000

    def test_does_not_modify_original(self):
        original = {"title": "  Test  ", "dpe": "c"}
        sanitize_listing(original)
        assert original["title"] == "  Test  "
        assert original["dpe"] == "c"
