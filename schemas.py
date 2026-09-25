"""
schemas.py
----------
Pydantic v2 schemas for request validation and response serialisation.

Separation of concerns:
    OrderCreate   – the data a client must provide to create an order.
    OrderResponse – the full order record returned from the database.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from models import OrderStatus


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class OrderCreate(BaseModel):
    """
    Payload accepted by POST /orders/batch.

    Only the three fields that a client is required to supply are exposed here.
    All other columns (status, coordinates, timestamps …) are managed
    server-side and must never be settable by the caller.
    """

    customer_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Full name of the customer placing the order.",
        examples=["Jane Doe"],
    )

    raw_address: str = Field(
        ...,
        min_length=1,
        description="The unvalidated address string to be geocoded.",
        examples=["10 Downing Street, London, UK"],
    )

    weight: float = Field(
        default=1.0,
        gt=0,
        description="Shipment weight in kilograms. Must be a positive number.",
        examples=[2.5],
    )


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class OrderResponse(BaseModel):
    """
    Full order record returned in API responses.

    All fields mirror the ORM model so that clients receive a complete,
    audit-ready snapshot of every order.
    """

    # Core identity
    id: int
    customer_name: str
    raw_address: str
    weight: float
    status: OrderStatus

    # Geocoding results
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_rank: Optional[int] = None

    # Original coordinates (pre-correction audit trail)
    original_latitude: Optional[float] = None
    original_longitude: Optional[float] = None

    # Support resolution audit trail
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    support_note: Optional[str] = None

    # Anomaly tracking
    was_anomalous: bool

    # Timestamps
    created_at: datetime
    updated_at: datetime

    model_config = {
        # Allows Pydantic to read data directly from SQLAlchemy ORM objects
        # instead of requiring plain dicts.
        "from_attributes": True,
    }
