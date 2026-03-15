"""LeBonCoin scraper using their internal API.

LeBonCoin uses DataDome anti-bot which blocks Playwright on servers.
This scraper uses the LeBonCoin internal API (api.leboncoin.fr) which
is more reliable than browser scraping on headless servers.
"""

from __future__ import annotations

import json
import logging

import httpx

from scrapers.base import BaseScraper, RawListing, parse_arrondissement

logger = logging.getLogger(__name__)

# LeBonCoin internal search API
API_URL = "https://api.leboncoin.fr/finder/search"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://www.leboncoin.fr",
    "Referer": "https://www.leboncoin.fr/recherche?category=9&locations=Paris&real_estate_type=2",
    "api_key": "ba0c2dad52b3ec",
}

MAX_PAGES = 5


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
        # Longer delays for LBC
        self.delay_min = 3.0
        self.delay_max = 7.0

    def _build_search_payload(self, page: int) -> dict:
        """Build the JSON payload for the search API."""
        return {
            "limit": 35,
            "limit_alu": 0,
            "offset": (page - 1) * 35,
            "filters": {
                "category": {"id": "9"},  # Ventes immobilières
                "enums": {
                    "real_estate_type": ["2"],  # Appartement
                    "ad_type": ["offer"],
                },
                "location": {
                    "locations": [
                        {
                            "locationType": "city",
                            "label": "Paris",
                            "city": "Paris",
                            "zipcode": "75000",
                            "department_id": "75",
                            "region_id": "12",
                        }
                    ]
                },
            },
            "sort_by": "time",
            "sort_order": "desc",
        }

    def _parse_ad(self, ad: dict) -> RawListing | None:
        """Parse a single ad from LeBonCoin's API response."""
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
        urls = images.get("urls", []) or images.get("urls_large", [])
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

    async def scrape(self) -> list[RawListing]:
        """Scrape via LeBonCoin API."""
        listings: list[RawListing] = []

        async with httpx.AsyncClient(
            headers=HEADERS,
            timeout=30.0,
            follow_redirects=True,
        ) as client:

            for page_num in range(1, MAX_PAGES + 1):
                payload = self._build_search_payload(page_num)
                logger.info(f"[leboncoin] Scraping page {page_num}")

                try:
                    resp = await client.post(API_URL, json=payload)

                    if resp.status_code == 403:
                        logger.warning("[leboncoin] API returned 403 — DataDome blocked")
                        break
                    if resp.status_code == 401:
                        logger.warning("[leboncoin] API returned 401 — auth required")
                        break

                    resp.raise_for_status()
                    data = resp.json()

                except httpx.HTTPStatusError as e:
                    logger.warning(f"[leboncoin] Page {page_num} HTTP error: {e.response.status_code}")
                    break
                except Exception as e:
                    logger.warning(f"[leboncoin] Page {page_num} error: {e}")
                    break

                ads = data.get("ads", [])
                if not ads:
                    logger.info(f"[leboncoin] No more results at page {page_num}")
                    break

                for ad in ads:
                    listing = self._parse_ad(ad)
                    if listing:
                        listings.append(listing)

                total = data.get("total", 0)
                logger.info(f"[leboncoin] Page {page_num}: {len(ads)} ads (total: {total})")

                if page_num * 35 >= total:
                    break

                await self.random_delay()

        # If API failed, try Playwright fallback on headless
        if not listings:
            logger.info("[leboncoin] API returned no results, trying Playwright fallback")
            listings = await self._scrape_playwright_fallback()

        return listings

    async def _scrape_playwright_fallback(self) -> list[RawListing]:
        """Fallback: use Playwright in headless mode with stealth."""
        listings: list[RawListing] = []

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.warning("[leboncoin] Playwright not available for fallback")
            return listings

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
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

                for page_num in range(1, 3):  # Only 2 pages for fallback
                    url = f"https://www.leboncoin.fr/recherche?category=9&locations=Paris&real_estate_type=2&page={page_num}"
                    logger.info(f"[leboncoin] Playwright fallback page {page_num}")

                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                        await page.wait_for_timeout(5000)
                    except Exception as e:
                        logger.warning(f"[leboncoin] Playwright page {page_num} failed: {e}")
                        break

                    # Check for DataDome
                    content = await page.content()
                    if "datadome" in content.lower() or "captcha" in content.lower():
                        logger.warning("[leboncoin] DataDome challenge detected")
                        break

                    # Try to extract __NEXT_DATA__
                    try:
                        next_data_el = await page.query_selector("script#__NEXT_DATA__")
                        if next_data_el:
                            text = await next_data_el.inner_text()
                            data = json.loads(text)
                            ads = self._extract_ads_from_next_data(data)
                            for ad in ads:
                                listing = self._parse_ad(ad)
                                if listing:
                                    listings.append(listing)
                            logger.info(f"[leboncoin] Playwright page {page_num}: {len(ads)} ads")
                    except Exception as e:
                        logger.warning(f"[leboncoin] Playwright extract failed: {e}")

                    await self.random_delay()

                await browser.close()
        except Exception as e:
            logger.warning(f"[leboncoin] Playwright fallback failed entirely: {e}")

        return listings

    def _extract_ads_from_next_data(self, next_data: dict) -> list[dict]:
        """Extract ads from __NEXT_DATA__ JSON."""
        try:
            props = next_data.get("props", {})
            page_props = props.get("pageProps", {})

            for path in [
                lambda: page_props.get("initialProps", {}).get("searchData", {}).get("ads", []),
                lambda: page_props.get("searchData", {}).get("ads", []),
                lambda: page_props.get("ads", []),
            ]:
                ads = path()
                if ads:
                    return ads
            return []
        except Exception:
            return []
