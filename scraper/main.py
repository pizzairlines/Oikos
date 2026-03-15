"""Main entry point for the real estate scraper.

Usage:
    python main.py --once        # Run all scrapers once
    python main.py --scraper bienici  # Run a specific scraper
    python main.py               # Start the scheduler (hourly)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv

load_dotenv()

from apscheduler.schedulers.blocking import BlockingScheduler

from config import config
import db
from scoring import compute_opportunity_score
from alerts import check_and_send_alerts
from validators import validate_listing, sanitize_listing
from scrapers.bienici import BienIciScraper
from scrapers.pap import PAPScraper
from scrapers.leboncoin import LeBonCoinScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("main")

SCRAPERS = {
    "bienici": BienIciScraper,
    # PAP and LeBonCoin disabled: their anti-bot protections (Cloudflare/DataDome)
    # block requests from cloud servers. Re-enable when residential proxies are set up.
    # "pap": PAPScraper,
    # "leboncoin": LeBonCoinScraper,
}


async def run_scraper(name: str) -> list[dict]:
    """Run a single scraper, score results, and store in DB."""
    scraper_class = SCRAPERS.get(name)
    if not scraper_class:
        logger.error(f"Unknown scraper: {name}")
        return []

    # Record scraper run start
    run_id = db.record_scraper_start(name)

    import time
    t0 = time.monotonic()

    try:
        scraper = scraper_class()
        raw_listings = await scraper.run()
    except Exception as e:
        db.record_scraper_end(run_id, "error", error_message=str(e))
        raise

    if not raw_listings:
        logger.info(f"[{name}] No valid listings found")
        db.record_scraper_end(run_id, "success", duration=time.monotonic() - t0)
        return []

    # Get existing IDs to track what's new
    existing_ids = db.get_existing_source_ids(name)
    stored_listings = []

    skipped = 0
    for raw in raw_listings:
        listing_data = raw.to_db_dict()

        # Sanitize data
        listing_data = sanitize_listing(listing_data)

        # Validate data
        validation = validate_listing(listing_data)
        if not validation.is_valid:
            logger.debug(
                f"[{name}] Skipping invalid listing {raw.source_id}: "
                f"{', '.join(validation.errors)}"
            )
            skipped += 1
            continue

        if validation.warnings:
            logger.debug(
                f"[{name}] Listing {raw.source_id} warnings: "
                f"{', '.join(validation.warnings)}"
            )

        # Filter by max price per sqm
        price_per_sqm = listing_data.get("price_per_sqm")
        if price_per_sqm and config.default_max_price_sqm:
            if price_per_sqm > config.default_max_price_sqm:
                skipped += 1
                continue

        # Compute opportunity score
        score, details = compute_opportunity_score(listing_data)
        listing_data["opportunity_score"] = score
        listing_data["score_details"] = details

        # Upsert to database
        result = db.upsert_listing(listing_data)
        if result:
            # Track if this is a new listing
            if raw.source_id not in existing_ids:
                stored_listings.append(result)

    duration = time.monotonic() - t0
    logger.info(
        f"[{name}] Stored {len(raw_listings) - skipped} listings "
        f"({skipped} skipped), {len(stored_listings)} new — {duration:.1f}s"
    )

    db.record_scraper_end(
        run_id, "success",
        listings_found=len(raw_listings),
        listings_new=len(stored_listings),
        listings_skipped=skipped,
        duration=duration,
    )

    return stored_listings


async def run_all_scrapers() -> list[dict]:
    """Run all scrapers sequentially and return new listings."""
    all_new: list[dict] = []

    for name in SCRAPERS:
        try:
            new_listings = await run_scraper(name)
            all_new.extend(new_listings)
        except Exception:
            logger.exception(f"Scraper {name} failed")

    return all_new


def scheduled_job():
    """Job executed by the scheduler."""
    logger.info("=== Starting scheduled scan ===")
    new_listings = asyncio.run(run_all_scrapers())

    # Check and send alerts for new listings
    if new_listings:
        alerts_sent = check_and_send_alerts(new_listings)
        logger.info(f"=== Scan complete: {len(new_listings)} new, {alerts_sent} alerts ===")
    else:
        logger.info("=== Scan complete: no new listings ===")


def main():
    parser = argparse.ArgumentParser(description="Real estate opportunity scraper")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--scraper", type=str, help="Run a specific scraper only")
    args = parser.parse_args()

    # Validate configuration before doing anything
    config.validate_or_exit()

    if args.once or args.scraper:
        # Single run mode
        if args.scraper:
            logger.info(f"Running scraper: {args.scraper}")
            new_listings = asyncio.run(run_scraper(args.scraper))
        else:
            logger.info("Running all scrapers once")
            new_listings = asyncio.run(run_all_scrapers())

        if new_listings:
            alerts_sent = check_and_send_alerts(new_listings)
            logger.info(f"Done: {len(new_listings)} new listings, {alerts_sent} alerts sent")
        else:
            logger.info("Done: no new listings")
    else:
        # Scheduler mode
        logger.info(f"Starting scheduler (every {config.scan_interval_minutes} minutes)")
        scheduler = BlockingScheduler()
        scheduler.add_job(
            scheduled_job,
            "interval",
            minutes=config.scan_interval_minutes,
            next_run_time=datetime.now(timezone.utc),  # Run immediately on start
        )
        try:
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Scheduler stopped")


if __name__ == "__main__":
    main()
