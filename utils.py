"""
utils.py
--------
Pure mathematical utilities for geospatial calculations.

No external dependencies beyond the standard library — these functions are
deterministic, easily testable, and safe to call from any module.
"""

import math
from typing import List, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# WGS-84 mean Earth radius in **metres**.
EARTH_RADIUS_M = 6_371_000


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
    Calculate the great-circle distance between two points on Earth using
    the Haversine formula.

    Parameters
    ----------
    lat1, lon1 : float
        Latitude and longitude of the first point  (decimal degrees).
    lat2, lon2 : float
        Latitude and longitude of the second point (decimal degrees).

    Returns
    -------
    float
        Distance in **metres** (rounded to the nearest integer internally
        by consumers like the distance matrix, but returned as a float here
        for maximum precision).

    Mathematical reference
    ----------------------
        a = sin²(Δφ / 2) + cos(φ₁) · cos(φ₂) · sin²(Δλ / 2)
        c = 2 · atan2(√a, √(1 − a))
        d = R · c
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
# Distance matrix builder
# ---------------------------------------------------------------------------

def create_distance_matrix(
    coordinates: List[Tuple[float, float]],
) -> List[List[int]]:
    """
    Build a symmetric 2-D distance matrix from a list of (lat, lon) pairs.

    Parameters
    ----------
    coordinates : List[Tuple[float, float]]
        Ordered list of coordinate pairs.
        **Index 0 is always the Depot** (distribution centre).
        Indices 1 … N correspond to customer delivery points.

    Returns
    -------
    List[List[int]]
        An N×N matrix where ``matrix[i][j]`` is the Haversine distance
        (in metres, rounded to int) between ``coordinates[i]`` and
        ``coordinates[j]``.

    Notes
    -----
    * Integer metres are used because OR-Tools' routing solver operates on
      integer costs.  Rounding to the nearest metre introduces negligible
      error for real-world logistics.
    * The matrix is symmetric: ``matrix[i][j] == matrix[j][i]``.
    * Diagonal entries are always ``0``.
    """
    n = len(coordinates)
    matrix: List[List[int]] = [[0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1, n):
            dist = int(round(haversine(
                coordinates[i][0], coordinates[i][1],
                coordinates[j][0], coordinates[j][1],
            )))
            matrix[i][j] = dist
            matrix[j][i] = dist           # symmetric

    return matrix
