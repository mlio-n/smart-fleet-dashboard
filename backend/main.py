"""
main.py
-------
FastAPI application entry point.

Architecture:
- Routers: system, orders, routes
- Services: geocoding (asynchronous background worker)
- ORM: SQLAlchemy 2.0 with SQLite WAL mode
- Routing: Google OR-Tools CVRP + OSRM road geometry
"""

import sys
import logging
from pathlib import Path
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database import Base, engine
from routers import system, orders, routes

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s – %(message)s",
)
logger = logging.getLogger("smart_fleet")

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Create database tables on startup if they do not exist."""
    logger.info("Running database migrations (create_all) …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")
    yield


# ---------------------------------------------------------------------------
# Application bootstrap
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Smart Fleet Dashboard – Support API",
    description="Enterprise-level logistics anomaly detection and CVRP support system.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(system.router)
app.include_router(orders.router)
app.include_router(routes.router)
