# Smart Fleet & Anomaly Support Dashboard

An enterprise-grade logistics management system built to automate shipment geocoding, detect address anomalies, enable manual support intervention, and generate optimised delivery routes using constraint programming.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | Python 3.11+, FastAPI |
| ORM & Database | SQLAlchemy 2.0, SQLite |
| Geocoding | OpenStreetMap Nominatim API |
| Route Optimisation | Google OR-Tools (CVRP) |
| Server | Uvicorn (ASGI) |

---

## Core Features

### Background Geocoding
Incoming orders are persisted immediately and geocoded asynchronously via FastAPI's `BackgroundTasks`. Each address is resolved against the Nominatim API. Results with a `place_rank` below 26 — indicating insufficient geographic specificity — are automatically flagged as `ANOMALY`, keeping the ingestion endpoint non-blocking at all times.

### Support Dashboard — Anomaly Resolution
A `PATCH /orders/{id}/resolve` endpoint allows support agents to manually correct flagged orders. The system enforces a strict state machine: only orders in `ANOMALY` status can be resolved. On resolution, the original (bad) coordinates are preserved in `original_latitude` / `original_longitude` for a permanent audit trail, and the order transitions to `RESOLVED_MANUALLY`.

### CVRP Routing Engine
`POST /routes/generate` runs a Capacitated Vehicle Routing Problem solver over all eligible orders (`PENDING` or `RESOLVED_MANUALLY`). It uses the Haversine formula to build an integer distance matrix, then feeds it to Google OR-Tools with a demand/capacity dimension and a dropped-node penalty, ensuring the solver degrades gracefully when fleet capacity is insufficient rather than returning an infeasible result.

---

## Project Structure

```
smart-fleet-dashboard/
├── database.py        # SQLAlchemy engine, session factory, Base
├── models.py          # ORM model: Order, OrderStatus enum
├── schemas.py         # Pydantic schemas: OrderCreate, OrderResponse,
│                      #   OrderResolve, RouteGenerationRequest
├── utils.py           # Haversine formula, distance matrix builder
├── routing.py         # OR-Tools CVRP solver
├── main.py            # FastAPI app, all endpoints, background workers
└── requirements.txt
```

---

## Setup & Run

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# source venv/bin/activate         # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the development server
uvicorn main:app --reload
```

The interactive API documentation will be available at:
`http://127.0.0.1:8000/docs`

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/orders/batch` | Ingest a batch of orders; geocoding runs in background |
| `GET` | `/orders` | List all orders |
| `GET` | `/orders/{id}` | Retrieve a single order |
| `GET` | `/orders/anomalies/` | List all orders currently in `ANOMALY` status |
| `PATCH` | `/orders/{id}/resolve` | Manually resolve an anomalous order |
| `POST` | `/routes/generate` | Run the CVRP solver and generate delivery routes |

---

## Order Lifecycle

```
PENDING --> ANOMALY --> RESOLVED_MANUALLY --> ROUTED --> DELIVERED
   |                                             |
   +---------------------------------------------+
         (geocoding passes, place_rank >= 26)
```

---

## License

This project is provided as a proprietary internal tool. All rights reserved.
