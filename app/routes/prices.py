from flask import Blueprint, render_template, request, jsonify
from app.services.price_service import get_biggest_movers, get_price_history, get_price_summary_stats

prices_bp = Blueprint("prices", __name__)


@prices_bp.route("/report")
def report():
    days = request.args.get("days", 30, type=int)
    limit = request.args.get("limit", 50, type=int)

    increases = get_biggest_movers(days=days, limit=limit, direction="increases")
    decreases = get_biggest_movers(days=days, limit=limit, direction="decreases")
    stats = get_price_summary_stats(days=days)

    return render_template(
        "prices/report.html",
        increases=increases,
        decreases=decreases,
        stats=stats,
        days=days,
    )


@prices_bp.route("/history/<int:supplier_part_id>")
def history_json(supplier_part_id):
    """JSON endpoint for Chart.js price history."""
    history = get_price_history(supplier_part_id)
    data = {
        "labels": [h.recorded_at.strftime("%Y-%m-%d") for h in history],
        "prices": [h.new_price for h in history],
    }
    return jsonify(data)
