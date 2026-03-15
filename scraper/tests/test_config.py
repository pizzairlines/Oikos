"""Tests for configuration validation."""

import pytest
from config import Config


class TestConfigValidation:
    def test_valid_config(self):
        cfg = Config(supabase_url="https://example.supabase.co", supabase_key="key123")
        errors = cfg.validate()
        assert errors == []

    def test_missing_supabase_url(self):
        cfg = Config(supabase_url="", supabase_key="key123")
        errors = cfg.validate()
        assert any("SUPABASE_URL" in e for e in errors)

    def test_missing_supabase_key(self):
        cfg = Config(supabase_url="https://example.supabase.co", supabase_key="")
        errors = cfg.validate()
        assert any("SUPABASE_KEY" in e for e in errors)

    def test_invalid_scan_interval(self):
        cfg = Config(
            supabase_url="https://example.supabase.co",
            supabase_key="key123",
            scan_interval_minutes=0,
        )
        errors = cfg.validate()
        assert any("scan_interval" in e for e in errors)

    def test_invalid_max_pages(self):
        cfg = Config(
            supabase_url="https://example.supabase.co",
            supabase_key="key123",
            max_pages_per_source=0,
        )
        errors = cfg.validate()
        assert any("max_pages" in e for e in errors)

    def test_invalid_price_range(self):
        cfg = Config(
            supabase_url="https://example.supabase.co",
            supabase_key="key123",
            default_min_price_sqm=8000,
            default_max_price_sqm=5000,
        )
        errors = cfg.validate()
        assert any("default_min_price_sqm" in e for e in errors)

    def test_twilio_missing_is_warning_not_error(self):
        cfg = Config(
            supabase_url="https://example.supabase.co",
            supabase_key="key123",
            twilio_account_sid="",
            twilio_auth_token="",
        )
        errors = cfg.validate()
        assert errors == []  # Twilio is optional

    def test_validate_or_exit_with_valid_config(self):
        cfg = Config(supabase_url="https://example.supabase.co", supabase_key="key123")
        # Should not raise
        cfg.validate_or_exit()

    def test_validate_or_exit_with_invalid_config(self):
        cfg = Config(supabase_url="", supabase_key="")
        with pytest.raises(SystemExit):
            cfg.validate_or_exit()
