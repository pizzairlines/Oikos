"""Shared fixtures for all tests."""

import os
import sys

import pytest

# Add scraper root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def sample_listing():
    """A typical valid listing dict for scoring tests."""
    return {
        "source": "bienici",
        "source_id": "abc123",
        "url": "https://www.bienici.com/annonce/abc123",
        "title": "Bel appartement lumineux",
        "price": 350_000,
        "surface": 50.0,
        "price_per_sqm": 7_000.0,
        "rooms": 2,
        "arrondissement": "75011",
        "description": "Bel appartement au 3ème étage avec ascenseur",
        "floor": 3,
        "has_elevator": True,
        "dpe": "C",
        "charges": 200,
        "seller_type": "particulier",
        "photos": ["https://example.com/photo1.jpg"],
    }


@pytest.fixture
def sample_listing_minimal():
    """A listing with only the minimum required fields."""
    return {
        "price_per_sqm": 8_000.0,
    }


@pytest.fixture
def sample_listing_viager():
    """A listing with viager keyword (should be heavily penalized)."""
    return {
        "price_per_sqm": 5_000.0,
        "arrondissement": "75011",
        "surface": 40.0,
        "rooms": 2,
        "title": "Appartement en viager occupé",
        "description": "Viager occupé, femme de 75 ans",
        "floor": 2,
        "has_elevator": True,
        "dpe": "D",
    }


@pytest.fixture
def sample_listing_souplex():
    """A listing with souplex (should be penalized)."""
    return {
        "price_per_sqm": 5_500.0,
        "arrondissement": "75018",
        "surface": 65.0,
        "rooms": 3,
        "title": "Souplex avec jardin",
        "description": "Beau souplex sur deux niveaux avec accès jardin",
        "floor": 0,
        "has_elevator": False,
        "dpe": "E",
    }
