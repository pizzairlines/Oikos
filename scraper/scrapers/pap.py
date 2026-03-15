"""PAP.fr scraper using Playwright (Cloudflare protected)."""

from __future__ import annotations

import logging
import re

from playwright.async_api import async_playwright, Page

from scrapers.base import BaseScraper, RawListing, parse_arrondissement

logger = logging.getLogger(__name__)

BASE_URL = "https://www.pap.fr/annonce/vente-appartements-paris-75-g439"
MAX_PAGES = 10


class PAPScraper(BaseScraper):
    source_name = "pap"

    def _build_page_url(self, page_num: int) -> str:
        if page_num == 1:
            return BASE_URL
        return f"{BASE_URL}-{page_num}"

    async def _extract_listings_from_page(self, page: Page) -> list[RawListing]:
        """Extract listing data from a search results page."""
        listings: list[RawListing] = []

        # Wait for listing cards to load
        try:
            await page.wait_for_selector("[data-controller='search-results'] .search-list-item, .search-results-item", timeout=10000)
        except Exception:
            logger.warning("[pap] No listing cards found on page")
            return listings

        # Get all listing card elements
        cards = await page.query_selector_all("[data-controller='search-results'] .search-list-item, .search-results-item")

        for card in cards:
            try:
                listing = await self._parse_card(card, page)
                if listing:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"[pap] Failed to parse card: {e}")
                continue

        return listings

    async def _parse_card(self, card, page: Page) -> RawListing | None:
        """Parse a single listing card element."""
        # Try to get the link and ID
        link_el = await card.query_selector("a[href*='/annonces/']")
        if not link_el:
            link_el = await card.query_selector("a")

        href = await link_el.get_attribute("href") if link_el else None
        if not href:
            return None

        url = f"https://www.pap.fr{href}" if href.startswith("/") else href

        # Extract source ID from URL
        source_id_match = re.search(r"-r(\d+)", href)
        if not source_id_match:
            # Try data-annonce attribute
            annonce_el = await card.query_selector("a[data-annonce]")
            if annonce_el:
                source_id = await annonce_el.get_attribute("data-annonce")
            else:
                source_id = href.split("/")[-1]
        else:
            source_id = source_id_match.group(1)

        if not source_id:
            return None

        # Title
        title_el = await card.query_selector(".item-title, h2, .h1, span.h1")
        title = await title_el.inner_text() if title_el else "Appartement Paris"
        title = title.strip()

        # Price
        price = None
        price_el = await card.query_selector(".item-price, .price, span.price")
        if price_el:
            price_text = await price_el.inner_text()
            price_clean = re.sub(r"[^\d]", "", price_text)
            if price_clean:
                price = int(price_clean)

        # Surface and rooms from tags/details
        surface = None
        rooms = None
        tags_els = await card.query_selector_all(".item-tags li, .item-description span, .item-tags span")
        for tag_el in tags_els:
            tag_text = await tag_el.inner_text()
            tag_text = tag_text.strip().lower()

            # Surface: "45 m²" or "45m²"
            surface_match = re.search(r"(\d+(?:[,.]\d+)?)\s*m[²2]", tag_text)
            if surface_match and not surface:
                surface = float(surface_match.group(1).replace(",", "."))

            # Rooms: "3 pièces" or "3p" or "studio"
            rooms_match = re.search(r"(\d+)\s*(?:pi[èe]ces?|p\b)", tag_text)
            if rooms_match and not rooms:
                rooms = int(rooms_match.group(1))
            elif "studio" in tag_text:
                rooms = 1

        # Location / arrondissement
        arrondissement = None
        loc_el = await card.query_selector(".item-description strong, .item-location, .item-city")
        if loc_el:
            loc_text = await loc_el.inner_text()
            arrondissement = parse_arrondissement(loc_text)

        # If no arrondissement from location, try title
        if not arrondissement:
            arrondissement = parse_arrondissement(title)

        # Photo
        photos = []
        img_el = await card.query_selector("img[src*='photo'], img.img-fluid, img[data-src]")
        if img_el:
            img_src = await img_el.get_attribute("src") or await img_el.get_attribute("data-src")
            if img_src and not img_src.startswith("data:"):
                photos.append(img_src)

        return RawListing(
            source="pap",
            source_id=str(source_id),
            url=url,
            title=title,
            price=price,
            surface=surface,
            rooms=rooms,
            arrondissement=arrondissement,
            photos=photos,
            seller_type="particulier",  # PAP = always particulier
        )

    async def scrape(self) -> list[RawListing]:
        listings: list[RawListing] = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                locale="fr-FR",
            )
            page = await context.new_page()

            for page_num in range(1, MAX_PAGES + 1):
                url = self._build_page_url(page_num)
                logger.info(f"[pap] Scraping page {page_num}: {url}")

                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    # Wait a bit for Cloudflare challenge to resolve
                    await page.wait_for_timeout(3000)
                except Exception as e:
                    logger.warning(f"[pap] Failed to load page {page_num}: {e}")
                    break

                page_listings = await self._extract_listings_from_page(page)
                if not page_listings:
                    logger.info(f"[pap] No listings found on page {page_num}, stopping")
                    break

                listings.extend(page_listings)
                logger.info(f"[pap] Page {page_num}: {len(page_listings)} listings")

                # Check if there's a next page
                next_link = await page.query_selector(f"a[href*='-{page_num + 1}']")
                if not next_link:
                    logger.info("[pap] No more pages")
                    break

                await self.random_delay()

            await browser.close()

        return listings
