"""Opportunity scoring engine for real estate listings.

Score breakdown (0-100):
- Price score (35%): How far below market median the price/m² is
- Location score (20%): Rental attractiveness of the arrondissement
- Size score (15%): Optimal rental sizes (studios, 2P)
- Condition score (20%): DPE, floor, elevator, keywords
- Liquidity score (10%): Market liquidity for resale/rental
"""

from __future__ import annotations

import logging
import re

from config import config

logger = logging.getLogger(__name__)

# Market liquidity score per arrondissement (0-100)
# Higher = easier to rent/resell
LIQUIDITY_SCORES = {
    "75001": 65, "75002": 70, "75003": 75, "75004": 70,
    "75005": 75, "75006": 65, "75007": 60, "75008": 55,
    "75009": 80, "75010": 85, "75011": 90, "75012": 75,
    "75013": 75, "75014": 70, "75015": 70, "75016": 50,
    "75017": 70, "75018": 85, "75019": 80, "75020": 80,
}

# Optimal rental surface ranges
# Studios/T1: 18-30m², T2: 30-50m², T3: 50-70m²
OPTIMAL_RANGES = [
    (18, 30, 100),   # Studio/T1 — highest rental demand
    (30, 50, 85),    # T2 — very good
    (50, 70, 60),    # T3 — decent
    (70, 100, 40),   # T4+ — less ideal for pure rental
]

# DPE scores (higher = better)
# F and G are heavily penalized: rental ban since 2025 (F) and 2028 (E planned)
DPE_SCORES = {
    "A": 100, "B": 90, "C": 75, "D": 55,
    "E": 30, "F": 5, "G": 0,
}

# Keywords indicating potential issues (in description/title)
PENALTY_KEYWORDS = {
    "souplex": -15,
    "sous-sol": -15,
    "rdc": -5,
    "rez-de-chaussée": -5,
    "rez de chaussée": -5,
    "à rénover": -5,
    "a renover": -5,
    "gros travaux": -10,
    "ravalement": -3,
    "occupation": -20,  # occupé = très risqué
    "viager": -30,
}


def compute_price_score(price_per_sqm: float, arrondissement: str | None) -> float:
    """Score based on how far below market median the price is (0-100).

    Uses a two-tier curve:
    - 0-20% below median: gradual ramp (0 → 50)
    - 20-50%+ below median: steeper ramp (50 → 100)
    This prevents all cheap-arrondissement listings from clustering at 100.
    """
    if not arrondissement or arrondissement not in config.arrondissement_median_prices:
        median = 10000
    else:
        median = config.arrondissement_median_prices[arrondissement]

    if price_per_sqm >= median:
        return 0.0

    discount_pct = (median - price_per_sqm) / median * 100

    if discount_pct <= 20:
        # 0-20% discount → 0-50 score (2.5 points per %)
        return discount_pct * 2.5
    else:
        # 20-50% discount → 50-100 score (~1.67 points per %)
        extra = discount_pct - 20
        return min(50 + extra * (50 / 30), 100.0)


def compute_location_score(arrondissement: str | None) -> float:
    """Score based on rental attractiveness of the arrondissement (0-100)."""
    if not arrondissement or arrondissement not in config.rental_attractiveness:
        return 50.0  # Unknown = average
    return float(config.rental_attractiveness[arrondissement])


def compute_size_score(surface: float | None, rooms: int | None) -> float:
    """Score based on how well the size fits rental demand (0-100)."""
    if not surface:
        return 50.0  # Unknown = average

    # Check optimal ranges
    for min_s, max_s, score in OPTIMAL_RANGES:
        if min_s <= surface <= max_s:
            return float(score)

    # Below minimum or above maximum
    if surface < 18:
        return 20.0  # Too small
    if surface > 100:
        return 25.0  # Too large for rental

    return 50.0


def compute_condition_score(
    dpe: str | None,
    floor: int | None,
    has_elevator: bool | None,
    description: str | None,
    title: str | None,
) -> float:
    """Score based on property condition indicators (0-100)."""
    scores = []

    # DPE score
    if dpe and dpe.upper() in DPE_SCORES:
        scores.append(DPE_SCORES[dpe.upper()])
    else:
        scores.append(50)  # Unknown DPE = average

    # Floor score
    if floor is not None:
        if floor == 0:
            scores.append(20)   # Ground floor = less desirable
        elif floor <= 2:
            scores.append(65)   # Low floors OK
        elif floor <= 5:
            scores.append(85)   # Mid floors ideal
        else:
            # High floor — good if elevator, bad if not
            if has_elevator:
                scores.append(90)
            else:
                scores.append(40)
    else:
        scores.append(60)  # Unknown floor

    # Elevator (only relevant for upper floors)
    if floor is not None and floor >= 3:
        if has_elevator:
            scores.append(90)
        elif has_elevator is False:
            scores.append(30)
        else:
            scores.append(50)

    # Keyword penalties from description/title
    penalty = 0
    text = f"{title or ''} {description or ''}".lower()
    for keyword, pts in PENALTY_KEYWORDS.items():
        if keyword in text:
            penalty += pts

    base_score = sum(scores) / len(scores) if scores else 50
    return max(0, min(100, base_score + penalty))


def compute_liquidity_score(arrondissement: str | None) -> float:
    """Score based on market liquidity (ease of renting/reselling)."""
    if not arrondissement or arrondissement not in LIQUIDITY_SCORES:
        return 50.0
    return float(LIQUIDITY_SCORES[arrondissement])


def compute_opportunity_score(listing: dict) -> tuple[float, dict]:
    """Compute the overall opportunity score for a listing.

    Returns:
        (score, score_details) where score is 0-100 and score_details
        is a dict with individual component scores.
    """
    price_per_sqm = listing.get("price_per_sqm")
    if not price_per_sqm:
        return 0.0, {"error": "no price_per_sqm"}

    arrondissement = listing.get("arrondissement")

    price = compute_price_score(price_per_sqm, arrondissement)
    location = compute_location_score(arrondissement)
    size = compute_size_score(listing.get("surface"), listing.get("rooms"))
    condition = compute_condition_score(
        listing.get("dpe"),
        listing.get("floor"),
        listing.get("has_elevator"),
        listing.get("description"),
        listing.get("title"),
    )
    liquidity = compute_liquidity_score(arrondissement)

    # Weighted total
    total = (
        price * 0.35
        + location * 0.20
        + size * 0.15
        + condition * 0.20
        + liquidity * 0.10
    )

    details = {
        "price": round(price, 1),
        "location": round(location, 1),
        "size": round(size, 1),
        "condition": round(condition, 1),
        "liquidity": round(liquidity, 1),
        "total": round(total, 1),
    }

    return round(total, 1), details
