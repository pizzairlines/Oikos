"""BienIci scraper using their internal JSON API."""

from __future__ import annotations

import json
import logging
import urllib.parse

import httpx

from scrapers.base import BaseScraper, RawListing, parse_arrondissement

logger = logging.getLogger(__name__)

SUGGEST_URL = "https://res.bienici.com/suggest.json"
SEARCH_URL = "https://www.bienici.com/realEstateAds.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.bienici.com/recherche/achat/paris/appartement",
    "X-Requested-With": "XMLHttpRequest",
}

PAGE_SIZE = 24
MAX_PAGES = 10  # 240 listings max per run


class BienIciScraper(BaseScraper):
    source_name = "bienici"

    async def _get_zone_ids(self, client: httpx.AsyncClient) -> list[str]:
        """Get BienIci zone IDs for Paris."""
        resp = await client.get(SUGGEST_URL, params={"q": "Paris"})
        resp.raise_for_status()
        suggestions = resp.json()
        # First result for "Paris" should have zone IDs
        for suggestion in suggestions:
            zone_ids = suggestion.get("zoneIds", [])
            if zone_ids:
                return zone_ids
        raise ValueError("No zone IDs found for Paris")

    def _build_filters(self, zone_ids: list[str], page: int) -> str:
        """Build the filters JSON for the search API."""
        filters = {
            "size": PAGE_SIZE,
            "from": (page - 1) * PAGE_SIZE,
            "page": page,
            "filterType": "buy",
            "propertyType": ["flat"],
            "onTheMarket": [True],
            "zoneIdsByTypes": {"zoneIds": zone_ids},
            "sortBy": "publicationDate",
            "sortOrder": "desc",
            "showAllModels": False,
        }
        return json.dumps(filters, separators=(",", ":"))

    def _parse_listing(self, ad: dict) -> RawListing | None:
        """Parse a single ad from the API response into a RawListing."""
        ad_id = ad.get("id")
        if not ad_id:
            return None

        price = ad.get("price")
        surface = ad.get("surfaceArea")
        postal_code = ad.get("postalCode", "")
        city = ad.get("city", "")

        # Build URL
        slug = ad.get("slug", "")
        url = f"https://www.bienici.com/annonce/{slug}" if slug else f"https://www.bienici.com/annonce/{ad_id}"

        # Parse arrondissement from postal code or city name
        arrondissement = parse_arrondissement(postal_code) or parse_arrondissement(city)

        # Photos
        photos = []
        for photo in ad.get("photos", []):
            photo_url = photo.get("url") or photo.get("url_photo")
            if photo_url:
                photos.append(photo_url)

        # DPE
        dpe = ad.get("energyClassification")

        # Floor
        floor = ad.get("floor")

        # Elevator
        has_elevator = ad.get("hasElevator")

        # Description
        description = ad.get("description", "")

        # Seller type
        is_pro = ad.get("adCreatedByPro", False)
        seller_type = "agence" if is_pro else "particulier"

        # Publication date
        pub_date = ad.get("publicationDate")

        return RawListing(
            source="bienici",
            source_id=str(ad_id),
            url=url,
            title=ad.get("title", f"Appartement {city}"),
            price=int(price) if price else None,
            surface=float(surface) if surface else None,
            rooms=ad.get("roomsQuantity"),
            arrondissement=arrondissement,
            description=description[:2000] if description else None,
            floor=floor,
            has_elevator=has_elevator,
            dpe=dpe,
            charges=ad.get("charges"),
            seller_type=seller_type,
            photos=photos[:5],  # Keep first 5 photos
            published_at=pub_date,
        )

    async def scrape(self) -> list[RawListing]:
        listings: list[RawListing] = []

        async with httpx.AsyncClient(headers=HEADERS, timeout=30.0) as client:
            # Step 1: Get zone IDs for Paris
            zone_ids = await self._get_zone_ids(client)
            logger.info(f"[bienici] Got {len(zone_ids)} zone IDs for Paris")

            # Step 2: Paginate through search results
            for page in range(1, MAX_PAGES + 1):
                filters_json = self._build_filters(zone_ids, page)
                params = {"filters": filters_json}

                try:
                    resp = await client.get(SEARCH_URL, params=params)
                    resp.raise_for_status()
                    data = resp.json()
                except httpx.HTTPStatusError as e:
                    logger.warning(f"[bienici] Page {page} HTTP error: {e.response.status_code}")
                    break
                except Exception as e:
                    logger.warning(f"[bienici] Page {page} error: {e}")
                    break

                ads = data.get("realEstateAds", [])
                if not ads:
                    logger.info(f"[bienici] No more results at page {page}")
                    break

                for ad in ads:
                    listing = self._parse_listing(ad)
                    if listing:
                        listings.append(listing)

                total = data.get("total", 0)
                logger.info(f"[bienici] Page {page}: {len(ads)} ads (total: {total})")

                # Stop if we've seen all results
                if page * PAGE_SIZE >= total:
                    break

                await self.random_delay()

        return listings
