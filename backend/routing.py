"""
routing.py
----------
Evolutionary Genetic Algorithm (GA) solver for the Capacitated Vehicle
Routing Problem (CVRP).

This module is stateless and side-effect-free: it receives a distance matrix,
customer demands, and fleet parameters, then returns optimised vehicle routes
using an evolutionary metaheuristic without external constraint-solver DLLs.

Genetic Algorithm Architecture
------------------------------
1. Initial Population (Başlangıç Popülasyonu):
   One Nearest-Neighbor greedy tour seed combined with random permutations.
2. Zero-Allocation Fitness & Capacity Decoder (Uygunluk & Kapasite Dekoderi):
   Scores Giant-Tour chromosomes with pure scalar arithmetic during evolution
   and materialises route structures once for the winning chromosome.
3. Tournament Selection (Turnuva Seçilimi):
   Selects fit parents via k-way tournament comparisons.
4. Order Crossover - OX1 (Çaprazlama):
   Preserves a contiguous slice from Parent 1 and fills remaining stops in
   Parent 2's relative order to prevent duplicate nodes.
5. Hybrid Mutation (Mutasyon):
   Applies 2-Opt sub-tour inversion (untangles crossing paths) or Swap mutation.
6. Elitism (Elitizm):
   Carries the highest-fitness chromosomes directly to the next generation.
"""

import logging
import random
import time
from typing import Any, Dict, List, Tuple

logger = logging.getLogger("smart_fleet.routing")


# ---------------------------------------------------------------------------
# Penalty & Evolutionary Hyperparameters
# ---------------------------------------------------------------------------

# Penalty per dropped customer node. Set high enough (100 km) so serving a
# customer always dominates skipping it unless fleet capacity makes it infeasible.
DROP_PENALTY = 100_000

POPULATION_SIZE = 80
GENERATIONS = 250
TOURNAMENT_SIZE = 3
MUTATION_RATE = 0.25
ELITE_SIZE = 6
TIME_LIMIT_SECONDS = 3.0
RANDOM_SEED = 42


# ---------------------------------------------------------------------------
# 1. Başlangıç Popülasyonu (Initial Population)
# ---------------------------------------------------------------------------

def _create_nearest_neighbor_chromosome(
    n_nodes: int,
    distance_matrix: List[List[int]],
) -> List[int]:
    """
    Build a deterministic greedy Giant-Tour chromosome starting from depot (0)
    by always picking the closest unvisited customer node.
    """
    unvisited = set(range(1, n_nodes))
    chromosome: List[int] = []
    current_node = 0

    while unvisited:
        next_node = min(unvisited, key=lambda node: distance_matrix[current_node][node])
        chromosome.append(next_node)
        unvisited.remove(next_node)
        current_node = next_node

    return chromosome


def _create_initial_population(
    n_nodes: int,
    distance_matrix: List[List[int]],
    population_size: int,
    rng: random.Random,
) -> List[List[int]]:
    """
    Generate the initial population: 1 Nearest-Neighbor seed individual plus
    (population_size - 1) shuffled customer permutations [1 .. n_nodes - 1].
    """
    customers = list(range(1, n_nodes))
    population: List[List[int]] = [_create_nearest_neighbor_chromosome(n_nodes, distance_matrix)]

    for _ in range(population_size - 1):
        individual = customers[:]
        rng.shuffle(individual)
        population.append(individual)

    return population


# ---------------------------------------------------------------------------
# 2. Uygunluk & Kapasite Dekoderi (Zero-Allocation Fitness & Route Decoder)
# ---------------------------------------------------------------------------

def _evaluate_fitness(
    chromosome: List[int],
    distance_matrix: List[List[int]],
    demands: List[int],
    num_vehicles: int,
    vehicle_capacities: List[int],
    max_vehicle_capacity: int,
) -> int:
    """
    Zero-allocation fitness evaluation for the GA hot loop:
    fitness_cost = total_distance_m + dropped_count * DROP_PENALTY.
    Avoids allocating route dicts and node lists across generations.
    """
    total_distance = 0
    dropped_count = 0

    vehicle_idx = 0
    current_load = 0
    last_node = 0

    for node in chromosome:
        demand = demands[node]

        if demand > max_vehicle_capacity:
            dropped_count += 1
            continue

        if vehicle_idx < num_vehicles and current_load + demand <= vehicle_capacities[vehicle_idx]:
            total_distance += distance_matrix[last_node][node]
            last_node = node
            current_load += demand
            continue

        assigned = False
        while vehicle_idx < num_vehicles:
            total_distance += distance_matrix[last_node][0]
            vehicle_idx += 1
            current_load = 0
            last_node = 0

            if vehicle_idx < num_vehicles and demand <= vehicle_capacities[vehicle_idx]:
                total_distance += distance_matrix[0][node]
                last_node = node
                current_load = demand
                assigned = True
                break

        if not assigned:
            dropped_count += 1

    if vehicle_idx < num_vehicles:
        total_distance += distance_matrix[last_node][0]
        remaining_empty = num_vehicles - vehicle_idx - 1
        if remaining_empty > 0:
            total_distance += remaining_empty * distance_matrix[0][0]

    return total_distance + dropped_count * DROP_PENALTY


def _close_vehicle_route(
    vehicle_id: int,
    current_nodes: List[int],
    current_dist: int,
    distance_matrix: List[List[int]],
) -> Dict[str, Any]:
    """Close an active or unused vehicle route by returning to the depot (0)."""
    last_node = current_nodes[-1]
    return {
        "vehicle": vehicle_id,
        "route_nodes": current_nodes + [0],
        "route_distance_m": current_dist + distance_matrix[last_node][0],
    }


def _decode_routes(
    chromosome: List[int],
    distance_matrix: List[List[int]],
    demands: List[int],
    num_vehicles: int,
    vehicle_capacities: List[int],
) -> Tuple[List[Dict[str, Any]], List[int], int]:
    """
    Materialise vehicle routes, dropped node indices, and total distance
    for the winning Giant-Tour chromosome after evolution completes.
    Unused vehicles are emitted with route_nodes=[0, 0] and distance=0.
    """
    routes: List[Dict[str, Any]] = []
    dropped: List[int] = []
    total_distance = 0
    max_vehicle_capacity = max(vehicle_capacities, default=0)

    vehicle_idx = 0
    current_load = 0
    current_nodes = [0]
    current_dist = 0

    for node in chromosome:
        demand = demands[node]

        if demand > max_vehicle_capacity:
            dropped.append(node)
            continue

        if vehicle_idx < num_vehicles and current_load + demand <= vehicle_capacities[vehicle_idx]:
            prev_node = current_nodes[-1]
            current_dist += distance_matrix[prev_node][node]
            current_nodes.append(node)
            current_load += demand
            continue

        assigned = False
        while vehicle_idx < num_vehicles:
            closed_route = _close_vehicle_route(
                vehicle_idx, current_nodes, current_dist, distance_matrix
            )
            routes.append(closed_route)
            total_distance += closed_route["route_distance_m"]

            vehicle_idx += 1
            current_load = 0
            current_nodes = [0]
            current_dist = 0

            if vehicle_idx < num_vehicles and demand <= vehicle_capacities[vehicle_idx]:
                current_dist = distance_matrix[0][node]
                current_nodes = [0, node]
                current_load = demand
                assigned = True
                break

        if not assigned:
            dropped.append(node)

    while vehicle_idx < num_vehicles:
        closed_route = _close_vehicle_route(
            vehicle_idx, current_nodes, current_dist, distance_matrix
        )
        routes.append(closed_route)
        total_distance += closed_route["route_distance_m"]

        vehicle_idx += 1
        current_nodes = [0]
        current_dist = 0

    return routes, sorted(dropped), total_distance


# ---------------------------------------------------------------------------
# 3. Seçilim (Tournament Selection)
# ---------------------------------------------------------------------------

def _tournament_select(
    evaluated_population: List[Tuple[int, List[int]]],
    tournament_size: int,
    rng: random.Random,
) -> List[int]:
    """
    Pick `tournament_size` random candidates and return the chromosome with the
    lowest fitness cost.
    """
    k = min(tournament_size, len(evaluated_population))
    candidates = rng.sample(evaluated_population, k=k)
    winner = min(candidates, key=lambda entry: entry[0])
    return winner[1]


# ---------------------------------------------------------------------------
# 4. Çaprazlama (Order Crossover - OX1)
# ---------------------------------------------------------------------------

def _order_crossover(
    parent1: List[int],
    parent2: List[int],
    rng: random.Random,
) -> List[int]:
    """
    Order Crossover (OX1):
    Copies a random contiguous slice [a..b] from parent1 into the offspring,
    then inserts remaining customer nodes following parent2's cyclic order.
    Guarantees a valid permutation with zero duplicate stops.
    """
    size = len(parent1)
    if size < 2:
        return parent1[:]

    start, end = sorted(rng.sample(range(size), 2))
    child = [0] * size
    child[start : end + 1] = parent1[start : end + 1]
    inherited = set(child[start : end + 1])

    fill_idx = (end + 1) % size
    cyclic_parent2 = parent2[end + 1 :] + parent2[: end + 1]
    for gene in cyclic_parent2:
        if gene not in inherited:
            child[fill_idx] = gene
            fill_idx = (fill_idx + 1) % size

    return child


# ---------------------------------------------------------------------------
# 5. Mutasyon (2-Opt Inversion & Swap Mutation)
# ---------------------------------------------------------------------------

def _mutate(
    chromosome: List[int],
    mutation_rate: float,
    rng: random.Random,
) -> None:
    """
    Apply in-place stochastic mutation to maintain genetic diversity:
    - 70% probability: 2-Opt segment reversal (eliminates crossing tour edges).
    - 30% probability: Swap mutation between two randomly chosen stops.
    """
    size = len(chromosome)
    if size < 2 or rng.random() > mutation_rate:
        return

    i, j = sorted(rng.sample(range(size), 2))
    if rng.random() < 0.7:
        chromosome[i : j + 1] = reversed(chromosome[i : j + 1])
    else:
        chromosome[i], chromosome[j] = chromosome[j], chromosome[i]


# ---------------------------------------------------------------------------
# 6. CVRP Evolutionary Solver Entrypoint
# ---------------------------------------------------------------------------

def solve_cvrp(
    distance_matrix: List[List[int]],
    demands:         List[int],
    num_vehicles:    int,
    vehicle_capacities: List[int],
) -> Dict[str, Any]:
    """
    Solve the Capacitated Vehicle Routing Problem using a Genetic Algorithm.

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
            "routes":    List[dict],   # one dict per vehicle
            "dropped":   List[int],    # node indices the solver could not serve
            "total_distance_m": int,   # sum of all route distances in metres
        }
    """
    n_nodes = len(distance_matrix)
    customers = list(range(1, n_nodes))

    if (
        n_nodes <= 1
        or num_vehicles <= 0
        or len(demands) != n_nodes
        or len(vehicle_capacities) != num_vehicles
    ):
        logger.warning(
            "CVRP solver returned NO_SOLUTION for %s nodes and %s vehicles.",
            n_nodes, num_vehicles,
        )
        return {
            "status":           "NO_SOLUTION",
            "routes":           [],
            "dropped":          customers,
            "total_distance_m": 0,
        }

    logger.info(
        "GA-CVRP solve starting – nodes=%s  vehicles=%s  capacities=%s",
        n_nodes, num_vehicles, vehicle_capacities,
    )

    rng = random.Random(RANDOM_SEED)
    start_time = time.monotonic()
    max_vehicle_capacity = max(vehicle_capacities, default=0)

    # Step 1: Initialize and score Generation 0
    initial_chromosomes = _create_initial_population(
        n_nodes, distance_matrix, POPULATION_SIZE, rng
    )
    evaluated_pop: List[Tuple[int, List[int]]] = [
        (
            _evaluate_fitness(
                chrom, distance_matrix, demands, num_vehicles, vehicle_capacities, max_vehicle_capacity
            ),
            chrom,
        )
        for chrom in initial_chromosomes
    ]

    evaluated_pop.sort(key=lambda entry: entry[0])
    best_cost = evaluated_pop[0][0]
    best_chromosome = evaluated_pop[0][1][:]

    # Evolution loop over generations
    elite_count = min(ELITE_SIZE, POPULATION_SIZE)
    for _ in range(GENERATIONS):
        if time.monotonic() - start_time >= TIME_LIMIT_SECONDS:
            break

        # Step 6 (Elitism): Preserve top individuals unchanged into next generation
        next_evaluated: List[Tuple[int, List[int]]] = [
            (cost, chrom[:]) for cost, chrom in evaluated_pop[:elite_count]
        ]

        # Produce offspring via Tournament Selection, OX1 Crossover, and Mutation
        while len(next_evaluated) < POPULATION_SIZE:
            parent1 = _tournament_select(evaluated_pop, TOURNAMENT_SIZE, rng)
            parent2 = _tournament_select(evaluated_pop, TOURNAMENT_SIZE, rng)

            child = _order_crossover(parent1, parent2, rng)
            _mutate(child, MUTATION_RATE, rng)

            cost = _evaluate_fitness(
                child, distance_matrix, demands, num_vehicles, vehicle_capacities, max_vehicle_capacity
            )
            next_evaluated.append((cost, child))

        next_evaluated.sort(key=lambda entry: entry[0])
        if next_evaluated[0][0] < best_cost:
            best_cost = next_evaluated[0][0]
            best_chromosome = next_evaluated[0][1][:]

        evaluated_pop = next_evaluated

    best_routes, dropped_sorted, best_dist = _decode_routes(
        best_chromosome, distance_matrix, demands, num_vehicles, vehicle_capacities
    )

    logger.info(
        "GA-CVRP solve SUCCESS – total_distance=%s m  routes=%s  dropped=%s node(s).",
        best_dist, len(best_routes), len(dropped_sorted),
    )

    return {
        "status":           "SUCCESS",
        "routes":           best_routes,
        "dropped":          dropped_sorted,
        "total_distance_m": best_dist,
    }
