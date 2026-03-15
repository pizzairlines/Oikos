"""Supabase database client for storing and retrieving listings."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from supabase import create_client, Client

from config import config

logger = logging.getLogger(__name__)


def get_client() -> Client:
    return create_client(config.supabase_url, config.supabase_key)


def upsert_listing(listing: dict[str, Any]) -> dict[str, Any] | None:
    """Insert or update a listing. Tracks price changes in price_history."""
    client = get_client()
    listing["updated_at"] = datetime.now(timezone.utc).isoformat()

    new_price = listing.get("price")

    # Check if price changed for existing listing
    if new_price:
        try:
            existing = (
                client.table("listings")
                .select("id,price")
                .eq("source", listing["source"])
                .eq("source_id", listing["source_id"])
                .maybe_single()
                .execute()
            )
            if existing.data and existing.data["price"] and existing.data["price"] != new_price:
                client.table("price_history").insert({
                    "listing_id": existing.data["id"],
                    "price": new_price,
                    "price_per_sqm": listing.get("price_per_sqm"),
                }).execute()
                logger.info(
                    f"[db] Price change: {existing.data['price']} -> {new_price} "
                    f"for {listing['source']}/{listing['source_id']}"
                )
        except Exception as e:
            logger.debug(f"[db] Price history check failed: {e}")

    # Upsert the listing
    result = (
        client.table("listings")
        .upsert(listing, on_conflict="source,source_id")
        .execute()
    )

    if result.data:
        row = result.data[0]
        # Record initial price for new listings
        if new_price:
            try:
                hist = (
                    client.table("price_history")
                    .select("id")
                    .eq("listing_id", row["id"])
                    .limit(1)
                    .execute()
                )
                if not hist.data:
                    client.table("price_history").insert({
                        "listing_id": row["id"],
                        "price": new_price,
                        "price_per_sqm": listing.get("price_per_sqm"),
                    }).execute()
            except Exception as e:
                logger.debug(f"[db] Initial price record failed: {e}")
        return row
    return None


def get_existing_source_ids(source: str) -> set[str]:
    """Get all source_ids for a given source to detect duplicates."""
    client = get_client()
    result = (
        client.table("listings")
        .select("source_id")
        .eq("source", source)
        .execute()
    )
    return {row["source_id"] for row in result.data}


def get_listings(
    min_price_sqm: float | None = None,
    max_price_sqm: float | None = None,
    min_surface: float | None = None,
    max_surface: float | None = None,
    min_score: float | None = None,
    arrondissements: list[str] | None = None,
    limit: int = 100,
    offset: int = 0,
    order_by: str = "opportunity_score",
    ascending: bool = False,
) -> list[dict]:
    """Fetch listings with filters."""
    client = get_client()
    query = client.table("listings").select("*").eq("is_active", True)

    if min_price_sqm is not None:
        query = query.gte("price_per_sqm", min_price_sqm)
    if max_price_sqm is not None:
        query = query.lte("price_per_sqm", max_price_sqm)
    if min_surface is not None:
        query = query.gte("surface", min_surface)
    if max_surface is not None:
        query = query.lte("surface", max_surface)
    if min_score is not None:
        query = query.gte("opportunity_score", min_score)
    if arrondissements:
        query = query.in_("arrondissement", arrondissements)

    query = query.order(order_by, desc=not ascending)
    query = query.range(offset, offset + limit - 1)

    result = query.execute()
    return result.data


def get_new_listings_since(since: datetime) -> list[dict]:
    """Get listings created after a given datetime."""
    client = get_client()
    result = (
        client.table("listings")
        .select("*")
        .eq("is_active", True)
        .gte("created_at", since.isoformat())
        .order("opportunity_score", desc=True)
        .execute()
    )
    return result.data


def get_alert_configs() -> list[dict]:
    """Get active alert configurations."""
    client = get_client()
    result = (
        client.table("alert_configs")
        .select("*")
        .eq("is_active", True)
        .execute()
    )
    return result.data


def record_alert(alert_config_id: str, listing_id: str) -> None:
    """Record that an alert was sent for a listing."""
    client = get_client()
    client.table("alert_history").upsert(
        {"alert_config_id": alert_config_id, "listing_id": listing_id},
        on_conflict="alert_config_id,listing_id",
    ).execute()


def get_sent_alert_listing_ids(alert_config_id: str) -> set[str]:
    """Get listing IDs that already triggered an alert."""
    client = get_client()
    result = (
        client.table("alert_history")
        .select("listing_id")
        .eq("alert_config_id", alert_config_id)
        .execute()
    )
    return {row["listing_id"] for row in result.data}


# ── Scraper run tracking ──

def record_scraper_start(scraper_name: str) -> str | None:
    """Record the start of a scraper run. Returns the run ID."""
    try:
        client = get_client()
        result = (
            client.table("scraper_runs")
            .insert({"scraper_name": scraper_name, "status": "running"})
            .execute()
        )
        if result.data:
            return result.data[0]["id"]
    except Exception as e:
        logger.debug(f"[db] Failed to record scraper start: {e}")
    return None


def record_scraper_end(
    run_id: str | None,
    status: str,
    listings_found: int = 0,
    listings_new: int = 0,
    listings_skipped: int = 0,
    error_message: str | None = None,
    duration: float | None = None,
) -> None:
    """Record the end of a scraper run."""
    if not run_id:
        return
    try:
        client = get_client()
        update: dict[str, Any] = {
            "status": status,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "listings_found": listings_found,
            "listings_new": listings_new,
            "listings_skipped": listings_skipped,
        }
        if error_message:
            update["error_message"] = error_message[:500]
        if duration is not None:
            update["duration_seconds"] = round(duration, 1)
        client.table("scraper_runs").update(update).eq("id", run_id).execute()
    except Exception as e:
        logger.debug(f"[db] Failed to record scraper end: {e}")
