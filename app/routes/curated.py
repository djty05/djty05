import csv
import io
from flask import Blueprint, render_template, request, redirect, url_for, flash, Response, jsonify
from app.extensions import db
from app.models.curated import CuratedList, CuratedListItem
from app.models.part import Part
from app.services.simpro_export import export_simpro_format

curated_bp = Blueprint("curated", __name__)


@curated_bp.route("/")
def list_curated():
    lists = CuratedList.query.order_by(CuratedList.name).all()
    return render_template("curated/list.html", lists=lists)


@curated_bp.route("/new", methods=["GET", "POST"])
def create_list():
    if request.method == "POST":
        cl = CuratedList(
            name=request.form["name"].strip(),
            description=request.form.get("description", "").strip() or None,
            is_default=request.form.get("is_default") == "on",
        )
        db.session.add(cl)
        db.session.commit()
        flash(f"List '{cl.name}' created.", "success")
        return redirect(url_for("curated.detail", list_id=cl.id))

    return render_template("curated/form.html", cl=None, is_new=True)


@curated_bp.route("/<int:list_id>")
def detail(list_id):
    cl = db.session.get(CuratedList, list_id) or CuratedList.query.get_or_404(list_id)
    page = request.args.get("page", 1, type=int)
    q = request.args.get("q", "").strip()

    items_query = CuratedListItem.query.filter_by(curated_list_id=list_id).order_by(CuratedListItem.added_at.desc())
    if q:
        part_ids = db.session.query(Part.id).filter(
            (Part.internal_part_number.ilike(f"%{q}%")) | (Part.description.ilike(f"%{q}%"))
        )
        items_query = items_query.filter(CuratedListItem.part_id.in_(part_ids))

    pagination = items_query.paginate(page=page, per_page=50, error_out=False)
    return render_template("curated/detail.html", cl=cl, items=pagination, q=q)


@curated_bp.route("/<int:list_id>/edit", methods=["GET", "POST"])
def edit_list(list_id):
    cl = db.session.get(CuratedList, list_id) or CuratedList.query.get_or_404(list_id)
    if request.method == "POST":
        cl.name = request.form["name"].strip()
        cl.description = request.form.get("description", "").strip() or None
        cl.is_default = request.form.get("is_default") == "on"
        db.session.commit()
        flash(f"List '{cl.name}' updated.", "success")
        return redirect(url_for("curated.detail", list_id=cl.id))
    return render_template("curated/form.html", cl=cl, is_new=False)


@curated_bp.route("/<int:list_id>/add", methods=["POST"])
def add_part(list_id):
    cl = db.session.get(CuratedList, list_id) or CuratedList.query.get_or_404(list_id)
    part_id = request.form.get("part_id", type=int)
    if not part_id:
        flash("No part selected.", "danger")
        return redirect(url_for("curated.detail", list_id=list_id))

    existing = CuratedListItem.query.filter_by(curated_list_id=list_id, part_id=part_id).first()
    if existing:
        flash("Part already in list.", "info")
    else:
        item = CuratedListItem(
            curated_list_id=list_id,
            part_id=part_id,
            notes=request.form.get("notes", "").strip() or None,
        )
        db.session.add(item)
        db.session.commit()
        flash("Part added to list.", "success")
    return redirect(url_for("curated.detail", list_id=list_id))


@curated_bp.route("/<int:list_id>/remove/<int:item_id>", methods=["POST"])
def remove_part(list_id, item_id):
    item = db.session.get(CuratedListItem, item_id)
    if item and item.curated_list_id == list_id:
        db.session.delete(item)
        db.session.commit()
        flash("Part removed from list.", "success")
    return redirect(url_for("curated.detail", list_id=list_id))


@curated_bp.route("/<int:list_id>/export")
def export_list(list_id):
    cl = db.session.get(CuratedList, list_id) or CuratedList.query.get_or_404(list_id)
    items = CuratedListItem.query.filter_by(curated_list_id=list_id).all()
    parts = [item.part for item in items]

    fmt = request.args.get("format", "csv")
    if fmt == "simpro":
        rows = export_simpro_format(parts)
    else:
        rows = _export_standard(parts)

    if not rows:
        flash("No parts in list to export.", "warning")
        return redirect(url_for("curated.detail", list_id=list_id))

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

    filename = f"{cl.name.replace(' ', '_').lower()}_{'simpro' if fmt == 'simpro' else 'export'}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _export_standard(parts):
    rows = []
    for part in parts:
        cat = part.category
        group = ""
        sub_group = ""
        if cat:
            if cat.parent_id:
                sub_group = cat.name
                group = cat.parent.name if cat.parent else ""
            else:
                group = cat.name

        pref = part.preferred_supplier_part
        rows.append({
            "Part Number": part.internal_part_number,
            "Description": part.description,
            "Manufacturer": part.manufacturer or "",
            "Group": group,
            "Sub Group": sub_group,
            "Trade Price": part.current_sell_price or "",
            "Cost Price": part.cost_price or "",
            "Best Supplier Price": part.best_cost_price or "",
            "Preferred Supplier": pref.supplier.name if pref and pref.supplier else "",
            "Supplier Part #": pref.supplier_part_number if pref else "",
        })
    return rows
