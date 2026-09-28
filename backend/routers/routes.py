"""
routers/routes.py
-----------------
Route generation endpoint running Google OR-Tools CVRP solver.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Order, OrderStatus
from schemas import RouteGenerationRequest
from utils import create_distance_matrix, get_route_driving_geometry
from routing import solve_cvrp

logger = logging.getLogger("smart_fleet.routing_router")

router = APIRouter(prefix="/routes", tags=["routes"])

# Central Depot – Denizli, Turkey
DEPOT_LATITUDE = 37.7765
DEPOT_LONGITUDE = 29.0864


@router.post(
    "/generate",
    status_code=status.HTTP_200_OK,
    summary="Generate optimised delivery routes (CVRP)",
    description="Runs the Google OR-Tools CVRP solver on routable orders and transitions routed ones to ROUTED.",
)
def generate_routes(
    payload: RouteGenerationRequest,
    db: Session = Depends(get_db),
) -> dict:
    routable_statuses = [
        OrderStatus.PENDING,
        OrderStatus.RESOLVED_MANUALLY,
        OrderStatus.ROUTED,
    ]

    routable_orders: list[Order] = (
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
            detail="No routable orders found. Orders must have status PENDING or RESOLVED_MANUALLY and valid coordinates.",
        )

    logger.info("Route generation – %s routable order(s) found.", len(routable_orders))

    # 1. Coordinates list (Depot at index 0)
    coordinates = [(DEPOT_LATITUDE, DEPOT_LONGITUDE)]
    for order in routable_orders:
        coordinates.append((order.latitude, order.longitude))

    # 2. Distance matrix
    distance_matrix = create_distance_matrix(coordinates)

    # 3. Demands & vehicle capacities
    demands = [0]
    for order in routable_orders:
        demands.append(int(round(order.weight * 1000)))

    vehicle_capacity_g = int(round(payload.vehicle_capacity * 1000))
    vehicle_capacities = [vehicle_capacity_g] * payload.num_vehicles

    # 4. Solve CVRP
    result = solve_cvrp(
        distance_matrix=distance_matrix,
        demands=demands,
        num_vehicles=payload.num_vehicles,
        vehicle_capacities=vehicle_capacities,
    )

    logger.info("CVRP result – status=%s  total_distance=%s m  dropped=%s node(s).",
                result["status"], result["total_distance_m"], len(result["dropped"]))

    if result["status"] == "NO_SOLUTION":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="OR-Tools could not find any feasible solution for the given fleet parameters.",
        )

    dropped_node_set = set(result["dropped"])
    routed_order_ids: list[int] = []
    vehicle_routes = []

    for route in result["routes"]:
        route_order_details = []
        for node_index in route["route_nodes"]:
            if node_index == 0:
                route_order_details.append({
                    "node": "DEPOT",
                    "lat": DEPOT_LATITUDE,
                    "lon": DEPOT_LONGITUDE,
                })
            else:
                order = routable_orders[node_index - 1]
                route_order_details.append({
                    "node": node_index,
                    "order_id": order.id,
                    "customer_name": order.customer_name,
                    "raw_address": order.raw_address,
                    "weight_kg": order.weight,
                    "lat": order.latitude,
                    "lon": order.longitude,
                })
                routed_order_ids.append(order.id)

        stop_coords = [
            (s["lat"], s["lon"])
            for s in route_order_details
            if s.get("lat") is not None and s.get("lon") is not None
        ]
        road_data = get_route_driving_geometry(stop_coords)
        actual_distance = int(round(road_data.get("distance_m") or route["route_distance_m"]))
        duration_mins = round((road_data.get("duration_s") or 0) / 60, 1)

        vehicle_routes.append({
            "vehicle": route["vehicle"],
            "stops": route_order_details,
            "route_distance_m": actual_distance,
            "duration_minutes": duration_mins,
            "geometry": road_data.get("geometry", []),
            "legs_geometry": road_data.get("legs_geometry", []),
        })

    # 5. Batch update routed orders
    if routed_order_ids:
        db.query(Order).filter(Order.id.in_(routed_order_ids)).update(
            {Order.status: OrderStatus.ROUTED},
            synchronize_session=False,
        )
        db.commit()

    # 6. Unassigned orders
    unassigned = []
    for node_index in sorted(dropped_node_set):
        order = routable_orders[node_index - 1]
        unassigned.append({
            "order_id": order.id,
            "customer_name": order.customer_name,
            "raw_address": order.raw_address,
            "weight_kg": order.weight,
            "reason": "Dropped by solver – insufficient fleet capacity.",
        })

    logger.info("Route generation complete – %s order(s) routed, %s dropped.", len(routed_order_ids), len(unassigned))

    total_road_distance = sum(r["route_distance_m"] for r in vehicle_routes)

    return {
        "status": result["status"],
        "total_distance_m": total_road_distance,
        "num_vehicles_used": sum(1 for r in vehicle_routes if len(r["stops"]) > 2),
        "routes": vehicle_routes,
        "unassigned_orders": unassigned,
    }
