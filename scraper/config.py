import logging
import os
import sys
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class Config:
    # Supabase
    supabase_url: str = field(default_factory=lambda: os.environ.get("SUPABASE_URL", ""))
    supabase_key: str = field(default_factory=lambda: os.environ.get("SUPABASE_KEY", ""))

    # Twilio (WhatsApp)
    twilio_account_sid: str = field(default_factory=lambda: os.environ.get("TWILIO_ACCOUNT_SID", ""))
    twilio_auth_token: str = field(default_factory=lambda: os.environ.get("TWILIO_AUTH_TOKEN", ""))
    twilio_whatsapp_from: str = field(default_factory=lambda: os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"))

    # Scraping
    scan_interval_minutes: int = 60
    max_pages_per_source: int = 10
    request_delay_min: float = 2.0
    request_delay_max: float = 5.0

    # Filtering
    default_min_price_sqm: float = 5000
    default_max_price_sqm: float = 7500
    target_city: str = "paris"

    # Paris arrondissement median prices (€/m², approximate 2024-2025)
    arrondissement_median_prices: dict = field(default_factory=lambda: {
        "75001": 13000, "75002": 12500, "75003": 13000, "75004": 13500,
        "75005": 12500, "75006": 14000, "75007": 13500, "75008": 12000,
        "75009": 11000, "75010": 10000, "75011": 10000, "75012": 9500,
        "75013": 9000, "75014": 10000, "75015": 9500, "75016": 11000,
        "75017": 10500, "75018": 8500, "75019": 8000, "75020": 8500,
    })

    # Rental attractiveness score per arrondissement (0-100)
    rental_attractiveness: dict = field(default_factory=lambda: {
        "75001": 70, "75002": 75, "75003": 80, "75004": 75,
        "75005": 80, "75006": 70, "75007": 65, "75008": 60,
        "75009": 80, "75010": 85, "75011": 90, "75012": 75,
        "75013": 75, "75014": 70, "75015": 70, "75016": 55,
        "75017": 70, "75018": 85, "75019": 80, "75020": 80,
    })


    def validate(self) -> list[str]:
        """Validate configuration and return list of errors.

        Returns an empty list if all required config is present.
        """
        errors: list[str] = []

        if not self.supabase_url:
            errors.append("SUPABASE_URL is not set")
        if not self.supabase_key:
            errors.append("SUPABASE_KEY is not set")

        # Twilio is optional — warn but don't block
        if not self.twilio_account_sid or not self.twilio_auth_token:
            logger.warning(
                "Twilio credentials not configured — WhatsApp alerts will be disabled"
            )

        if self.scan_interval_minutes < 1:
            errors.append(
                f"scan_interval_minutes must be >= 1, got {self.scan_interval_minutes}"
            )

        if self.max_pages_per_source < 1:
            errors.append(
                f"max_pages_per_source must be >= 1, got {self.max_pages_per_source}"
            )

        if self.default_min_price_sqm >= self.default_max_price_sqm:
            errors.append(
                f"default_min_price_sqm ({self.default_min_price_sqm}) "
                f"must be less than default_max_price_sqm ({self.default_max_price_sqm})"
            )

        return errors

    def validate_or_exit(self) -> None:
        """Validate config and exit with a clear message if invalid."""
        errors = self.validate()
        if errors:
            for err in errors:
                logger.error(f"Configuration error: {err}")
            sys.exit(1)


config = Config()
