from flask import Blueprint, render_template
from app.models.part import Part
from app.models.supplier import Supplier
from app.services.price_service import get_biggest_movers, get_price_summary_stats
from app.services.audit_service import get_recent_activity

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def dashboard():
    total_parts = Part.query.filter_by(is_active=True).count()
    total_suppliers = Supplier.query.filter_by(is_active=True).count()
    price_stats = get_price_summary_stats(days=30)
    biggest_movers = get_biggest_movers(days=30, limit=10)
    recent_activity = get_recent_activity(limit=15)

    return render_template(
        "dashboard.html",
        total_parts=total_parts,
        total_suppliers=total_suppliers,
        price_stats=price_stats,
        biggest_movers=biggest_movers,
        recent_activity=recent_activity,
    )
