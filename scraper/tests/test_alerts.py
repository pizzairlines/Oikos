"""Tests for alert matching and message formatting logic."""

import pytest
from alerts import _matches_alert, _format_alert_message


# ---------------------------------------------------------------------------
# _matches_alert
# ---------------------------------------------------------------------------

class TestMatchesAlert:
    def test_empty_config_matches_everything(self):
        listing = {"price_per_sqm": 8000, "opportunity_score": 50, "surface": 40}
        config = {}
        assert _matches_alert(listing, config) is True

    def test_max_price_per_sqm_matches(self):
        listing = {"price_per_sqm": 6000}
        config = {"max_price_per_sqm": 7000}
        assert _matches_alert(listing, config) is True

    def test_max_price_per_sqm_rejects(self):
        listing = {"price_per_sqm": 8000}
        config = {"max_price_per_sqm": 7000}
        assert _matches_alert(listing, config) is False

    def test_min_score_matches(self):
        listing = {"opportunity_score": 70}
        config = {"min_score": 60}
        assert _matches_alert(listing, config) is True

    def test_min_score_rejects(self):
        listing = {"opportunity_score": 40}
        config = {"min_score": 60}
        assert _matches_alert(listing, config) is False

    def test_min_surface_matches(self):
        listing = {"surface": 45}
        config = {"min_surface": 30}
        assert _matches_alert(listing, config) is True

    def test_min_surface_rejects(self):
        listing = {"surface": 20}
        config = {"min_surface": 30}
        assert _matches_alert(listing, config) is False

    def test_max_price_matches(self):
        listing = {"price": 300000}
        config = {"max_price": 400000}
        assert _matches_alert(listing, config) is True

    def test_max_price_rejects(self):
        listing = {"price": 500000}
        config = {"max_price": 400000}
        assert _matches_alert(listing, config) is False

    def test_arrondissements_matches(self):
        listing = {"arrondissement": "75011"}
        config = {"arrondissements": ["75010", "75011", "75018"]}
        assert _matches_alert(listing, config) is True

    def test_arrondissements_rejects(self):
        listing = {"arrondissement": "75016"}
        config = {"arrondissements": ["75010", "75011", "75018"]}
        assert _matches_alert(listing, config) is False

    def test_multiple_criteria_all_must_pass(self):
        listing = {
            "price_per_sqm": 6000,
            "opportunity_score": 70,
            "surface": 45,
            "price": 300000,
            "arrondissement": "75011",
        }
        config = {
            "max_price_per_sqm": 7000,
            "min_score": 60,
            "min_surface": 30,
            "max_price": 400000,
            "arrondissements": ["75011"],
        }
        assert _matches_alert(listing, config) is True

    def test_multiple_criteria_one_fails(self):
        listing = {
            "price_per_sqm": 6000,
            "opportunity_score": 40,  # Below min
            "surface": 45,
        }
        config = {
            "max_price_per_sqm": 7000,
            "min_score": 60,
        }
        assert _matches_alert(listing, config) is False

    def test_missing_listing_data_passes(self):
        """If listing doesn't have the field, filter is skipped."""
        listing = {}
        config = {"max_price_per_sqm": 7000, "min_score": 60}
        # Both conditions check with `and listing.get(...)` so they skip
        assert _matches_alert(listing, config) is True


# ---------------------------------------------------------------------------
# _format_alert_message
# ---------------------------------------------------------------------------

class TestFormatAlertMessage:
    def test_basic_format(self):
        listing = {
            "title": "Bel appartement",
            "price": 350000,
            "surface": 50,
            "price_per_sqm": 7000,
            "opportunity_score": 72,
            "arrondissement": "75011",
            "url": "https://example.com/listing/1",
        }
        msg = _format_alert_message(listing)
        assert "Bel appartement" in msg
        assert "350 000" in msg
        assert "50" in msg
        assert "7 000" in msg
        assert "72" in msg
        assert "Paris 11e" in msg
        assert "https://example.com/listing/1" in msg

    def test_format_with_rooms_and_dpe(self):
        listing = {
            "title": "Test",
            "price": 200000,
            "surface": 30,
            "price_per_sqm": 6667,
            "opportunity_score": 65,
            "arrondissement": "75018",
            "url": "https://example.com",
            "rooms": 2,
            "dpe": "C",
        }
        msg = _format_alert_message(listing)
        assert "Pieces : 2" in msg
        assert "DPE : C" in msg

    def test_format_missing_fields_does_not_crash(self):
        listing = {}
        msg = _format_alert_message(listing)
        assert "opportunite" in msg.lower()

    def test_format_arrondissement_display(self):
        listing = {"arrondissement": "75001"}
        msg = _format_alert_message(listing)
        assert "Paris 1e" in msg
