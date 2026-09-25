"""
main.py
-------
FastAPI application entry point.

Architecture highlights
-----------------------
* Tables are created automatically on startup via `create_all`.
* POST /orders/batch is intentionally non-blocking: it persists incoming
  orders synchronously (so the caller immediately gets a confirmation),
  then hands off geocoding to a FastAPI BackgroundTask.
* The background geocoding worker calls the OpenStreetMap Nominatim API
  with a mandatory 1.2-second sleep between requests (per OSM usage policy).
* Business rules for anomaly detection are encapsulated in
  `_process_orders_geocoding` and applied atomically per-order.
* POST /routes/generate runs the Google OR-Tools CVRP solver against all
  routable orders (PENDING + RESOLVED_MANUALLY) and transitions them to ROUTED.
"""

import time
import logging
from datetime import datetime, timezone
from typing import List

import requests
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from models import Order, OrderStatus
from schemas import OrderCreate, OrderResponse, RouteGenerationRequest, OrderResolve
from utils import create_distance_matrix
from routing import solve_cvrp

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s – %(message)s",
)
logger = logging.getLogger("smart_fleet")

# ---------------------------------------------------------------------------
# Application bootstrap
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Smart Fleet Dashboard – Support API",
    description=(
        "Enterprise-level logistics anomaly detection and support system. "
        "Orders are geocoded in the background; low-confidence results are "
        "automatically flagged as anomalies for manual review."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – allow the Vite dev server to reach the API
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """
    Create all database tables defined in the ORM models if they do not
    already exist. This is idempotent and safe to run on every restart.
    """
    logger.info("Running database migrations (create_all) …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")


# ---------------------------------------------------------------------------
# Nominatim geocoding constants
# ---------------------------------------------------------------------------

NOMINATIM_URL    = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "ArvatoSupportPoC_v1.0"}
RATE_LIMIT_SLEEP  = 1.2   # seconds – required by OSM usage policy
MIN_PLACE_RANK    = 26    # results below this threshold are treated as anomalies


# ---------------------------------------------------------------------------
# Depot (distribution centre) – central Denizli, Turkey
# ---------------------------------------------------------------------------

DEPOT_LATITUDE  = 37.7765
DEPOT_LONGITUDE = 29.0864


# ---------------------------------------------------------------------------
# Background geocoding worker
# ---------------------------------------------------------------------------

def _process_orders_geocoding(order_ids: List[int]) -> None:
    """
    Background task: geocode each order via Nominatim and apply business rules.

    Called after POST /orders/batch returns so that the HTTP response is
    never blocked by network I/O.

    Business rules
    ~~~~~~~~~~~~~~
    • Empty API response  → status = ANOMALY, was_anomalous = True
    • place_rank < 26     → status = ANOMALY, was_anomalous = True
    • place_rank >= 26    → latitude / longitude / place_rank updated,
                            status remains PENDING (ready for routing)

    Parameters
    ----------
    order_ids:
        Primary keys of the Order rows to process, in insertion order.
    """
    db: Session = SessionLocal()

    try:
        for order_id in order_ids:
            order: Order | None = db.get(Order, order_id)

            if order is None:
                logger.warning("Geocoding skipped – order id=%s not found.", order_id)
                continue

            logger.info(
                "Geocoding order id=%s  address=%r", order_id, order.raw_address
            )

            # ------------------------------------------------------------------
            # Nominatim API request
            # ------------------------------------------------------------------
            try:
                response = requests.get(
                    NOMINATIM_URL,
                    params={
                        "q":              order.raw_address,
                        "format":         "json",
                        "addressdetails": 1,
                        "limit":          1,
                    },
                    headers=NOMINATIM_HEADERS,
                    timeout=10,
                )
                response.raise_for_status()
                results: list = response.json()

            except requests.RequestException as exc:
                logger.error(
                    "Nominatim request failed for order id=%s: %s", order_id, exc
                )
                # Treat network errors the same as empty results → ANOMALY
                results = []

            # ------------------------------------------------------------------
            # Business rule evaluation
            # ------------------------------------------------------------------
            if not results:
                # Rule: empty response → ANOMALY
                logger.warning(
                    "Order id=%s flagged ANOMALY – Nominatim returned no results.",
                    order_id,
                )
                order.status       = OrderStatus.ANOMALY
                order.was_anomalous = True

            else:
                best_match  = results[0]
                place_rank  = int(best_match.get("place_rank", 0))
                lat         = float(best_match.get("lat", 0.0))
                lon         = float(best_match.get("lon", 0.0))

                if place_rank < MIN_PLACE_RANK:
                    # Rule: low-confidence geocoding result → ANOMALY
                    logger.warning(
                        "Order id=%s flagged ANOMALY – place_rank=%s < %s.",
                        order_id, place_rank, MIN_PLACE_RANK,
                    )
                    order.status        = OrderStatus.ANOMALY
                    order.was_anomalous = True

                else:
                    # Rule: acceptable result → populate coordinates, stay PENDING
                    logger.info(
                        "Order id=%s geocoded successfully "
                        "(lat=%.6f, lon=%.6f, place_rank=%s).",
                        order_id, lat, lon, place_rank,
                    )
                    order.latitude   = lat
                    order.longitude  = lon
                    order.place_rank = place_rank

            db.commit()
            db.refresh(order)

            # ------------------------------------------------------------------
            # Rate-limit guard required by OSM usage policy
            # ------------------------------------------------------------------
            time.sleep(RATE_LIMIT_SLEEP)

    finally:
        db.close()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post(
    "/orders/batch",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a batch of orders for geocoding",
    description=(
        "Accepts a list of orders, persists them immediately with status PENDING, "
        "and returns a 202 Accepted. "
        "Geocoding runs asynchronously in the background so the caller is never blocked."
    ),
)
def create_orders_batch(
    payload:          List[OrderCreate],
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
) -> dict:
    """
    Non-blocking batch order ingestion endpoint.

    1. Validate all incoming orders (Pydantic handles this automatically).
    2. Persist every order as PENDING in a single transaction.
    3. Register the geocoding worker as a BackgroundTask.
    4. Return immediately with a 202 Accepted – the client is never blocked.
    """

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload must contain at least one order.",
        )

    # ------------------------------------------------------------------
    # Step 1 – Persist all orders synchronously before returning
    # ------------------------------------------------------------------
    new_orders: List[Order] = []

    for item in payload:
        order = Order(
            customer_name=item.customer_name,
            raw_address=item.raw_address,
            weight=item.weight,
            status=OrderStatus.PENDING,
        )
        db.add(order)
        new_orders.append(order)

    db.commit()

    # Refresh to populate auto-generated fields (id, created_at, …)
    for order in new_orders:
        db.refresh(order)

    order_ids = [o.id for o in new_orders]

    logger.info(
        "Batch ingested – %s order(s) saved (ids=%s). "
        "Geocoding dispatched to background.",
        len(order_ids), order_ids,
    )

    # ------------------------------------------------------------------
    # Step 2 – Dispatch geocoding to background (non-blocking)
    # ------------------------------------------------------------------
    background_tasks.add_task(_process_orders_geocoding, order_ids)

    return {
        "message":   "Orders received, processing in background.",
        "order_ids": order_ids,
        "count":     len(order_ids),
    }


@app.get(
    "/orders",
    response_model=List[OrderResponse],
    summary="List all orders",
    description="Returns all orders in the system, newest first.",
)
def list_orders(
    db: Session = Depends(get_db),
) -> List[Order]:
    """Return every order sorted by creation date descending."""
    return db.query(Order).order_by(Order.created_at.desc()).all()


@app.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Get a single order by ID",
)
def get_order(order_id: int, db: Session = Depends(get_db)) -> Order:
    """Fetch a single order by its primary key."""
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id={order_id} not found.",
        )
    return order


@app.get(
    "/orders/anomalies/",
    response_model=List[OrderResponse],
    summary="List all anomalous orders",
    description="Returns all orders currently in ANOMALY status for support review.",
)
def list_anomalies(db: Session = Depends(get_db)) -> List[Order]:
    """Return all orders whose current status is ANOMALY."""
    return (
        db.query(Order)
        .filter(Order.status == OrderStatus.ANOMALY)
        .order_by(Order.created_at.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# Route generation (CVRP)
# ---------------------------------------------------------------------------

@app.post(
    "/routes/generate",
    status_code=status.HTTP_200_OK,
    summary="Generate optimised delivery routes (CVRP)",
    description=(
        "Runs the Google OR-Tools CVRP solver on all orders whose status is "
        "PENDING or RESOLVED_MANUALLY **and** that have valid coordinates.  "
        "Successfully routed orders are transitioned to ROUTED.  "
        "Orders that the solver cannot fit within fleet capacity are returned "
        "as 'unassigned' and left in their current status."
    ),
)
def generate_routes(
    payload: RouteGenerationRequest,
    db:      Session = Depends(get_db),
) -> dict:
    """
    Full CVRP pipeline:

    1. Fetch all routable orders (PENDING | RESOLVED_MANUALLY with coords).
    2. Build the coordinate list: depot first, then customer locations.
    3. Build the Haversine distance matrix.
    4. Convert weights (kg → grams) to integers for OR-Tools.
    5. Run the CVRP solver.
    6. Transition routed orders to ROUTED; leave dropped orders untouched.
    7. Return a structured JSON response with vehicle assignments and drops.
    """

    # ------------------------------------------------------------------
    # 1 ─ Fetch routable orders
    # ------------------------------------------------------------------
    routable_statuses = [OrderStatus.PENDING, OrderStatus.RESOLVED_MANUALLY]

    routable_orders: List[Order] = (
        db.query(Order)
        .filter(
            Order.status.in_(routable_statuses),
            Order.latitude.isnot(None),
            Order.longitude.isnot(None),
        )
        .all()
    )

    if not routable_orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No routable orders found.  Orders must have status "
                "PENDING or RESOLVED_MANUALLY **and** valid coordinates."
            ),
        )

    logger.info(
        "Route generation – %s routable order(s) found.", len(routable_orders)
    )

    # ------------------------------------------------------------------
    # 2 ─ Build coordinate list (depot = index 0)
    # ------------------------------------------------------------------
    coordinates = [(DEPOT_LATITUDE, DEPOT_LONGITUDE)]
    for order in routable_orders:
        coordinates.append((order.latitude, order.longitude))

    # ------------------------------------------------------------------
    # 3 ─ Build distance matrix (metres, integers)
    # ------------------------------------------------------------------
    distance_matrix = create_distance_matrix(coordinates)

    # ------------------------------------------------------------------
    # 4 ─ Prepare demand & capacity vectors (grams, integers)
    #     OR-Tools requires integer arithmetic.  Converting kg → grams
    #     preserves one decimal-place precision while staying in int range.
    # ------------------------------------------------------------------
    demands = [0]  # depot has zero demand
    for order in routable_orders:
        demands.append(int(round(order.weight * 1000)))

    vehicle_capacity_g = int(round(payload.vehicle_capacity * 1000))
    vehicle_capacities = [vehicle_capacity_g] * payload.num_vehicles

    # ------------------------------------------------------------------
    # 5 ─ Solve CVRP
    # ------------------------------------------------------------------
    result = solve_cvrp(
        distance_matrix=distance_matrix,
        demands=demands,
        num_vehicles=payload.num_vehicles,
        vehicle_capacities=vehicle_capacities,
    )

    logger.info(
        "CVRP result – status=%s  total_distance=%s m  dropped=%s node(s).",
        result["status"],
        result["total_distance_m"],
        len(result["dropped"]),
    )

    if result["status"] == "NO_SOLUTION":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="OR-Tools could not find any feasible solution for the given fleet parameters.",
        )

    # ------------------------------------------------------------------
    # 6 ─ Map solver node indices back to Order objects
    #     node 0 = depot  →  node i  →  routable_orders[i - 1]
    # ------------------------------------------------------------------
    dropped_node_set = set(result["dropped"])

    # Collect routed order IDs so we can update their status
    routed_order_ids: List[int] = []

    vehicle_routes = []
    for route in result["routes"]:
        route_order_details = []
        for node_index in route["route_nodes"]:
            if node_index == 0:
                # Depot node – include it for route clarity
                route_order_details.append({
                    "node":  "DEPOT",
                    "lat":   DEPOT_LATITUDE,
                    "lon":   DEPOT_LONGITUDE,
                })
            else:
                order = routable_orders[node_index - 1]
                route_order_details.append({
                    "node":          node_index,
                    "order_id":      order.id,
                    "customer_name": order.customer_name,
                    "raw_address":   order.raw_address,
                    "weight_kg":     order.weight,
                    "lat":           order.latitude,
                    "lon":           order.longitude,
                })
                routed_order_ids.append(order.id)

        vehicle_routes.append({
            "vehicle":          route["vehicle"],
            "stops":            route_order_details,
            "route_distance_m": route["route_distance_m"],
        })

    # ------------------------------------------------------------------
    # 7 ─ Transition routed orders → ROUTED
    # ------------------------------------------------------------------
    for order in routable_orders:
        # Only update if the order was not dropped
        order_node_index = routable_orders.index(order) + 1
        if order_node_index not in dropped_node_set:
            order.status = OrderStatus.ROUTED

    db.commit()

    # ------------------------------------------------------------------
    # 8 ─ Build unassigned (dropped) list
    # ------------------------------------------------------------------
    unassigned = []
    for node_index in sorted(dropped_node_set):
        order = routable_orders[node_index - 1]
        unassigned.append({
            "order_id":      order.id,
            "customer_name": order.customer_name,
            "raw_address":   order.raw_address,
            "weight_kg":     order.weight,
            "reason":        "Dropped by solver – insufficient fleet capacity.",
        })

    logger.info(
        "Route generation complete – %s order(s) routed, %s dropped.",
        len(routed_order_ids), len(unassigned),
    )

    return {
        "status":           result["status"],
        "total_distance_m": result["total_distance_m"],
        "num_vehicles_used": sum(
            1 for r in vehicle_routes if len(r["stops"]) > 2
        ),
        "routes":           vehicle_routes,
        "unassigned_orders": unassigned,
    }

# ---------------------------------------------------------------------------
# Anomaly resolution (Support Dashboard)
# ---------------------------------------------------------------------------

@app.patch(
    "/orders/{order_id}/resolve",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve an anomalous order",
    description=(
        "Allows a support agent to manually correct the coordinates of an order "
        "that was flagged as **ANOMALY** by the geocoding engine.  "
        "**State-machine rule**: only orders whose current status is `ANOMALY` "
        "may be resolved.  Any other status will result in a 400 Bad Request.  "
        "On success the order transitions to `RESOLVED_MANUALLY` and the original "
        "coordinates are preserved in `original_latitude` / `original_longitude` "
        "for a complete audit trail."
    ),
)
def resolve_order(
    order_id: int,
    payload:  OrderResolve,
    db:       Session = Depends(get_db),
) -> Order:
    """
    State-machine enforced anomaly resolution.

    Pipeline
    --------
    1. Fetch the order by PK - 404 if not found.
    2. Guard: only ANOMALY orders may be resolved - 400 otherwise.
    3. Snapshot current (bad) coordinates into original_latitude / original_longitude.
    4. Apply corrected coordinates from the support agent payload.
    5. Populate the full resolution audit trail.
    6. Transition status to RESOLVED_MANUALLY.
    7. Commit and return the updated order.
    """

    # ------------------------------------------------------------------
    # 1 - Fetch order
    # ------------------------------------------------------------------
    order = db.get(Order, order_id)

    if order is None:
        logger.warning("resolve_order: order id=%s not found.", order_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id={order_id} not found.",
        )

    # ------------------------------------------------------------------
    # 2 - State-machine guard
    # ------------------------------------------------------------------
    if order.status != OrderStatus.ANOMALY:
        logger.warning(
            "resolve_order: order id=%s rejected – current status is %s, "
            "expected ANOMALY.",
            order_id, order.status.value,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Order id={order_id} cannot be resolved: "
                f"current status is '{order.status.value}', "
                f"but only orders in 'ANOMALY' status are eligible for resolution."
            ),
        )

    # ------------------------------------------------------------------
    # 3 - Preserve original coordinates for audit trail
    #     (only snapshot once; skip if already set from a previous attempt)
    # ------------------------------------------------------------------
    if order.original_latitude is None and order.original_longitude is None:
        order.original_latitude  = order.latitude
        order.original_longitude = order.longitude
        logger.info(
            "resolve_order: order id=%s – snapshotting original coords "
            "(lat=%s, lon=%s).",
            order_id,
            order.original_latitude,
            order.original_longitude,
        )

    # ------------------------------------------------------------------
    # 4 - Apply corrected coordinates
    # ------------------------------------------------------------------
    order.latitude  = payload.new_latitude
    order.longitude = payload.new_longitude

    # ------------------------------------------------------------------
    # 5 - Write resolution audit trail
    # ------------------------------------------------------------------
    order.resolved_by  = payload.resolved_by
    order.resolved_at  = datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC
    order.support_note = payload.support_note

    # ------------------------------------------------------------------
    # 6 - State transition
    # ------------------------------------------------------------------
    order.status = OrderStatus.RESOLVED_MANUALLY

    # ------------------------------------------------------------------
    # 7 - Persist
    # ------------------------------------------------------------------
    db.commit()
    db.refresh(order)

    logger.info(
        "resolve_order: order id=%s transitioned ANOMALY -> RESOLVED_MANUALLY "
        "by agent '%s'  new_coords=(%.6f, %.6f).",
        order_id, payload.resolved_by,
        payload.new_latitude, payload.new_longitude,
    )

    return order
