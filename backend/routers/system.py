"""
routers/system.py
-----------------
Health check and aggregate status statistics endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Order, OrderStatus

router = APIRouter(tags=["system"])


@router.get(
    "/health",
    summary="Health check",
)
def health_check() -> dict:
    """Simple liveness probe."""
    return {"status": "ok"}


@router.get(
    "/orders/stats",
    summary="Order statistics by status",
    description="Returns a count of orders grouped by their lifecycle status.",
    tags=["orders"],
)
def order_stats(db: Session = Depends(get_db)) -> dict:
    """Aggregate order counts per status for the dashboard stats bar."""
    rows = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )

    stats = {s.value: 0 for s in OrderStatus}
    for order_status, count in rows:
        stats[order_status.value] = count

    stats["total"] = sum(stats.values())
    return stats
