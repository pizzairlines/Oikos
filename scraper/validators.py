"""Data validation for incoming listings.

Catches aberrant data before it reaches the database or scoring engine.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Reasonable bounds for Paris real estate
MIN_PRICE = 10_000         # 10k€ — anything below is certainly wrong
MAX_PRICE = 20_000_000     # 20M€ — ultra-luxury cap
MIN_SURFACE = 5.0          # 5m² — smallest legal habitable surface
MAX_SURFACE = 500.0        # 500m² — beyond this is clearly wrong data
MIN_PRICE_PER_SQM = 1_000  # 1k€/m² — suspiciously low even for Paris
MAX_PRICE_PER_SQM = 30_000 # 30k€/m² — highest Paris luxury
VALID_DPE_GRADES = {"A", "B", "C", "D", "E", "F", "G"}
VALID_ARRONDISSEMENTS = {f"750{i:02d}" for i in range(1, 21)}


@dataclass
class ValidationResult:
    """Result of validating a listing."""
    is_valid: bool
    warnings: list[str]
    errors: list[str]


def validate_listing(listing: dict) -> ValidationResult:
    """Validate a listing dict and return detailed results.

    Returns:
        ValidationResult with is_valid=False if the listing should be excluded,
        and warnings for suspicious but non-fatal issues.
    """
    errors: list[str] = []
    warnings: list[str] = []

    # --- Required fields ---
    price = listing.get("price")
    surface = listing.get("surface")

    if price is None:
        errors.append("missing_price")
    elif not isinstance(price, (int, float)):
        errors.append(f"invalid_price_type: {type(price).__name__}")
    elif price <= 0:
        errors.append(f"non_positive_price: {price}")
    elif price < MIN_PRICE:
        errors.append(f"price_too_low: {price} < {MIN_PRICE}")
    elif price > MAX_PRICE:
        warnings.append(f"price_very_high: {price} > {MAX_PRICE}")

    if surface is None:
        errors.append("missing_surface")
    elif not isinstance(surface, (int, float)):
        errors.append(f"invalid_surface_type: {type(surface).__name__}")
    elif surface <= 0:
        errors.append(f"non_positive_surface: {surface}")
    elif surface < MIN_SURFACE:
        errors.append(f"surface_too_small: {surface} < {MIN_SURFACE}")
    elif surface > MAX_SURFACE:
        warnings.append(f"surface_very_large: {surface} > {MAX_SURFACE}")

    # --- Price per sqm sanity check ---
    price_per_sqm = listing.get("price_per_sqm")
    if price_per_sqm is not None:
        if price_per_sqm < MIN_PRICE_PER_SQM:
            warnings.append(f"price_per_sqm_suspiciously_low: {price_per_sqm}")
        elif price_per_sqm > MAX_PRICE_PER_SQM:
            warnings.append(f"price_per_sqm_suspiciously_high: {price_per_sqm}")

    # --- Optional field validation ---
    dpe = listing.get("dpe")
    if dpe is not None and dpe.upper() not in VALID_DPE_GRADES:
        warnings.append(f"invalid_dpe: {dpe}")

    arrondissement = listing.get("arrondissement")
    if arrondissement is not None and arrondissement not in VALID_ARRONDISSEMENTS:
        warnings.append(f"invalid_arrondissement: {arrondissement}")

    rooms = listing.get("rooms")
    if rooms is not None:
        if not isinstance(rooms, int) or rooms < 1 or rooms > 20:
            warnings.append(f"suspicious_rooms: {rooms}")

    floor = listing.get("floor")
    if floor is not None:
        if not isinstance(floor, int) or floor < 0 or floor > 30:
            warnings.append(f"suspicious_floor: {floor}")

    # --- Cross-field consistency checks ---
    if price and surface and surface > 0:
        computed_ppsm = price / surface
        if computed_ppsm < 500:
            warnings.append(f"computed_price_per_sqm_too_low: {computed_ppsm:.0f}")

    if rooms and surface:
        sqm_per_room = surface / rooms
        if sqm_per_room < 5:
            warnings.append(f"surface_per_room_too_small: {sqm_per_room:.1f}m²/room")

    is_valid = len(errors) == 0
    return ValidationResult(is_valid=is_valid, warnings=warnings, errors=errors)


def sanitize_listing(listing: dict) -> dict:
    """Clean and normalize listing data before storage.

    Returns a new dict with sanitized values. Does not modify the original.
    """
    cleaned = dict(listing)

    # Normalize DPE to uppercase
    if cleaned.get("dpe"):
        cleaned["dpe"] = cleaned["dpe"].upper().strip()
        if cleaned["dpe"] not in VALID_DPE_GRADES:
            cleaned["dpe"] = None

    # Strip whitespace from title
    if cleaned.get("title"):
        cleaned["title"] = cleaned["title"].strip()

    # Ensure price_per_sqm is recalculated consistently
    price = cleaned.get("price")
    surface = cleaned.get("surface")
    if price and surface and surface > 0:
        cleaned["price_per_sqm"] = round(price / surface, 2)

    # Cap photos list
    if cleaned.get("photos") and len(cleaned["photos"]) > 10:
        cleaned["photos"] = cleaned["photos"][:10]

    # Truncate description
    if cleaned.get("description") and len(cleaned["description"]) > 2000:
        cleaned["description"] = cleaned["description"][:2000]

    return cleaned
