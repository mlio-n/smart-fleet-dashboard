"""
routers/orders.py
-----------------
Order management endpoints: ingestion, CRUD, status updates,
re-geocoding, and anomaly resolution.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Order, OrderStatus
from schemas import OrderCreate, OrderUpdate, OrderResponse, OrderResolve
from services.geocoding import process_orders_geocoding

logger = logging.getLogger("smart_fleet.orders")

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post(
    "/batch",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a batch of orders for geocoding",
    description="Accepts a list of orders, persists them as PENDING, and dispatches background geocoding.",
)
def create_orders_batch(
    payload: list[OrderCreate],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload must contain at least one order.",
        )

    new_orders: list[Order] = []
    for item in payload:
        new_orders.append(Order(
            customer_name=item.customer_name,
            raw_address=item.raw_address,
            weight=item.weight,
            status=OrderStatus.PENDING,
        ))

    db.add_all(new_orders)
    db.flush()
    order_ids = [o.id for o in new_orders]
    db.commit()

    logger.info("Batch ingested – %s order(s) saved (ids=%s). Geocoding dispatched.", len(order_ids), order_ids)
    background_tasks.add_task(process_orders_geocoding, order_ids)

    return {
        "message": "Orders received, processing in background.",
        "order_ids": order_ids,
        "count": len(order_ids),
    }


@router.get(
    "",
    response_model=list[OrderResponse],
    summary="List all orders",
    description="Returns all orders in the system, newest first. Optionally filter by status.",
)
def list_orders(
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[Order]:
    query = db.query(Order)
    if status:
        try:
            status_enum = OrderStatus(status)
            query = query.filter(Order.status == status_enum)
        except ValueError:
            pass
    return query.order_by(Order.created_at.desc()).all()


@router.get(
    "/anomalies/",
    response_model=list[OrderResponse],
    summary="List all anomalous orders",
    description="Returns all orders currently in ANOMALY status for support review.",
)
def list_anomalies(db: Session = Depends(get_db)) -> list[Order]:
    return (
        db.query(Order)
        .filter(Order.status == OrderStatus.ANOMALY)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get a single order by ID",
)
def get_order(order_id: int, db: Session = Depends(get_db)) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id={order_id} not found.",
        )
    return order


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a single order",
    description="Creates a new order, persists it as PENDING, and dispatches background geocoding.",
)
def create_single_order(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Order:
    order = Order(
        customer_name=payload.customer_name,
        raw_address=payload.raw_address,
        weight=payload.weight,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    logger.info("Single order created (id=%s). Geocoding dispatched.", order.id)
    background_tasks.add_task(process_orders_geocoding, [order.id])
    return order


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an order",
    description="Permanently deletes an order from the database.",
)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> None:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id={order_id} not found.",
        )
    db.delete(order)
    db.commit()
    logger.info("Order id=%s deleted successfully.", order_id)


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete all orders",
    description="Permanently deletes all orders from the database.",
)
def delete_all_orders(db: Session = Depends(get_db)) -> None:
    db.query(Order).delete()
    db.commit()
    logger.info("All orders cleared successfully.")


@router.patch(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Update order details",
    description="Updates order attributes. If the address is modified, status resets to PENDING and re-geocoding is triggered.",
)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id={order_id} not found.",
        )

    address_changed = False
    if payload.customer_name is not None:
        order.customer_name = payload.customer_name
    if payload.weight is not None:
        order.weight = payload.weight
    if payload.status is not None:
        order.status = payload.status
    if payload.raw_address is not None and payload.raw_address != order.raw_address:
        order.raw_address = payload.raw_address
        order.status = OrderStatus.PENDING
        order.latitude = None
        order.longitude = None
        order.place_rank = None
        address_changed = True

    db.commit()
    db.refresh(order)

    if address_changed:
        logger.info("Order id=%s address changed. Re-geocoding dispatched.", order_id)
        background_tasks.add_task(process_orders_geocoding, [order.id])

    return order


@router.post(
    "/{order_id}/regeocode",
    response_model=OrderResponse,
    summary="Retry geocoding for an order",
    description="Resets order status to PENDING and triggers background geocoding again.",
)
def regeocode_order(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id={order_id} not found.",
        )

    order.status = OrderStatus.PENDING
    db.commit()
    db.refresh(order)

    logger.info("Order id=%s re-geocoding requested.", order_id)
    background_tasks.add_task(process_orders_geocoding, [order.id])
    return order


@router.patch(
    "/{order_id}/resolve",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve an anomalous order",
    description="Allows a support agent to manually correct coordinates of an order in ANOMALY status.",
)
def resolve_order(
    order_id: int,
    payload: OrderResolve,
    db: Session = Depends(get_db),
) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        logger.warning("resolve_order: order id=%s not found.", order_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id={order_id} not found.",
        )

    if order.status != OrderStatus.ANOMALY:
        logger.warning("resolve_order: order id=%s rejected – current status is %s, expected ANOMALY.", order_id, order.status.value)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order id={order_id} cannot be resolved: current status is '{order.status.value}', expected 'ANOMALY'.",
        )

    if order.original_latitude is None and order.original_longitude is None:
        order.original_latitude = order.latitude
        order.original_longitude = order.longitude

    order.latitude = payload.new_latitude
    order.longitude = payload.new_longitude
    order.resolved_by = payload.resolved_by
    order.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    order.support_note = payload.support_note
    order.status = OrderStatus.RESOLVED_MANUALLY

    db.commit()
    db.refresh(order)

    logger.info("resolve_order: order id=%s resolved by '%s' -> (%.6f, %.6f).", order_id, payload.resolved_by, payload.new_latitude, payload.new_longitude)
    return order
