from datetime import datetime, timezone, timedelta
from sqlalchemy import func
from app.extensions import db
from app.models.price import PriceHistory
from app.models.supplier import SupplierPart
from app.services.audit_service import log_change


def record_price_change(supplier_part_id, new_price, source="manual"):
    """Record a price change for a supplier part. Returns the PriceHistory entry or None if no change."""
    sp = db.session.get(SupplierPart, supplier_part_id)
    if not sp:
        return None

    old_price = sp.supplier_price
    if old_price is not None and abs(old_price - new_price) < 0.001:
        return None  # No meaningful change

    change_amount = None
    change_percent = None
    if old_price is not None and old_price > 0:
        change_amount = round(new_price - old_price, 4)
        change_percent = round((change_amount / old_price) * 100, 2)

    entry = PriceHistory(
        supplier_part_id=supplier_part_id,
        old_price=old_price,
        new_price=new_price,
        change_amount=change_amount,
        change_percent=change_percent,
        source=source,
    )
    db.session.add(entry)

    sp.supplier_price = new_price
    sp.last_price_check = datetime.now(timezone.utc)

    log_change(
        "supplier_part",
        supplier_part_id,
        "price_update",
        {"price": old_price},
        {"price": new_price},
        source=source,
    )

    return entry


def get_biggest_movers(days=30, limit=50, direction="increases"):
    """Get the biggest price changes in the given period."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    query = (
        PriceHistory.query
        .filter(PriceHistory.recorded_at >= cutoff)
        .filter(PriceHistory.change_percent.isnot(None))
    )

    if direction == "increases":
        query = query.filter(PriceHistory.change_percent > 0)
        query = query.order_by(PriceHistory.change_percent.desc())
    elif direction == "decreases":
        query = query.filter(PriceHistory.change_percent < 0)
        query = query.order_by(PriceHistory.change_percent.asc())
    else:
        query = query.order_by(func.abs(PriceHistory.change_percent).desc())

    return query.limit(limit).all()


def get_price_history(supplier_part_id):
    """Get full price history for a supplier part, oldest first."""
    return (
        PriceHistory.query
        .filter_by(supplier_part_id=supplier_part_id)
        .order_by(PriceHistory.recorded_at.asc())
        .all()
    )


def get_price_summary_stats(days=30):
    """Dashboard summary: count of changes, avg increase, etc."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    changes = PriceHistory.query.filter(PriceHistory.recorded_at >= cutoff).all()

    if not changes:
        return {
            "total_changes": 0,
            "increases": 0,
            "decreases": 0,
            "avg_increase_pct": 0,
            "max_increase_pct": 0,
        }

    increases = [c for c in changes if c.change_percent and c.change_percent > 0]
    decreases = [c for c in changes if c.change_percent and c.change_percent < 0]

    avg_inc = sum(c.change_percent for c in increases) / len(increases) if increases else 0
    max_inc = max((c.change_percent for c in increases), default=0)

    return {
        "total_changes": len(changes),
        "increases": len(increases),
        "decreases": len(decreases),
        "avg_increase_pct": round(avg_inc, 2),
        "max_increase_pct": round(max_inc, 2),
    }
