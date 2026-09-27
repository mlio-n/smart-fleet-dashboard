"""
schemas.py
----------
Pydantic v2 schemas for request validation and response serialisation.

Separation of concerns:
    OrderCreate            – the data a client must provide to create an order.
    OrderResponse          – the full order record returned from the database.
    RouteGenerationRequest – fleet parameters for the CVRP solver.
    OrderResolve           – support-agent payload for resolving an anomaly.
"""

from datetime import datetime

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


class OrderUpdate(BaseModel):
    """Payload accepted by PATCH /orders/{id} to update order attributes."""

    customer_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated customer name.",
    )
    raw_address: str | None = Field(
        default=None,
        min_length=1,
        description="Updated address. Modifying address will trigger re-geocoding.",
    )
    weight: float | None = Field(
        default=None,
        gt=0,
        description="Updated weight in kilograms.",
    )
    status: OrderStatus | None = Field(
        default=None,
        description="Updated order status (e.g. DELIVERED).",
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
    latitude: float | None = None
    longitude: float | None = None
    place_rank: int | None = None

    # Original coordinates (pre-correction audit trail)
    original_latitude: float | None = None
    original_longitude: float | None = None

    # Support resolution audit trail
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    support_note: str | None = None

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


# ---------------------------------------------------------------------------
# Route generation request schema
# ---------------------------------------------------------------------------

class RouteGenerationRequest(BaseModel):
    """
    Fleet parameters for the POST /routes/generate endpoint.

    The caller specifies how many vehicles are available and the uniform
    capacity limit per vehicle (in kilograms).  The solver will do its
    best to assign all eligible orders, dropping those that cannot fit.
    """

    num_vehicles: int = Field(
        ...,
        ge=1,
        description="Number of delivery vehicles available in the fleet.",
        examples=[3],
    )

    vehicle_capacity: float = Field(
        ...,
        gt=0,
        description=(
            "Maximum load capacity per vehicle in **kilograms**.  "
            "Applies uniformly to every vehicle in the fleet."
        ),
        examples=[100.0],
    )

# ---------------------------------------------------------------------------
# Anomaly resolution schema
# ---------------------------------------------------------------------------

class OrderResolve(BaseModel):
    """
    Payload accepted by PATCH /orders/{id}/resolve.

    Used exclusively by support agents to manually correct an order that was
    flagged as ANOMALY.  Only orders in ANOMALY status may be resolved;
    the endpoint enforces this as a state-machine rule.

    Fields
    ------
    new_latitude  : Corrected WGS-84 latitude  (-90 to +90).
    new_longitude : Corrected WGS-84 longitude (-180 to +180).
    resolved_by   : Username or employee ID of the support agent.
    support_note  : Optional free-text description of the correction made.
    """

    new_latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Corrected WGS-84 latitude in decimal degrees.",
        examples=[37.7765],
    )

    new_longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Corrected WGS-84 longitude in decimal degrees.",
        examples=[29.0864],
    )

    resolved_by: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Username or employee ID of the support agent resolving the anomaly.",
        examples=["support.agent.42"],
    )

    support_note: str | None = Field(
        default=None,
        description=(
            "Optional free-text note explaining the correction "
            "(e.g., customer provided wrong district, corrected to city centre)."
        ),
        examples=["Address typo corrected: Ankra -> Ankara."],
    )
