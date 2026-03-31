from flask import Blueprint, render_template, request, redirect, url_for, flash
from app.extensions import db
from app.models.part import Part, PartCategory
from app.models.supplier import Supplier, SupplierPart
from app.services.search_service import search_parts
from app.services.price_service import get_price_history
from app.services.audit_service import log_change, get_audit_trail

parts_bp = Blueprint("parts", __name__)


@parts_bp.route("/")
def list_parts():
    page = request.args.get("page", 1, type=int)
    q = request.args.get("q", "").strip()
    category_id = request.args.get("category", type=int)
    supplier_id = request.args.get("supplier", type=int)
    per_page = 50

    if q:
        parts = search_parts(q, limit=200)
        # Manual pagination for search results
        total = len(parts)
        start = (page - 1) * per_page
        parts_page = parts[start:start + per_page]
        total_pages = (total + per_page - 1) // per_page
    else:
        query = Part.query.filter_by(is_active=True)
        if category_id:
            query = query.filter_by(category_id=category_id)
        if supplier_id:
            sp_part_ids = db.session.query(SupplierPart.part_id).filter_by(supplier_id=supplier_id)
            query = query.filter(Part.id.in_(sp_part_ids))

        query = query.order_by(Part.internal_part_number)
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        parts_page = pagination.items
        total = pagination.total
        total_pages = pagination.pages

    categories = PartCategory.query.order_by(PartCategory.name).all()
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()

    return render_template(
        "parts/list.html",
        parts=parts_page,
        total=total,
        page=page,
        total_pages=total_pages,
        q=q,
        category_id=category_id,
        supplier_id=supplier_id,
        categories=categories,
        suppliers=suppliers,
    )


@parts_bp.route("/new", methods=["GET", "POST"])
def create_part():
    if request.method == "POST":
        part = Part(
            internal_part_number=request.form["internal_part_number"].strip(),
            description=request.form["description"].strip(),
            category_id=request.form.get("category_id") or None,
            unit_of_measure=request.form.get("unit_of_measure", "each").strip(),
            current_sell_price=float(request.form["sell_price"]) if request.form.get("sell_price") else None,
            notes=request.form.get("notes", "").strip() or None,
        )

        # Check for duplicate
        existing = Part.query.filter_by(internal_part_number=part.internal_part_number).first()
        if existing:
            flash(f"Part number {part.internal_part_number} already exists.", "danger")
            categories = PartCategory.query.order_by(PartCategory.name).all()
            return render_template("parts/form.html", part=part, categories=categories, is_new=True)

        db.session.add(part)
        db.session.flush()
        log_change("part", part.id, "create")

        # Handle supplier part numbers
        _save_supplier_parts(part, request.form)

        db.session.commit()
        flash(f"Part {part.internal_part_number} created.", "success")
        return redirect(url_for("parts.detail", part_id=part.id))

    categories = PartCategory.query.order_by(PartCategory.name).all()
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()
    return render_template("parts/form.html", part=None, categories=categories, suppliers=suppliers, is_new=True)


@parts_bp.route("/<int:part_id>")
def detail(part_id):
    part = db.session.get(Part, part_id) or Part.query.get_or_404(part_id)
    supplier_parts = part.supplier_parts.all()

    # Price history for each supplier part
    price_histories = {}
    for sp in supplier_parts:
        price_histories[sp.id] = get_price_history(sp.id)

    audit_trail = get_audit_trail("part", part_id, limit=20)

    return render_template(
        "parts/detail.html",
        part=part,
        supplier_parts=supplier_parts,
        price_histories=price_histories,
        audit_trail=audit_trail,
    )


@parts_bp.route("/<int:part_id>/edit", methods=["GET", "POST"])
def edit_part(part_id):
    part = db.session.get(Part, part_id) or Part.query.get_or_404(part_id)

    if request.method == "POST":
        old_values = {
            "description": part.description,
            "sell_price": part.current_sell_price,
            "category_id": part.category_id,
        }

        part.description = request.form["description"].strip()
        part.category_id = request.form.get("category_id") or None
        part.unit_of_measure = request.form.get("unit_of_measure", "each").strip()
        part.current_sell_price = float(request.form["sell_price"]) if request.form.get("sell_price") else None
        part.notes = request.form.get("notes", "").strip() or None

        new_values = {
            "description": part.description,
            "sell_price": part.current_sell_price,
            "category_id": part.category_id,
        }
        log_change("part", part.id, "update", old_values, new_values)

        _save_supplier_parts(part, request.form)

        db.session.commit()
        flash(f"Part {part.internal_part_number} updated.", "success")
        return redirect(url_for("parts.detail", part_id=part.id))

    categories = PartCategory.query.order_by(PartCategory.name).all()
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()
    return render_template("parts/form.html", part=part, categories=categories, suppliers=suppliers, is_new=False)


@parts_bp.route("/<int:part_id>/delete", methods=["POST"])
def delete_part(part_id):
    part = db.session.get(Part, part_id) or Part.query.get_or_404(part_id)
    part.is_active = False
    log_change("part", part.id, "delete")
    db.session.commit()
    flash(f"Part {part.internal_part_number} deactivated.", "warning")
    return redirect(url_for("parts.list_parts"))


def _save_supplier_parts(part, form):
    """Process supplier part number fields from form."""
    # Form fields: sp_supplier_id_0, sp_number_0, sp_price_0, sp_preferred_0, etc.
    idx = 0
    while True:
        supplier_id = form.get(f"sp_supplier_id_{idx}")
        if supplier_id is None:
            break
        supplier_id = int(supplier_id) if supplier_id else None
        sp_number = form.get(f"sp_number_{idx}", "").strip()
        sp_price = form.get(f"sp_price_{idx}", "").strip()
        sp_preferred = form.get(f"sp_preferred_{idx}") == "on"
        sp_id = form.get(f"sp_id_{idx}")

        if supplier_id and sp_number:
            price_val = float(sp_price) if sp_price else None

            if sp_id:
                # Update existing
                sp = db.session.get(SupplierPart, int(sp_id))
                if sp:
                    sp.supplier_id = supplier_id
                    sp.supplier_part_number = sp_number
                    if price_val is not None and sp.supplier_price != price_val:
                        from app.services.price_service import record_price_change
                        record_price_change(sp.id, price_val, source="manual")
                    sp.is_preferred = sp_preferred
            else:
                # Create new
                sp = SupplierPart(
                    part_id=part.id,
                    supplier_id=supplier_id,
                    supplier_part_number=sp_number,
                    supplier_price=price_val,
                    is_preferred=sp_preferred,
                )
                db.session.add(sp)

        idx += 1
