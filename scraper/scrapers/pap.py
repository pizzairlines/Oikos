"""PAP.fr scraper using their internal search API.

PAP has an internal API for search results that returns JSON.
This avoids Cloudflare browser challenges entirely.
"""

from __future__ import annotations

import logging
import re

import httpx

from scrapers.base import BaseScraper, RawListing, parse_arrondissement

logger = logging.getLogger(__name__)

# PAP internal search API
SEARCH_URL = "https://ws.pap.fr/immobilier/annonces"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Referer": "https://www.pap.fr/annonce/vente-appartements-paris-75",
    "Origin": "https://www.pap.fr",
}

PAGE_SIZE = 30
MAX_PAGES = 8  # 240 listings max


class PAPScraper(BaseScraper):
    source_name = "pap"

    def _build_page_url(self, page_num: int) -> str:
        if page_num == 1:
            return "https://www.pap.fr/annonce/vente-appartements-paris-75-g439"
        return f"https://www.pap.fr/annonce/vente-appartements-paris-75-g439-{page_num}"

    def _parse_listing_api(self, ad: dict) -> RawListing | None:
        """Parse a listing from the PAP API response."""
        ad_id = ad.get("id")
        if not ad_id:
            return None

        # Price
        price = ad.get("prix")
        if not price:
            budget = ad.get("budget")
            if budget:
                price = budget.get("prix")

        # Surface
        surface = ad.get("surface")
        if not surface:
            surface = ad.get("nb_m2_terrain")

        # Rooms
        rooms = ad.get("nb_pieces")

        # Location
        arrondissement = None
        places = ad.get("_embedded", {}).get("place", [])
        if isinstance(places, list):
            for place in places:
                slug = place.get("slug", "")
                cp = place.get("code_postal", "")
                arrondissement = parse_arrondissement(cp) or parse_arrondissement(slug)
                if arrondissement:
                    break

        if not arrondissement:
            # Try from the title or description
            title_text = ad.get("titre", "")
            arrondissement = parse_arrondissement(title_text)

        # URL
        slug = ad.get("slug", "")
        if slug:
            url = f"https://www.pap.fr/annonces/{slug}-r{ad_id}"
        else:
            url = f"https://www.pap.fr/annonces/appartement-r{ad_id}"

        # Title
        title = ad.get("titre", "Appartement Paris")
        typebien = ad.get("typebien", "")
        if not title and typebien:
            title = f"{typebien} Paris"

        # Photos
        photos = []
        medias = ad.get("_embedded", {}).get("photo", [])
        if isinstance(medias, list):
            for media in medias[:5]:
                urls = media.get("_links", {})
                photo_url = None
                for key in ("default", "max", "desktop", "original"):
                    link = urls.get(key, {})
                    if isinstance(link, dict) and link.get("href"):
                        photo_url = link["href"]
                        break
                if photo_url:
                    photos.append(photo_url)

        # Floor
        floor = ad.get("etage")

        # DPE
        dpe = ad.get("classe_energie")

        # Description
        description = ad.get("texte", "")

        return RawListing(
            source="pap",
            source_id=str(ad_id),
            url=url,
            title=title.strip() if title else "Appartement Paris",
            price=int(price) if price else None,
            surface=float(surface) if surface else None,
            rooms=int(rooms) if rooms else None,
            arrondissement=arrondissement,
            description=description[:2000] if description else None,
            floor=int(floor) if floor else None,
            dpe=dpe,
            seller_type="particulier",  # PAP = always particulier
            photos=photos,
        )

    def _parse_listing_html(self, card_data: dict) -> RawListing | None:
        """Fallback: parse from HTML-style data."""
        # Not used in API mode, kept for compatibility
        return None

    async def scrape(self) -> list[RawListing]:
        listings: list[RawListing] = []

        # Try API approach first
        api_listings = await self._scrape_api()
        if api_listings:
            return api_listings

        # Fallback: try HTML scraping with httpx (no Playwright)
        logger.info("[pap] API failed, trying HTML fallback")
        return await self._scrape_html_fallback()

    async def _scrape_api(self) -> list[RawListing]:
        """Scrape via PAP internal API."""
        listings: list[RawListing] = []

        async with httpx.AsyncClient(headers=HEADERS, timeout=30.0, follow_redirects=True) as client:
            for page_num in range(1, MAX_PAGES + 1):
                params = {
                    "produit": "vente",
                    "typesbien": "appartement",
                    "geo_objets_ids": "75",  # Paris
                    "nb_resultats_par_page": str(PAGE_SIZE),
                    "page": str(page_num),
                    "tri": "date_classement",
                }

                try:
                    resp = await client.get(SEARCH_URL, params=params)
                    if resp.status_code == 403:
                        logger.warning("[pap] API returned 403 — blocked")
                        break
                    resp.raise_for_status()
                    data = resp.json()
                except httpx.HTTPStatusError as e:
                    logger.warning(f"[pap] API page {page_num} HTTP error: {e.response.status_code}")
                    break
                except Exception as e:
                    logger.warning(f"[pap] API page {page_num} error: {e}")
                    break

                # Parse ads from API response
                ads = data.get("_embedded", {}).get("annonce", [])
                if not ads:
                    logger.info(f"[pap] No more results at page {page_num}")
                    break

                for ad in ads:
                    listing = self._parse_listing_api(ad)
                    if listing:
                        listings.append(listing)

                total = data.get("nb_items", 0)
                logger.info(f"[pap] API page {page_num}: {len(ads)} ads (total: {total})")

                if page_num * PAGE_SIZE >= total:
                    break

                await self.random_delay()

        return listings

    async def _scrape_html_fallback(self) -> list[RawListing]:
        """Fallback: scrape search results HTML with httpx (no Playwright)."""
        listings: list[RawListing] = []

        headers = {
            **HEADERS,
            "Accept": "text/html,application/xhtml+xml",
        }

        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            for page_num in range(1, 4):  # Only 3 pages for fallback
                url = self._build_page_url(page_num)
                logger.info(f"[pap] HTML fallback page {page_num}: {url}")

                try:
                    resp = await client.get(url)
                    if resp.status_code == 403:
                        logger.warning("[pap] HTML blocked by Cloudflare")
                        break
                    resp.raise_for_status()
                except Exception as e:
                    logger.warning(f"[pap] HTML page {page_num} error: {e}")
                    break

                # Parse with BeautifulSoup
                try:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(resp.text, "lxml")

                    # Look for JSON-LD or embedded data
                    scripts = soup.find_all("script", type="application/ld+json")
                    for script in scripts:
                        try:
                            import json
                            data = json.loads(script.string)
                            if isinstance(data, list):
                                for item in data:
                                    if item.get("@type") in ("Apartment", "Residence", "Product"):
                                        listing = self._parse_jsonld(item)
                                        if listing:
                                            listings.append(listing)
                        except Exception:
                            continue

                except Exception as e:
                    logger.warning(f"[pap] HTML parse error: {e}")
                    break

                await self.random_delay()

        return listings

    def _parse_jsonld(self, item: dict) -> RawListing | None:
        """Parse a JSON-LD item from PAP HTML."""
        try:
            url = item.get("url", "")
            name = item.get("name", "Appartement Paris")
            price = None
            offers = item.get("offers", {})
            if offers:
                price = offers.get("price")

            source_id = re.search(r"r(\d+)", url)
            sid = source_id.group(1) if source_id else url.split("/")[-1]

            return RawListing(
                source="pap",
                source_id=str(sid),
                url=f"https://www.pap.fr{url}" if url.startswith("/") else url,
                title=name,
                price=int(price) if price else None,
                seller_type="particulier",
            )
        except Exception:
            return None
