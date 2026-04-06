from flask import Blueprint, render_template, request, redirect, url_for, flash
from app.extensions import db
from app.models.equivalence import PartEquivalence
from app.models.supplier import SupplierPart
from app.models.part import Part

equivalences_bp = Blueprint("equivalences", __name__)


@equivalences_bp.route("/")
def list_equivalences():
    page = request.args.get("page", 1, type=int)
    equivs = PartEquivalence.query.order_by(PartEquivalence.created_at.desc()).paginate(
        page=page, per_page=50, error_out=False
    )
    return render_template("equivalences/list.html", equivs=equivs)


@equivalences_bp.route("/new", methods=["GET", "POST"])
def create_equivalence():
    if request.method == "POST":
        sp_a_id = request.form.get("supplier_part_a_id", type=int)
        sp_b_id = request.form.get("supplier_part_b_id", type=int)

        if not sp_a_id or not sp_b_id:
            flash("Please select both supplier parts.", "danger")
            return redirect(url_for("equivalences.create_equivalence"))
        if sp_a_id == sp_b_id:
            flash("Cannot map a part to itself.", "danger")
            return redirect(url_for("equivalences.create_equivalence"))

        # Ensure consistent ordering (lower id first)
        a_id, b_id = min(sp_a_id, sp_b_id), max(sp_a_id, sp_b_id)

        existing = PartEquivalence.query.filter_by(supplier_part_a_id=a_id, supplier_part_b_id=b_id).first()
        if existing:
            flash("This equivalence already exists.", "info")
            return redirect(url_for("equivalences.list_equivalences"))

        eq = PartEquivalence(
            supplier_part_a_id=a_id,
            supplier_part_b_id=b_id,
            confidence=request.form.get("confidence", "manual"),
            notes=request.form.get("notes", "").strip() or None,
        )
        db.session.add(eq)
        db.session.commit()
        flash("Part equivalence created.", "success")
        return redirect(url_for("equivalences.list_equivalences"))

    # For the form: search for parts to link
    q = request.args.get("q", "").strip()
    results = []
    if q:
        sps = (
            SupplierPart.query.join(Part)
            .filter(
                (SupplierPart.supplier_part_number.ilike(f"%{q}%"))
                | (Part.internal_part_number.ilike(f"%{q}%"))
                | (Part.description.ilike(f"%{q}%"))
            )
            .limit(50)
            .all()
        )
        results = sps

    return render_template("equivalences/form.html", results=results, q=q)


@equivalences_bp.route("/<int:eq_id>/delete", methods=["POST"])
def delete_equivalence(eq_id):
    eq = db.session.get(PartEquivalence, eq_id) or PartEquivalence.query.get_or_404(eq_id)
    db.session.delete(eq)
    db.session.commit()
    flash("Equivalence removed.", "warning")
    return redirect(url_for("equivalences.list_equivalences"))


def get_equivalents(supplier_part_id):
    """Get all equivalent supplier parts for a given supplier part."""
    equivs_a = PartEquivalence.query.filter_by(supplier_part_a_id=supplier_part_id).all()
    equivs_b = PartEquivalence.query.filter_by(supplier_part_b_id=supplier_part_id).all()

    equivalent_sps = []
    for eq in equivs_a:
        equivalent_sps.append(eq.supplier_part_b)
    for eq in equivs_b:
        equivalent_sps.append(eq.supplier_part_a)
    return equivalent_sps
