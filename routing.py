"""
routing.py
----------
Google OR-Tools CVRP (Capacitated Vehicle Routing Problem) solver.

This module is stateless and side-effect-free: it takes a distance matrix,
demand list, and fleet description, and returns optimised routes.  All
database interaction stays in main.py.

Key design decisions
--------------------
* **Dropped-node support** – a large-but-finite penalty is assigned via
  ``AddDisjunction`` so the solver can drop nodes that violate capacity
  constraints instead of returning an infeasible solution.
* **Integer arithmetic** – all distances (metres) and demands (grams) are
  integers, matching OR-Tools' internal solver requirements.
"""

from typing import Any, Dict, List

from ortools.constraint_solver import pywrapcp, routing_enums_pb2


# ---------------------------------------------------------------------------
# Penalty constant
# ---------------------------------------------------------------------------

# Penalty for dropping a node.  Set high enough that the solver prefers to
# serve a customer unless physically impossible due to capacity.  Using
# 100 km (100 000 m) ensures it dominates any realistic inter-city distance
# while staying well within int64 range even when summed over many nodes.
DROP_PENALTY = 100_000


# ---------------------------------------------------------------------------
# CVRP Solver
# ---------------------------------------------------------------------------

def solve_cvrp(
    distance_matrix: List[List[int]],
    demands:         List[int],
    num_vehicles:    int,
    vehicle_capacities: List[int],
) -> Dict[str, Any]:
    """
    Solve the Capacitated Vehicle Routing Problem using Google OR-Tools.

    Parameters
    ----------
    distance_matrix : List[List[int]]
        Symmetric N×N matrix of pairwise distances in **metres** (integers).
        Index 0 is the Depot.

    demands : List[int]
        Demand for each node in **grams** (integers).
        ``demands[0]`` must be ``0`` (the depot has no demand).

    num_vehicles : int
        Number of vehicles in the fleet.  All vehicles start and end at
        the depot (index 0).

    vehicle_capacities : List[int]
        Maximum load capacity for each vehicle in **grams** (integers).
        Length must equal ``num_vehicles``.

    Returns
    -------
    dict
        {
            "status":    str,          # "SUCCESS" or "NO_SOLUTION"
            "routes":    List[dict],   # one dict per vehicle (see below)
            "dropped":   List[int],    # node indices the solver could not serve
            "total_distance_m": int,   # sum of all route distances in metres
        }

        Each route dict::

            {
                "vehicle":      int,        # 0-based vehicle index
                "route_nodes":  List[int],  # ordered node indices (incl. depot)
                "route_distance_m": int,    # total distance for this route
            }

    Notes
    -----
    * If ``num_vehicles`` or capacity is insufficient to serve all customers,
      the solver **drops** excess nodes (returns them in ``dropped``) rather
      than failing outright, thanks to ``AddDisjunction`` with a finite penalty.
    * The first-solution strategy is PATH_CHEAPEST_ARC; the local search
      metaheuristic is GUIDED_LOCAL_SEARCH with a 5-second time limit —
      good enough for up to ~200 nodes in production.
    """

    n_nodes = len(distance_matrix)

    # ------------------------------------------------------------------
    # 1 ─ Routing index manager & model
    # ------------------------------------------------------------------
    manager = pywrapcp.RoutingIndexManager(
        n_nodes,
        num_vehicles,
        0,                       # depot index
    )
    routing = pywrapcp.RoutingModel(manager)

    # ------------------------------------------------------------------
    # 2 ─ Transit (distance) callback & arc cost evaluator
    # ------------------------------------------------------------------
    def _distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node   = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_cb_index = routing.RegisterTransitCallback(_distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_index)

    # ------------------------------------------------------------------
    # 3 ─ Capacity dimension (demand callback)
    # ------------------------------------------------------------------
    def _demand_callback(from_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_cb_index = routing.RegisterUnaryTransitCallback(_demand_callback)

    routing.AddDimensionWithVehicleCapacity(
        demand_cb_index,
        0,                       # no slack
        vehicle_capacities,      # per-vehicle max capacity
        True,                    # start cumul to zero
        "Capacity",
    )

    # ------------------------------------------------------------------
    # 4 ─ Allow the solver to drop nodes (disjunctions with penalty)
    # ------------------------------------------------------------------
    # Node 0 is the depot — it must never be dropped, so we skip it.
    for node_index in range(1, n_nodes):
        routing_index = manager.NodeToIndex(node_index)
        routing.AddDisjunction([routing_index], DROP_PENALTY)

    # ------------------------------------------------------------------
    # 5 ─ Search parameters
    # ------------------------------------------------------------------
    search_params = pywrapcp.DefaultRoutingSearchParameters()

    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = 5

    # ------------------------------------------------------------------
    # 6 ─ Solve
    # ------------------------------------------------------------------
    solution = routing.SolveWithParameters(search_params)

    if solution is None:
        return {
            "status":           "NO_SOLUTION",
            "routes":           [],
            "dropped":          list(range(1, n_nodes)),
            "total_distance_m": 0,
        }

    # ------------------------------------------------------------------
    # 7 ─ Extract routes & dropped nodes
    # ------------------------------------------------------------------
    routes: List[Dict[str, Any]] = []
    total_distance = 0

    for vehicle_id in range(num_vehicles):
        route_nodes:    List[int] = []
        route_distance: int       = 0
        index = routing.Start(vehicle_id)

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            route_nodes.append(node)
            next_index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(
                index, next_index, vehicle_id
            )
            index = next_index

        # Append the depot at the end to close the loop
        route_nodes.append(manager.IndexToNode(index))

        routes.append({
            "vehicle":          vehicle_id,
            "route_nodes":      route_nodes,
            "route_distance_m": route_distance,
        })

        total_distance += route_distance

    # Identify dropped nodes
    dropped: List[int] = []
    for node_index in range(1, n_nodes):
        routing_index = manager.NodeToIndex(node_index)
        if solution.Value(routing.NextVar(routing_index)) == routing_index:
            dropped.append(node_index)

    return {
        "status":           "SUCCESS",
        "routes":           routes,
        "dropped":          dropped,
        "total_distance_m": total_distance,
    }
