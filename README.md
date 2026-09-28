# Smart Fleet & Anomaly Support Dashboard

An enterprise-grade logistics command center and fleet route optimization platform. The system automates shipment ingestion, provides asynchronous geocoding with intelligent street fallback, detects geographic anomalies for manual support intervention, computes optimal vehicle routes via Google OR-Tools and OSRM road networks, and delivers an immersive driver navigation interface with real-time HUD tracking.

---

## Tech Stack

### Backend & Optimization Engine
- Python 3.11+
- FastAPI (High-performance ASGI framework with lifespan lifecycle)
- SQLAlchemy 2.0 (Modern mapped DeclarativeBase ORM)
- SQLite (Local ACID-compliant relational persistence)
- Google OR-Tools (Capacitated Vehicle Routing Problem solver with penalty-based node dropping)
- OSRM (Open Source Routing Machine for real street distance matrices and turn-by-turn GeoJSON geometry)
- OpenStreetMap Nominatim API (Asynchronous forward geocoding with rate limiting)
- Uvicorn (ASGI production server)

### Frontend & User Interface
- React 19
- Vite 6
- Tailwind CSS 3 (Utility-first styling with custom frosted glass extensions)
- Leaflet & React-Leaflet (Interactive GIS mapping engine with custom marker rendering and polyline routing)
- Axios (HTTP client with centralized baseURL configuration)

---

## Architecture & Key Features

### 1. Real Road Network Routing (OSRM Integration)
- Real Street Distance Matrix: Unlike basic Euclidean or aerial Haversine distance calculations, the routing pipeline leverages the OSRM Table API to retrieve driving distance matrices across genuine road segments.
- Offline Fallback: If external network connectivity fails, a robust fallback automatically computes Haversine distances augmented by a 1.3x urban circuity factor.
- Turn-by-Turn Driving Geometry: The OSRM Route API extracts high-precision street coordinates (GeoJSON), leg-by-leg geometries, and estimated travel durations (minutes) for every dispatched route.

### 2. Google OR-Tools CVRP Solver
- Solves the Capacitated Vehicle Routing Problem (CVRP) starting and ending at the primary distribution depot (Denizli central depot: 37.7765 N, 29.0864 E).
- Integer Arithmetic: Coordinates, weights (converted from kilograms to integer grams), and distances are normalized to integer values required by the constraint programming solver.
- Graceful Degradation: Utilizes AddDisjunction with large penalties (DROP_PENALTY) so that excess orders beyond fleet vehicle capacities are safely reported as unassigned rather than triggering an infeasible solver exception.

### 3. Asynchronous Geocoding with Turkish Street Fallback
- Non-blocking Ingestion: Orders submitted via batch or single endpoints are saved immediately in PENDING status. Geocoding runs in the background using FastAPI BackgroundTasks.
- Rate-Limit Compliance: Enforces a 1.2-second delay between OSM requests to comply with OpenStreetMap policy.
- Specificity Validation: Results with a Nominatim place_rank below 26 (e.g., city or region-level matches without street specificity) are automatically flagged as ANOMALY.
- Intelligent Street Extraction Fallback: When an exact address (with specific apartment or building numbers) yields no match, a regex parser extracts the core street, avenue, or boulevard (Caddesi, Bulvari, Sokak) and district (Pamukkale, Merkezefendi, Denizli) to retry with clean street-level coordinates.

### 4. Interactive Command Center & Driver Navigation Mode
- Full-Viewport Underlay Map: The Leaflet map spans the entire browser viewport behind floating glassmorphic interface panels.
- Resizable Glassmorphic Sidebar: Operators can drag the sidebar border to expand or contract the order list between 250px and 850px, with typography and UI elements scaling proportionally.
- Driver Navigation HUD: When routes are generated and navigation begins, the sidebar transitions off-screen and an active driving HUD panel appears at the bottom. The HUD displays current stop index, target customer details, exact road distance, estimated arrival time, and a single-click action to mark orders as DELIVERED and advance to the next delivery waypoint.
- Route Visualizer: Highlights the active travel leg in blue while fading completed legs and displaying dedicated depot markers.
- CSV Schedule Export: Generates downloadable CSV manifests containing stop sequences, vehicle IDs, customer names, addresses, coordinates, and package weights.

---

## Project Structure

```
smart-fleet-dashboard/
|-- database.py              # SQLAlchemy engine, session factory, Base definition
|-- main.py                  # FastAPI application entry point, lifecycle, endpoints
|-- models.py                # SQLAlchemy ORM models (Order, OrderStatus enum)
|-- schemas.py               # Pydantic v2 schemas (OrderCreate, OrderUpdate, OrderResponse, etc.)
|-- routing.py               # Google OR-Tools CVRP solver implementation
|-- utils.py                 # OSRM road matrix, Haversine fallback, turn-by-turn geometry
|-- requirements.txt         # Python runtime dependencies
|-- start_all.bat            # Dual-service one-click launcher for Windows
`-- frontend/
    |-- index.html           # HTML shell
    |-- package.json         # Frontend package configuration and scripts
    |-- tailwind.config.js   # Tailwind CSS design system configuration
    |-- vite.config.js       # Vite development and bundle configuration
    `-- src/
        |-- App.jsx          # Main application layout, state coordinator, and HUD logic
        |-- api.js           # Centralized Axios API communication client
        |-- index.css        # Global CSS, scrollbar styling, glassmorphism utilities
        |-- main.jsx         # React application bootstrap
        `-- components/
            |-- MapView.jsx      # Leaflet map, depot pin, route polylines, navigation zoom
            |-- NewOrderModal.jsx# Order creation modal with input validation
            |-- OrderCard.jsx    # Individual order card with status badges and quick actions
            |-- ResolveModal.jsx # Support agent anomaly coordinate override modal
            |-- RoutePanel.jsx   # Fleet parameters form, solver trigger, and CSV export
            `-- StatsBar.jsx     # Floating header metrics bar with click-to-filter cards
```

---

## API Reference

| HTTP Method | Path | Summary | Description |
|---|---|---|---|
| GET | /health | Health Check | System liveness probe returning operational status. |
| GET | /orders/stats | Order Statistics | Returns order counts aggregated by lifecycle status. |
| GET | /orders | List Orders | Retrieves all orders with optional ?status= filter. |
| POST | /orders | Create Order | Ingests a single order and dispatches background geocoding. |
| POST | /orders/batch | Batch Ingestion | Ingests multiple orders and dispatches background geocoding. |
| GET | /orders/{order_id} | Get Order | Retrieves full details of a specific order by primary key. |
| PATCH | /orders/{order_id} | Update Order | Updates customer details or address. Address changes trigger re-geocoding. |
| DELETE | /orders/{order_id} | Delete Order | Permanently removes an order from the database. |
| DELETE | /orders | Clear All Orders | Truncates all orders from the database. |
| GET | /orders/anomalies/ | List Anomalies | Lists orders currently in ANOMALY status requiring review. |
| PATCH | /orders/{order_id}/resolve | Resolve Anomaly | Allows support agents to manually correct coordinates for an anomalous order. |
| POST | /orders/{order_id}/regeocode | Re-geocode Order | Resets order to PENDING and re-runs Nominatim geocoding. |
| POST | /routes/generate | Generate Routes | Executes CVRP optimization and returns vehicle itineraries with OSRM geometry. |

---

## Order Lifecycle State Machine

```
              [ Order Submission ]
                       |
                       v
                   [ PENDING ]
                       |
          +------------+------------+
          |                         |
(Geocoding Success)        (Geocoding Failure)
(place_rank >= 26)         (place_rank < 26 / Empty)
          |                         |
          v                         v
      [ PENDING ]              [ ANOMALY ]
   (Coordinates set)                |
          |               (Manual Coordinate Fix)
          |                         |
          |                         v
          |               [ RESOLVED_MANUALLY ]
          |                         |
          +------------+------------+
                       |
             (Run CVRP Optimizer)
                       |
                       v
                   [ ROUTED ]
                       |
            (Driver Mark Delivered)
                       |
                       v
                  [ DELIVERED ]
```

---

## Installation and Execution

### Prerequisites
- Python 3.11 or higher
- Node.js 18.0 or higher with npm

### Quick Start (Windows)
Double-click the `start_all.bat` script in the root directory. This will automatically activate the Python virtual environment, start the FastAPI backend server, and launch the Vite frontend server in separate command windows.

- Web Application: http://localhost:5173
- Interactive API Documentation (Swagger UI): http://127.0.0.1:8000/docs
- Alternative API Documentation (ReDoc): http://127.0.0.1:8000/redoc

### Manual Setup

#### 1. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv .venv
source .venv/Scripts/activate  # On Windows (bash) or .\.venv\Scripts\activate in PowerShell
# source .venv/bin/activate    # On Linux / macOS

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

---

## License

This project is proprietary software developed for logistics fleet management and anomaly support operations. All rights reserved.
