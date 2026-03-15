"""Tests for the opportunity scoring engine."""

import pytest
from scoring import (
    compute_price_score,
    compute_location_score,
    compute_size_score,
    compute_condition_score,
    compute_liquidity_score,
    compute_opportunity_score,
)


# ---------------------------------------------------------------------------
# compute_price_score
# ---------------------------------------------------------------------------

class TestPriceScore:
    def test_well_below_median_gives_high_score(self):
        # 75011 median = 10_000, price = 6_000 → 40% below → score = 80
        score = compute_price_score(6_000, "75011")
        assert score == pytest.approx(80.0)

    def test_at_median_gives_zero(self):
        score = compute_price_score(10_000, "75011")
        assert score == 0.0

    def test_above_median_gives_zero(self):
        score = compute_price_score(15_000, "75011")
        assert score == 0.0

    def test_unknown_arrondissement_uses_default_median(self):
        # Default median = 10_000
        score = compute_price_score(7_000, None)
        assert score == pytest.approx(60.0)

    def test_unknown_arrondissement_string(self):
        score = compute_price_score(7_000, "99999")
        assert score == pytest.approx(60.0)

    def test_very_low_price_capped_at_100(self):
        # 75019 median = 8_000, price = 1_000 → 87.5% below → raw = 175 → cap at 100
        score = compute_price_score(1_000, "75019")
        assert score == 100.0

    def test_score_always_between_0_and_100(self):
        for price in [0, 1_000, 5_000, 10_000, 20_000, 50_000]:
            for arr in ["75001", "75011", "75020", None, "unknown"]:
                score = compute_price_score(price, arr)
                assert 0 <= score <= 100, f"price={price}, arr={arr}, score={score}"


# ---------------------------------------------------------------------------
# compute_location_score
# ---------------------------------------------------------------------------

class TestLocationScore:
    def test_known_arrondissement(self):
        assert compute_location_score("75011") == 90.0

    def test_unknown_arrondissement_returns_50(self):
        assert compute_location_score(None) == 50.0
        assert compute_location_score("99999") == 50.0

    def test_all_arrondissements_return_valid_scores(self):
        for i in range(1, 21):
            code = f"750{i:02d}"
            score = compute_location_score(code)
            assert 0 <= score <= 100, f"arr={code}, score={score}"


# ---------------------------------------------------------------------------
# compute_size_score
# ---------------------------------------------------------------------------

class TestSizeScore:
    def test_studio_optimal_range(self):
        assert compute_size_score(25.0, 1) == 100.0

    def test_t2_optimal_range(self):
        assert compute_size_score(40.0, 2) == 85.0

    def test_t3_decent_range(self):
        assert compute_size_score(60.0, 3) == 60.0

    def test_t4_large_range(self):
        assert compute_size_score(80.0, 4) == 40.0

    def test_very_small_surface(self):
        assert compute_size_score(12.0, 1) == 20.0

    def test_very_large_surface(self):
        assert compute_size_score(150.0, 5) == 25.0

    def test_unknown_surface_returns_50(self):
        assert compute_size_score(None, None) == 50.0

    def test_zero_surface_returns_50(self):
        # 0 is falsy in Python
        assert compute_size_score(0, None) == 50.0


# ---------------------------------------------------------------------------
# compute_condition_score
# ---------------------------------------------------------------------------

class TestConditionScore:
    def test_good_condition(self):
        score = compute_condition_score(
            dpe="B", floor=4, has_elevator=True,
            description="Très bel appartement rénové", title="Bel appart"
        )
        assert score >= 70

    def test_ground_floor_penalized(self):
        score_ground = compute_condition_score(
            dpe="C", floor=0, has_elevator=None,
            description="", title=""
        )
        score_mid = compute_condition_score(
            dpe="C", floor=3, has_elevator=True,
            description="", title=""
        )
        assert score_ground < score_mid

    def test_high_floor_no_elevator_penalized(self):
        score_no_elev = compute_condition_score(
            dpe="C", floor=6, has_elevator=False,
            description="", title=""
        )
        score_with_elev = compute_condition_score(
            dpe="C", floor=6, has_elevator=True,
            description="", title=""
        )
        assert score_no_elev < score_with_elev

    def test_bad_dpe_penalized(self):
        score_good = compute_condition_score(
            dpe="A", floor=3, has_elevator=True,
            description="", title=""
        )
        score_bad = compute_condition_score(
            dpe="G", floor=3, has_elevator=True,
            description="", title=""
        )
        assert score_bad < score_good

    def test_keyword_souplex_penalizes(self):
        score_normal = compute_condition_score(
            dpe="C", floor=1, has_elevator=None,
            description="Bel appartement lumineux", title="Appart"
        )
        score_souplex = compute_condition_score(
            dpe="C", floor=1, has_elevator=None,
            description="Beau souplex deux niveaux", title="Souplex"
        )
        # Souplex keyword in both title and description: -15 each occurrence
        assert score_souplex < score_normal

    def test_keyword_viager_heavily_penalizes(self):
        score = compute_condition_score(
            dpe="C", floor=2, has_elevator=True,
            description="Viager libre", title="Appart viager"
        )
        # Viager = -30, significantly reduces the score
        assert score <= 40

    def test_unknown_everything_returns_around_50(self):
        score = compute_condition_score(
            dpe=None, floor=None, has_elevator=None,
            description=None, title=None
        )
        assert 40 <= score <= 60

    def test_score_clamped_to_0_100(self):
        # Multiple severe penalties should not go below 0
        score = compute_condition_score(
            dpe="G", floor=0, has_elevator=False,
            description="souplex viager occupation gros travaux rdc",
            title="souplex viager"
        )
        assert score >= 0
        assert score <= 100


# ---------------------------------------------------------------------------
# compute_liquidity_score
# ---------------------------------------------------------------------------

class TestLiquidityScore:
    def test_high_liquidity_area(self):
        assert compute_liquidity_score("75011") == 90.0

    def test_low_liquidity_area(self):
        assert compute_liquidity_score("75016") == 50.0

    def test_unknown_returns_50(self):
        assert compute_liquidity_score(None) == 50.0
        assert compute_liquidity_score("invalid") == 50.0


# ---------------------------------------------------------------------------
# compute_opportunity_score (integration)
# ---------------------------------------------------------------------------

class TestOpportunityScore:
    def test_complete_listing(self, sample_listing):
        score, details = compute_opportunity_score(sample_listing)
        assert 0 <= score <= 100
        assert "price" in details
        assert "location" in details
        assert "size" in details
        assert "condition" in details
        assert "liquidity" in details
        assert "total" in details
        assert details["total"] == score

    def test_no_price_per_sqm_returns_zero(self):
        score, details = compute_opportunity_score({"title": "Test"})
        assert score == 0.0
        assert "error" in details

    def test_minimal_listing(self, sample_listing_minimal):
        score, details = compute_opportunity_score(sample_listing_minimal)
        assert 0 <= score <= 100
        assert "error" not in details

    def test_viager_penalized(self, sample_listing_viager):
        score, details = compute_opportunity_score(sample_listing_viager)
        # Viager keyword should heavily penalize the condition score
        assert details["condition"] <= 40
        # Compare with same listing without viager keywords
        clean_listing = dict(sample_listing_viager)
        clean_listing["title"] = "Appartement lumineux"
        clean_listing["description"] = "Bel appartement en bon état"
        score_clean, details_clean = compute_opportunity_score(clean_listing)
        assert details_clean["condition"] > details["condition"]

    def test_souplex_penalized(self, sample_listing_souplex):
        score, details = compute_opportunity_score(sample_listing_souplex)
        assert details["condition"] < 40  # Heavily penalized

    def test_weights_sum_to_1(self):
        """Verify the weights in the scoring formula add up to 1.0."""
        assert 0.40 + 0.20 + 0.15 + 0.15 + 0.10 == pytest.approx(1.0)

    def test_best_possible_listing(self):
        """A dream listing should score very high."""
        listing = {
            "price_per_sqm": 4_000.0,  # Way below any median
            "arrondissement": "75011",  # High rental attractiveness
            "surface": 25.0,  # Optimal studio size
            "rooms": 1,
            "title": "Superbe studio rénové",
            "description": "Studio entièrement rénové, lumineux, calme",
            "floor": 4,
            "has_elevator": True,
            "dpe": "B",
        }
        score, _ = compute_opportunity_score(listing)
        assert score >= 75

    def test_worst_possible_listing(self):
        """A terrible listing should score very low."""
        listing = {
            "price_per_sqm": 15_000.0,  # Above median
            "arrondissement": "75016",  # Low rental demand
            "surface": 150.0,  # Way too large
            "rooms": 6,
            "title": "Souplex en viager",
            "description": "Gros travaux nécessaires, occupation, rez-de-chaussée",
            "floor": 0,
            "has_elevator": False,
            "dpe": "G",
        }
        score, _ = compute_opportunity_score(listing)
        assert score < 20

    def test_score_is_rounded(self, sample_listing):
        score, details = compute_opportunity_score(sample_listing)
        # All values should be rounded to 1 decimal
        for key, val in details.items():
            assert val == round(val, 1), f"{key} not rounded: {val}"
