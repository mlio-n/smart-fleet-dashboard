"""
models.py
---------
SQLAlchemy 2.0 ORM models using the `Mapped` / `mapped_column` API.

Table
-----
    Order   – represents a logistics shipment order and its full lifecycle,
               from initial submission through geocoding, anomaly detection,
               manual support resolution, and final delivery.
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class OrderStatus(str, enum.Enum):
    """
    Lifecycle states for a logistics order.

    PENDING           – freshly created, awaiting geocoding.
    ANOMALY           – geocoding returned no result or a low-confidence rank.
    RESOLVED_MANUALLY – a support agent corrected the address/coordinates.
    ROUTED            – order has been passed to the routing engine.
    DELIVERED         – shipment successfully delivered.
    """
    PENDING           = "PENDING"
    ANOMALY           = "ANOMALY"
    RESOLVED_MANUALLY = "RESOLVED_MANUALLY"
    ROUTED            = "ROUTED"
    DELIVERED         = "DELIVERED"


# ---------------------------------------------------------------------------
# ORM Model
# ---------------------------------------------------------------------------

class Order(Base):
    """
    Represents a single logistics shipment order.

    Columns are grouped by concern:
        - Core identity
        - Geocoding results
        - Original coordinates (pre-correction audit trail)
        - Support resolution audit trail
        - Anomaly tracking
        - Timestamps
    """

    __tablename__ = "orders"

    # ------------------------------------------------------------------
    # Core identity
    # ------------------------------------------------------------------
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    customer_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Full name of the customer placing the order.",
    )

    raw_address: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="The raw, unvalidated address string provided by the customer.",
    )

    weight: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        comment="Shipment weight in kilograms (defaults to 1 kg).",
    )

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus),
        default=OrderStatus.PENDING,
        nullable=False,
        comment="Current lifecycle state of the order.",
    )

    # ------------------------------------------------------------------
    # Geocoding results
    # ------------------------------------------------------------------
    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="WGS-84 latitude resolved by geocoding (may be overridden by support).",
    )

    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="WGS-84 longitude resolved by geocoding (may be overridden by support).",
    )

    place_rank: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment=(
            "Nominatim place_rank score. "
            "Values < 26 indicate low geographic specificity (triggers ANOMALY)."
        ),
    )

    # ------------------------------------------------------------------
    # Original coordinates – preserved for audit when support overrides
    # ------------------------------------------------------------------
    original_latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Latitude from the initial geocoding attempt, before any manual correction.",
    )

    original_longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Longitude from the initial geocoding attempt, before any manual correction.",
    )

    # ------------------------------------------------------------------
    # Support resolution audit trail
    # ------------------------------------------------------------------
    resolved_by: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Username or ID of the support agent who resolved the anomaly.",
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="UTC timestamp when the support agent marked the order as resolved.",
    )

    support_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Free-text note left by the support agent during manual resolution.",
    )

    # ------------------------------------------------------------------
    # Anomaly tracking
    # ------------------------------------------------------------------
    was_anomalous: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment=(
            "Set to True when geocoding flags this order as ANOMALY. "
            "Retained even after manual resolution for historical reporting."
        ),
    )

    # ------------------------------------------------------------------
    # Production-critical timestamps
    # ------------------------------------------------------------------
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="UTC timestamp when the order record was first created.",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        comment="UTC timestamp of the last update to this record.",
    )

    def __repr__(self) -> str:
        return (
            f"<Order id={self.id} customer={self.customer_name!r} "
            f"status={self.status.value}>"
        )
