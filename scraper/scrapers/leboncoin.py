"""LeBonCoin scraper using Playwright with stealth measures.

LeBonCoin uses DataDome anti-bot protection which is very aggressive.
This scraper uses Playwright in non-headless mode with stealth techniques.
Data is extracted from the __NEXT_DATA__ JSON embedded in pages.
"""

from __future__ import annotations

import json
import logging
import re

from playwright.async_api import async_playwright, Page

from scrapers.base import BaseScraper, RawListing, parse_arrondissement

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.leboncoin.fr/recherche"
MAX_PAGES = 5  # Keep low to reduce detection risk


def _get_attribute(attributes: list[dict], key: str) -> str | None:
    """Extract a value from LeBonCoin's attributes array."""
    for attr in attributes:
        if attr.get("key") == key:
            return attr.get("value")
    return None


class LeBonCoinScraper(BaseScraper):
    source_name = "leboncoin"

    def __init__(self):
        super().__init__()
        # Longer delays for LBC due to aggressive anti-bot
        self.delay_min = 5.0
        self.delay_max = 12.0

    def _build_search_url(self, page: int) -> str:
        params = {
            "category": "9",  # ventes immobilieres
            "locations": "Paris",
            "real_estate_type": "2",  # apartments
            "page": str(page),
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{SEARCH_URL}?{query}"

    def _parse_next_data_ads(self, next_data: dict) -> list[dict]:
        """Extract ads from __NEXT_DATA__ JSON structure."""
        try:
            # Try the known path for search results
            props = next_data.get("props", {})
            page_props = props.get("pageProps", {})

            # Path varies — try multiple known locations
            # Path 1: initialProps.searchData.ads
            initial = page_props.get("initialProps", {})
            search_data = initial.get("searchData", {})
            ads = search_data.get("ads", [])
            if ads:
                return ads

            # Path 2: searchData.ads (direct)
            search_data = page_props.get("searchData", {})
            ads = search_data.get("ads", [])
            if ads:
                return ads

            # Path 3: ads directly in pageProps
            ads = page_props.get("ads", [])
            if ads:
                return ads

            logger.warning("[leboncoin] Could not find ads in __NEXT_DATA__")
            return []
        except Exception as e:
            logger.warning(f"[leboncoin] Error parsing __NEXT_DATA__: {e}")
            return []

    def _parse_ad(self, ad: dict) -> RawListing | None:
        """Parse a single ad from LeBonCoin's JSON format."""
        list_id = ad.get("list_id")
        if not list_id:
            return None

        # Price
        price = None
        price_data = ad.get("price", [])
        if isinstance(price_data, list) and price_data:
            price = int(price_data[0])
        elif isinstance(price_data, (int, float)):
            price = int(price_data)

        # Location
        location = ad.get("location", {})
        zipcode = location.get("zipcode", "")
        city = location.get("city", "")
        arrondissement = parse_arrondissement(zipcode) or parse_arrondissement(city)

        # URL
        url_path = ad.get("url", "")
        url = f"https://www.leboncoin.fr{url_path}" if url_path.startswith("/") else url_path
        if not url:
            url = f"https://www.leboncoin.fr/ad/ventes_immobilieres/{list_id}"

        # Title
        title = ad.get("subject", "Appartement Paris")

        # Images
        photos = []
        images = ad.get("images", {})
        urls = images.get("urls", [])
        photos = urls[:5] if urls else []

        # Attributes
        attributes = ad.get("attributes", [])

        # Surface
        surface = None
        surface_str = _get_attribute(attributes, "square")
        if surface_str:
            try:
                surface = float(surface_str)
            except (ValueError, TypeError):
                pass

        # Rooms
        rooms = None
        rooms_str = _get_attribute(attributes, "rooms")
        if rooms_str:
            try:
                rooms = int(rooms_str)
            except (ValueError, TypeError):
                pass

        # Floor
        floor = None
        floor_str = _get_attribute(attributes, "floor_number")
        if floor_str:
            try:
                floor = int(floor_str)
            except (ValueError, TypeError):
                pass

        # Elevator
        elevator_str = _get_attribute(attributes, "elevator")
        has_elevator = elevator_str == "1" if elevator_str else None

        # DPE
        dpe = _get_attribute(attributes, "energy_rate")

        # Seller type
        owner = ad.get("owner", {})
        owner_type = owner.get("type", "")
        seller_type = "agence" if owner_type == "pro" else "particulier"

        # Publication date
        pub_date = ad.get("first_publication_date")

        # Description
        description = ad.get("body", "")

        return RawListing(
            source="leboncoin",
            source_id=str(list_id),
            url=url,
            title=title,
            price=price,
            surface=surface,
            rooms=rooms,
            arrondissement=arrondissement,
            description=description[:2000] if description else None,
            floor=floor,
            has_elevator=has_elevator,
            dpe=dpe,
            seller_type=seller_type,
            photos=photos,
            published_at=pub_date,
        )

    async def _extract_from_page(self, page: Page) -> list[RawListing]:
        """Extract listings from __NEXT_DATA__ on the current page."""
        listings: list[RawListing] = []

        try:
            # Wait for the page to be loaded
            await page.wait_for_load_state("domcontentloaded")
            await page.wait_for_timeout(2000)

            # Extract __NEXT_DATA__ JSON
            next_data_el = await page.query_selector("script#__NEXT_DATA__")
            if not next_data_el:
                logger.warning("[leboncoin] No __NEXT_DATA__ found — may be blocked")
                return listings

            next_data_text = await next_data_el.inner_text()
            next_data = json.loads(next_data_text)

            ads = self._parse_next_data_ads(next_data)
            for ad in ads:
                listing = self._parse_ad(ad)
                if listing:
                    listings.append(listing)

        except Exception as e:
            logger.warning(f"[leboncoin] Failed to extract from page: {e}")

        return listings

    async def scrape(self) -> list[RawListing]:
        listings: list[RawListing] = []

        async with async_playwright() as p:
            # Use non-headless for better anti-bot evasion
            browser = await p.chromium.launch(
                headless=False,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                ],
            )
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1366, "height": 768},
                locale="fr-FR",
                timezone_id="Europe/Paris",
            )

            # Stealth: mask webdriver detection
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
                Object.defineProperty(navigator, 'languages', {get: () => ['fr-FR', 'fr', 'en-US', 'en']});
                window.chrome = {runtime: {}};
            """)

            page = await context.new_page()

            for page_num in range(1, MAX_PAGES + 1):
                url = self._build_search_url(page_num)
                logger.info(f"[leboncoin] Scraping page {page_num}: {url}")

                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    # Extra wait for DataDome challenge
                    await page.wait_for_timeout(5000)
                except Exception as e:
                    logger.warning(f"[leboncoin] Failed to load page {page_num}: {e}")
                    break

                # Check if we hit a DataDome challenge
                content = await page.content()
                if "datadome" in content.lower() or "captcha" in content.lower():
                    logger.warning("[leboncoin] DataDome challenge detected, stopping")
                    break

                page_listings = await self._extract_from_page(page)
                if not page_listings:
                    logger.info(f"[leboncoin] No listings on page {page_num}, stopping")
                    break

                listings.extend(page_listings)
                logger.info(f"[leboncoin] Page {page_num}: {len(page_listings)} listings")

                await self.random_delay()

            await browser.close()

        return listings
