"""Base scraper class that all source-specific scrapers inherit from."""

from __future__ import annotations

import asyncio
import logging
import random
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from config import config

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY = 5.0  # seconds, will be multiplied by attempt number


@dataclass
class RawListing:
    """Raw listing data extracted from a source."""
    source: str
    source_id: str
    url: str
    title: str
    price: int | None = None
    surface: float | None = None
    rooms: int | None = None
    arrondissement: str | None = None
    description: str | None = None
    floor: int | None = None
    has_elevator: bool | None = None
    dpe: str | None = None
    charges: float | None = None
    seller_type: str | None = None
    photos: list[str] = field(default_factory=list)
    published_at: str | None = None

    def to_db_dict(self) -> dict[str, Any]:
        """Convert to a dict suitable for database insertion."""
        d = {
            "source": self.source,
            "source_id": self.source_id,
            "url": self.url,
            "title": self.title,
            "price": self.price,
            "surface": self.surface,
            "rooms": self.rooms,
            "arrondissement": self.arrondissement,
            "description": self.description,
            "floor": self.floor,
            "has_elevator": self.has_elevator,
            "dpe": self.dpe,
            "charges": self.charges,
            "seller_type": self.seller_type,
            "photos": self.photos,
            "published_at": self.published_at,
        }
        # Calculate price per sqm
        if self.price and self.surface and self.surface > 0:
            d["price_per_sqm"] = round(self.price / self.surface, 2)
        return d

    def is_valid(self) -> bool:
        """Check if the listing has enough data to be useful."""
        return bool(self.price and self.surface and self.surface > 0)


def parse_arrondissement(text: str) -> str | None:
    """Extract Paris arrondissement code from text.
    Returns '75001' to '75020' or None.
    """
    patterns = [
        r"750(\d{2})",                    # 75001, 75012
        r"Paris\s+(\d{1,2})(?:e|er|eme|ème)",  # Paris 10e, Paris 1er
        r"Paris\s+(\d{1,2})\b",           # Paris 10
        r"(\d{1,2})(?:e|er|eme|ème)\s+arr",    # 10e arr
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            num = groups[0]
            if len(num) <= 2:
                num = int(num)
                if 1 <= num <= 20:
                    return f"750{num:02d}"
            elif len(num) == 2:
                # Already from 750XX pattern
                full = int(f"750{num}")
                if 75001 <= full <= 75020:
                    return f"750{num}"
    return None


class BaseScraper(ABC):
    """Abstract base class for real estate scrapers."""

    source_name: str = ""

    def __init__(self):
        self.delay_min = config.request_delay_min
        self.delay_max = config.request_delay_max
        self.max_pages = config.max_pages_per_source

    async def random_delay(self) -> None:
        """Wait a random amount of time between requests."""
        delay = random.uniform(self.delay_min, self.delay_max)
        await asyncio.sleep(delay)

    @abstractmethod
    async def scrape(self) -> list[RawListing]:
        """Scrape listings from the source. Returns a list of RawListings."""
        ...

    async def run(self) -> list[RawListing]:
        """Run the scraper with retry logic and error handling."""
        logger.info(f"[{self.source_name}] Starting scrape...")

        last_error: Exception | None = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                listings = await self.scrape()
                valid = [l for l in listings if l.is_valid()]
                logger.info(
                    f"[{self.source_name}] Found {len(listings)} listings, "
                    f"{len(valid)} valid (with price + surface)"
                )
                if attempt > 1:
                    logger.info(f"[{self.source_name}] Succeeded on attempt {attempt}")
                return valid
            except Exception as e:
                last_error = e
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * attempt
                    logger.warning(
                        f"[{self.source_name}] Attempt {attempt}/{MAX_RETRIES} failed: {e}. "
                        f"Retrying in {delay:.0f}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.exception(
                        f"[{self.source_name}] All {MAX_RETRIES} attempts failed"
                    )

        return []
