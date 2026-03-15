"""Tests for scraper parsing logic (no network calls).

These tests validate the data parsing and extraction logic of each scraper
without actually making HTTP requests or launching browsers.
"""

import pytest
from scrapers.bienici import BienIciScraper
from scrapers.leboncoin import LeBonCoinScraper, _get_attribute


# ---------------------------------------------------------------------------
# BienIci — parsing logic
# ---------------------------------------------------------------------------

class TestBienIciParser:
    def setup_method(self):
        self.scraper = BienIciScraper()

    def test_parse_complete_ad(self):
        ad = {
            "id": "ag-123456",
            "slug": "vente-appartement-paris-11-ag-123456",
            "price": 350000,
            "surfaceArea": 50.5,
            "roomsQuantity": 3,
            "postalCode": "75011",
            "city": "Paris 11e",
            "title": "Bel appartement lumineux",
            "description": "Très bel appartement rénové",
            "floor": 3,
            "hasElevator": True,
            "energyClassification": "C",
            "charges": 200,
            "adCreatedByPro": True,
            "publicationDate": "2025-01-15T10:00:00.000Z",
            "photos": [
                {"url": "https://photos.bienici.com/photo1.jpg"},
                {"url": "https://photos.bienici.com/photo2.jpg"},
            ],
        }
        listing = self.scraper._parse_listing(ad)

        assert listing is not None
        assert listing.source == "bienici"
        assert listing.source_id == "ag-123456"
        assert listing.price == 350000
        assert listing.surface == 50.5
        assert listing.rooms == 3
        assert listing.arrondissement == "75011"
        assert listing.floor == 3
        assert listing.has_elevator is True
        assert listing.dpe == "C"
        assert listing.seller_type == "agence"
        assert len(listing.photos) == 2
        assert "vente-appartement" in listing.url

    def test_parse_ad_no_id_returns_none(self):
        ad = {"price": 300000, "surfaceArea": 40}
        assert self.scraper._parse_listing(ad) is None

    def test_parse_ad_minimal_data(self):
        ad = {"id": "min-1", "city": "Paris"}
        listing = self.scraper._parse_listing(ad)
        assert listing is not None
        assert listing.source_id == "min-1"
        assert listing.price is None
        assert listing.surface is None

    def test_parse_ad_particulier(self):
        ad = {"id": "part-1", "adCreatedByPro": False}
        listing = self.scraper._parse_listing(ad)
        assert listing.seller_type == "particulier"

    def test_parse_ad_truncates_description(self):
        ad = {"id": "long-1", "description": "x" * 5000}
        listing = self.scraper._parse_listing(ad)
        assert len(listing.description) == 2000

    def test_parse_ad_limits_photos(self):
        photos = [{"url": f"https://photo{i}.jpg"} for i in range(20)]
        ad = {"id": "photos-1", "photos": photos}
        listing = self.scraper._parse_listing(ad)
        assert len(listing.photos) == 5

    def test_parse_ad_url_fallback_without_slug(self):
        ad = {"id": "noslug-1"}
        listing = self.scraper._parse_listing(ad)
        assert "noslug-1" in listing.url

    def test_parse_ad_arrondissement_from_city(self):
        ad = {"id": "city-1", "postalCode": "", "city": "Paris 18e"}
        listing = self.scraper._parse_listing(ad)
        assert listing.arrondissement == "75018"

    def test_build_filters_contains_required_fields(self):
        import json
        filters_str = self.scraper._build_filters(["zone-1"], 1)
        filters = json.loads(filters_str)
        assert filters["filterType"] == "buy"
        assert filters["propertyType"] == ["flat"]
        assert filters["page"] == 1
        assert filters["from"] == 0

    def test_build_filters_page_offset(self):
        import json
        filters_str = self.scraper._build_filters(["zone-1"], 3)
        filters = json.loads(filters_str)
        assert filters["page"] == 3
        assert filters["from"] == 48  # (3-1) * 24


# ---------------------------------------------------------------------------
# LeBonCoin — parsing logic
# ---------------------------------------------------------------------------

class TestLeBonCoinParser:
    def setup_method(self):
        self.scraper = LeBonCoinScraper()

    def test_parse_complete_ad(self):
        ad = {
            "list_id": 12345678,
            "subject": "Appartement 3 pièces Paris 11",
            "price": [350000],
            "url": "/ad/ventes_immobilieres/12345678.htm",
            "location": {"zipcode": "75011", "city": "Paris 11e"},
            "body": "Bel appartement lumineux",
            "first_publication_date": "2025-01-15",
            "owner": {"type": "private"},
            "images": {"urls": ["https://img1.jpg", "https://img2.jpg"]},
            "attributes": [
                {"key": "square", "value": "50"},
                {"key": "rooms", "value": "3"},
                {"key": "floor_number", "value": "4"},
                {"key": "elevator", "value": "1"},
                {"key": "energy_rate", "value": "C"},
            ],
        }
        listing = self.scraper._parse_ad(ad)

        assert listing is not None
        assert listing.source == "leboncoin"
        assert listing.source_id == "12345678"
        assert listing.price == 350000
        assert listing.surface == 50.0
        assert listing.rooms == 3
        assert listing.floor == 4
        assert listing.has_elevator is True
        assert listing.dpe == "C"
        assert listing.arrondissement == "75011"
        assert listing.seller_type == "particulier"
        assert len(listing.photos) == 2

    def test_parse_ad_no_list_id_returns_none(self):
        assert self.scraper._parse_ad({}) is None

    def test_parse_ad_price_as_int(self):
        ad = {"list_id": 1, "price": 250000}
        listing = self.scraper._parse_ad(ad)
        assert listing.price == 250000

    def test_parse_ad_price_as_list(self):
        ad = {"list_id": 1, "price": [350000]}
        listing = self.scraper._parse_ad(ad)
        assert listing.price == 350000

    def test_parse_ad_no_price(self):
        ad = {"list_id": 1, "price": []}
        listing = self.scraper._parse_ad(ad)
        assert listing.price is None

    def test_parse_ad_pro_seller(self):
        ad = {"list_id": 1, "owner": {"type": "pro"}}
        listing = self.scraper._parse_ad(ad)
        assert listing.seller_type == "agence"

    def test_parse_ad_limits_photos(self):
        urls = [f"https://img{i}.jpg" for i in range(20)]
        ad = {"list_id": 1, "images": {"urls": urls}}
        listing = self.scraper._parse_ad(ad)
        assert len(listing.photos) == 5

    def test_parse_ad_truncates_description(self):
        ad = {"list_id": 1, "body": "y" * 5000}
        listing = self.scraper._parse_ad(ad)
        assert len(listing.description) == 2000

    def test_parse_ad_invalid_surface_ignored(self):
        ad = {
            "list_id": 1,
            "attributes": [{"key": "square", "value": "not_a_number"}],
        }
        listing = self.scraper._parse_ad(ad)
        assert listing.surface is None

    def test_parse_ad_url_fallback(self):
        ad = {"list_id": 999, "url": ""}
        listing = self.scraper._parse_ad(ad)
        assert "999" in listing.url

    def test_build_search_payload_page1(self):
        payload = self.scraper._build_search_payload(1)
        assert payload["offset"] == 0
        assert payload["limit"] == 35
        assert payload["filters"]["category"]["id"] == "9"
        assert "2" in payload["filters"]["enums"]["real_estate_type"]

    def test_build_search_payload_page2(self):
        payload = self.scraper._build_search_payload(2)
        assert payload["offset"] == 35
        assert payload["sort_by"] == "time"

    def test_build_search_payload_has_paris_location(self):
        payload = self.scraper._build_search_payload(1)
        locations = payload["filters"]["location"]["locations"]
        assert len(locations) == 1
        assert locations[0]["city"] == "Paris"
        assert locations[0]["department_id"] == "75"

    def test_build_search_payload_apartment_only(self):
        payload = self.scraper._build_search_payload(1)
        enums = payload["filters"]["enums"]
        assert "2" in enums["real_estate_type"]  # Appartement
        assert "offer" in enums["ad_type"]


class TestGetAttribute:
    def test_found(self):
        attrs = [{"key": "square", "value": "50"}]
        assert _get_attribute(attrs, "square") == "50"

    def test_not_found(self):
        attrs = [{"key": "rooms", "value": "3"}]
        assert _get_attribute(attrs, "square") is None

    def test_empty_list(self):
        assert _get_attribute([], "anything") is None


# ---------------------------------------------------------------------------
# PAP — URL building (no browser needed)
# ---------------------------------------------------------------------------

class TestPAPScraper:
    def setup_method(self):
        from scrapers.pap import PAPScraper
        self.scraper = PAPScraper()

    def test_build_page_url_first_page(self):
        url = self.scraper._build_page_url(1)
        assert url.endswith("g439")
        assert "-1" not in url

    def test_build_page_url_other_pages(self):
        url = self.scraper._build_page_url(3)
        assert url.endswith("-3")
