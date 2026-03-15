"""WhatsApp alerts via Twilio for new opportunity listings."""

from __future__ import annotations

import logging

from twilio.rest import Client as TwilioClient

from config import config
import db

logger = logging.getLogger(__name__)


def _format_alert_message(listing: dict) -> str:
    """Format a listing into a WhatsApp alert message."""
    price = listing.get("price", 0)
    surface = listing.get("surface", 0)
    price_sqm = listing.get("price_per_sqm", 0)
    score = listing.get("opportunity_score", 0)
    arrondissement = listing.get("arrondissement", "?")
    title = listing.get("title", "Annonce")
    url = listing.get("url", "")
    rooms = listing.get("rooms")
    dpe = listing.get("dpe")

    # Format arrondissement for display
    arr_display = arrondissement
    if arrondissement and arrondissement.startswith("750"):
        arr_num = int(arrondissement[3:])
        arr_display = f"Paris {arr_num}e"

    lines = [
        f"*Nouvelle opportunite immobiliere*",
        f"",
        f"*{title}*",
        f"Prix : {price:,} EUR".replace(",", " "),
        f"Surface : {surface} m2",
        f"Prix/m2 : {price_sqm:,.0f} EUR/m2".replace(",", " "),
        f"Score : {score}/100",
        f"Localisation : {arr_display}",
    ]

    if rooms:
        lines.append(f"Pieces : {rooms}")
    if dpe:
        lines.append(f"DPE : {dpe}")

    lines.extend(["", f"Voir l'annonce : {url}"])

    return "\n".join(lines)


def send_whatsapp(phone_number: str, message: str) -> bool:
    """Send a WhatsApp message via Twilio."""
    if not config.twilio_account_sid or not config.twilio_auth_token:
        logger.warning("Twilio credentials not configured, skipping alert")
        return False

    try:
        client = TwilioClient(config.twilio_account_sid, config.twilio_auth_token)
        msg = client.messages.create(
            body=message,
            from_=config.twilio_whatsapp_from,
            to=f"whatsapp:{phone_number}" if not phone_number.startswith("whatsapp:") else phone_number,
        )
        logger.info(f"WhatsApp alert sent: {msg.sid}")
        return True
    except Exception:
        logger.exception("Failed to send WhatsApp alert")
        return False


def check_and_send_alerts(new_listings: list[dict]) -> int:
    """Check new listings against alert configs and send notifications.

    Returns the number of alerts sent.
    """
    if not new_listings:
        return 0

    alert_configs = db.get_alert_configs()
    if not alert_configs:
        return 0

    total_sent = 0

    for ac in alert_configs:
        if not ac.get("is_active"):
            continue

        phone = ac.get("phone_number")
        if not phone:
            continue

        # Get already-sent listing IDs for this alert config
        already_sent = db.get_sent_alert_listing_ids(ac["id"])

        for listing in new_listings:
            listing_id = listing.get("id")
            if not listing_id or listing_id in already_sent:
                continue

            # Check if listing matches alert criteria
            if not _matches_alert(listing, ac):
                continue

            # Send alert
            message = _format_alert_message(listing)
            if send_whatsapp(phone, message):
                db.record_alert(ac["id"], listing_id)
                total_sent += 1

    logger.info(f"Sent {total_sent} alerts")
    return total_sent


def _matches_alert(listing: dict, alert_config: dict) -> bool:
    """Check if a listing matches an alert configuration."""
    # Max price per sqm
    max_price_sqm = alert_config.get("max_price_per_sqm")
    if max_price_sqm and listing.get("price_per_sqm"):
        if listing["price_per_sqm"] > max_price_sqm:
            return False

    # Min score
    min_score = alert_config.get("min_score")
    if min_score and listing.get("opportunity_score"):
        if listing["opportunity_score"] < min_score:
            return False

    # Min surface
    min_surface = alert_config.get("min_surface")
    if min_surface and listing.get("surface"):
        if listing["surface"] < min_surface:
            return False

    # Max price
    max_price = alert_config.get("max_price")
    if max_price and listing.get("price"):
        if listing["price"] > max_price:
            return False

    # Arrondissements filter
    target_arrs = alert_config.get("arrondissements", [])
    if target_arrs and listing.get("arrondissement"):
        if listing["arrondissement"] not in target_arrs:
            return False

    return True
