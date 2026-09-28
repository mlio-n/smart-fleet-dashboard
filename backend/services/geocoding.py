"""
services/geocoding.py
---------------------
Asynchronous geocoding worker and Turkish address parsing helpers
using OpenStreetMap Nominatim with rate limiting and street fallbacks.
"""

import re
import time
import logging
import requests
from requests.adapters import HTTPAdapter
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Order, OrderStatus

logger = logging.getLogger("smart_fleet.geocoding")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "ArvatoSupportPoC_v1.0"}
RATE_LIMIT_SLEEP = 1.2   # seconds – required by OSM usage policy
MIN_PLACE_RANK = 26      # results below this threshold are treated as anomalies


def extract_street_fallback(raw: str) -> str | None:
    """
    Extract street/avenue name and city for Nominatim fallback when exact
    Turkish address (with door number or district mismatch) returns empty.
    """
    if not raw:
        return None
    match = re.search(
        r'([A-Za-z\u00C0-\u017F\s]+(?:Caddesi|Bulvarı|Cad\.|Bulv\.|Sokak|Sokağı|Sok\.))',
        raw,
        re.IGNORECASE,
    )
    if not match:
        return None
    street = match.group(1).strip()
    if ',' in street:
        street = street.split(',')[-1].strip()
    elif 'Mahallesi' in street:
        street = street.split('Mahallesi')[-1].strip()
    elif 'Mah.' in street:
        street = street.split('Mah.')[-1].strip()

    city = "Denizli"
    for d in ["Pamukkale", "Merkezefendi"]:
        if d.lower() in raw.lower():
            city = f"{d}, Denizli"
            break
    return f"{street}, {city}"


def process_orders_geocoding(order_ids: list[int]) -> None:
    """
    Background task: geocode each order via Nominatim and apply business rules.

    Business rules:
    - Empty API response -> status = ANOMALY, was_anomalous = True
    - place_rank < 26    -> status = ANOMALY, was_anomalous = True
    - place_rank >= 26   -> latitude / longitude / place_rank updated,
                            status remains PENDING (ready for routing)
    """
    db: Session = SessionLocal()
    session = requests.Session()
    session.headers.update(NOMINATIM_HEADERS)
    adapter = HTTPAdapter(pool_connections=5, pool_maxsize=5)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    try:
        for order_id in order_ids:
            order: Order | None = db.get(Order, order_id)

            if order is None:
                logger.warning("Geocoding skipped – order id=%s not found.", order_id)
                continue

            logger.info("Geocoding order id=%s  address=%r", order_id, order.raw_address)

            # 1. Primary Nominatim request
            try:
                response = session.get(
                    NOMINATIM_URL,
                    params={
                        "q": order.raw_address,
                        "format": "json",
                        "addressdetails": 1,
                        "limit": 1,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                results: list = response.json()
            except requests.RequestException as exc:
                logger.error("Nominatim request failed for order id=%s: %s", order_id, exc)
                results = []

            # 2. Turkish street-level fallback if exact address was empty
            if not results:
                fallback_query = extract_street_fallback(order.raw_address)
                if fallback_query and fallback_query.lower() != order.raw_address.lower():
                    logger.info("Order id=%s Nominatim empty, trying street fallback: %r", order_id, fallback_query)
                    try:
                        time.sleep(RATE_LIMIT_SLEEP)
                        fb_resp = session.get(
                            NOMINATIM_URL,
                            params={
                                "q": fallback_query,
                                "format": "json",
                                "addressdetails": 1,
                                "limit": 1,
                            },
                            timeout=10,
                        )
                        if fb_resp.status_code == 200:
                            results = fb_resp.json()
                    except requests.RequestException as fb_exc:
                        logger.warning("Fallback geocoding request failed for order id=%s: %s", order_id, fb_exc)

            # 3. Business rule evaluation
            if not results:
                logger.warning("Order id=%s flagged ANOMALY – Nominatim returned no results.", order_id)
                order.status = OrderStatus.ANOMALY
                order.was_anomalous = True
            else:
                best_match = results[0]
                place_rank = int(best_match.get("place_rank", 0))
                lat = float(best_match.get("lat", 0.0))
                lon = float(best_match.get("lon", 0.0))

                if place_rank < MIN_PLACE_RANK:
                    logger.warning("Order id=%s flagged ANOMALY – place_rank=%s < %s.", order_id, place_rank, MIN_PLACE_RANK)
                    order.status = OrderStatus.ANOMALY
                    order.was_anomalous = True
                else:
                    logger.info("Order id=%s geocoded successfully (lat=%.6f, lon=%.6f, place_rank=%s).", order_id, lat, lon, place_rank)
                    order.latitude = lat
                    order.longitude = lon
                    order.place_rank = place_rank

            try:
                db.commit()
            except Exception as commit_exc:
                logger.error("Failed to commit order id=%s: %s", order_id, commit_exc)
                db.rollback()

            time.sleep(RATE_LIMIT_SLEEP)
    finally:
        session.close()
        db.close()
