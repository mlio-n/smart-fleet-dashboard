"""
utils.py
--------
Geospatial and routing utilities.

Uses Open Source Routing Machine (OSRM) for real road network distances and
exact street geometry, with automatic mathematical Haversine fallback.
"""

import math
import logging
from typing import List, Tuple, Dict, Any
import requests

logger = logging.getLogger("smart_fleet.routing")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EARTH_RADIUS_M = 6_371_000
OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/driving"
OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving"
OSRM_HEADERS = {"User-Agent": "SmartFleet_Logistics/1.0"}
OSRM_TIMEOUT = 5  # seconds timeout for external routing calls


# ---------------------------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------------------------

def haversine(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate great-circle aerial distance between two points on Earth (meters).
    """
    phi1     = math.radians(lat1)
    phi2     = math.radians(lat2)
    d_phi    = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_M * c


# ---------------------------------------------------------------------------
# Distance Matrix with OSRM Real Road Distance
# ---------------------------------------------------------------------------

def create_distance_matrix(
    coordinates: List[Tuple[float, float]],
) -> List[List[int]]:
    """
    Build a distance matrix from a list of (lat, lon) pairs using real street
    driving distances from OSRM, falling back to Haversine if offline.
    """
    n = len(coordinates)
    if n == 0:
        return []

    # 1. Try real road network distances via OSRM Table API
    try:
        coord_str = ";".join(f"{lon},{lat}" for lat, lon in coordinates)
        url = f"{OSRM_TABLE_URL}/{coord_str}?annotations=distance"
        response = requests.get(url, headers=OSRM_HEADERS, timeout=OSRM_TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == "Ok" and "distances" in data:
                raw_matrix = data["distances"]
                # Convert to integer meters (handle any None values with 0)
                matrix = [
                    [int(round(cell or 0)) for cell in row]
                    for row in raw_matrix
                ]
                logger.info("Successfully generated real road distance matrix via OSRM (%sx%s).", n, n)
                return matrix
    except Exception as exc:
        logger.warning("OSRM distance table request failed, falling back to Haversine: %s", exc)

    # 2. Fallback: Haversine distance with 1.3 urban circuity factor
    matrix: List[List[int]] = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            dist = int(round(haversine(
                coordinates[i][0], coordinates[i][1],
                coordinates[j][0], coordinates[j][1],
            ) * 1.3))
            matrix[i][j] = dist
            matrix[j][i] = dist

    logger.info("Generated fallback Haversine distance matrix (%sx%s).", n, n)
    return matrix


# ---------------------------------------------------------------------------
# Real Street Turn-by-Turn Road Geometry
# ---------------------------------------------------------------------------

def get_route_driving_geometry(
    coordinates: List[Tuple[float, float]],
) -> Dict[str, Any]:
    """
    Fetch exact turn-by-turn road geometry and driving statistics for an ordered
    list of (lat, lon) stop coordinates using OSRM.

    Returns:
        {
            "geometry": [[lat, lon], [lat, lon], ...],  # Follows real roads
            "distance_m": float,                        # Actual street driving distance
            "duration_s": float,                        # Driving time in seconds
        }
    """
    if len(coordinates) < 2:
        return {
            "geometry": [[lat, lon] for lat, lon in coordinates],
            "distance_m": 0,
            "duration_s": 0,
        }

    try:
        coord_str = ";".join(f"{lon},{lat}" for lat, lon in coordinates)
        url = f"{OSRM_ROUTE_URL}/{coord_str}?overview=full&geometries=geojson&steps=true"
        response = requests.get(url, headers=OSRM_HEADERS, timeout=OSRM_TIMEOUT)

        if response.status_code == 200:
            data = response.json()
            if data.get("code") == "Ok" and data.get("routes"):
                best_route = data["routes"][0]
                # OSRM geojson coordinates are [lon, lat], Leaflet expects [lat, lon]
                osrm_coords = best_route["geometry"]["coordinates"]
                leaflet_coords = [[lat, lon] for lon, lat in osrm_coords]

                # Extract individual leg road geometries
                legs_geometry: List[List[List[float]]] = []
                for leg_idx, leg in enumerate(best_route.get("legs", [])):
                    leg_pts: List[List[float]] = []
                    for step in leg.get("steps", []):
                        for lon, lat in step.get("geometry", {}).get("coordinates", []):
                            leg_pts.append([lat, lon])
                    if not leg_pts and leg_idx < len(coordinates) - 1:
                        leg_pts = [
                            [coordinates[leg_idx][0], coordinates[leg_idx][1]],
                            [coordinates[leg_idx + 1][0], coordinates[leg_idx + 1][1]],
                        ]
                    legs_geometry.append(leg_pts)

                logger.info(
                    "OSRM road geometry fetched: %s waypoints, %s legs, %.1f km, %.1f mins.",
                    len(leaflet_coords),
                    len(legs_geometry),
                    best_route["distance"] / 1000,
                    best_route["duration"] / 60,
                )

                return {
                    "geometry": leaflet_coords,
                    "legs_geometry": legs_geometry,
                    "distance_m": best_route["distance"],
                    "duration_s": best_route["duration"],
                }
    except Exception as exc:
        logger.warning("OSRM route geometry request failed, falling back to straight lines: %s", exc)

    # Fallback to straight segments between stops
    fallback_legs = [
        [[coordinates[i][0], coordinates[i][1]], [coordinates[i + 1][0], coordinates[i + 1][1]]]
        for i in range(len(coordinates) - 1)
    ]
    return {
        "geometry": [[lat, lon] for lat, lon in coordinates],
        "legs_geometry": fallback_legs,
        "distance_m": 0,
        "duration_s": 0,
    }
