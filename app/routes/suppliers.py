from flask import Blueprint, render_template, request, redirect, url_for, flash
from app.extensions import db
from app.models.supplier import Supplier, SupplierPart
from app.services.audit_service import log_change

suppliers_bp = Blueprint("suppliers", __name__)


@suppliers_bp.route("/")
def list_suppliers():
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()
    return render_template("suppliers/list.html", suppliers=suppliers)


@suppliers_bp.route("/new", methods=["GET", "POST"])
def create_supplier():
    if request.method == "POST":
        supplier = Supplier(
            name=request.form["name"].strip(),
            code=request.form.get("code", "").strip().upper() or None,
            contact_email=request.form.get("contact_email", "").strip() or None,
            contact_phone=request.form.get("contact_phone", "").strip() or None,
            website=request.form.get("website", "").strip() or None,
            notes=request.form.get("notes", "").strip() or None,
        )

        if supplier.code:
            existing = Supplier.query.filter_by(code=supplier.code).first()
            if existing:
                flash(f"Supplier code {supplier.code} already exists.", "danger")
                return render_template("suppliers/form.html", supplier=supplier, is_new=True)

        db.session.add(supplier)
        db.session.flush()
        log_change("supplier", supplier.id, "create")
        db.session.commit()
        flash(f"Supplier {supplier.name} created.", "success")
        return redirect(url_for("suppliers.detail", supplier_id=supplier.id))

    return render_template("suppliers/form.html", supplier=None, is_new=True)


@suppliers_bp.route("/<int:supplier_id>")
def detail(supplier_id):
    supplier = db.session.get(Supplier, supplier_id) or Supplier.query.get_or_404(supplier_id)
    page = request.args.get("page", 1, type=int)
    parts = (
        SupplierPart.query
        .filter_by(supplier_id=supplier_id)
        .order_by(SupplierPart.supplier_part_number)
        .paginate(page=page, per_page=50, error_out=False)
    )
    return render_template("suppliers/detail.html", supplier=supplier, parts=parts)


@suppliers_bp.route("/<int:supplier_id>/edit", methods=["GET", "POST"])
def edit_supplier(supplier_id):
    supplier = db.session.get(Supplier, supplier_id) or Supplier.query.get_or_404(supplier_id)

    if request.method == "POST":
        old_values = {"name": supplier.name, "code": supplier.code}

        supplier.name = request.form["name"].strip()
        supplier.code = request.form.get("code", "").strip().upper() or None
        supplier.contact_email = request.form.get("contact_email", "").strip() or None
        supplier.contact_phone = request.form.get("contact_phone", "").strip() or None
        supplier.website = request.form.get("website", "").strip() or None
        supplier.notes = request.form.get("notes", "").strip() or None

        log_change("supplier", supplier.id, "update", old_values, {
            "name": supplier.name, "code": supplier.code
        })
        db.session.commit()
        flash(f"Supplier {supplier.name} updated.", "success")
        return redirect(url_for("suppliers.detail", supplier_id=supplier.id))

    return render_template("suppliers/form.html", supplier=supplier, is_new=False)


@suppliers_bp.route("/<int:supplier_id>/delete", methods=["POST"])
def delete_supplier(supplier_id):
    supplier = db.session.get(Supplier, supplier_id) or Supplier.query.get_or_404(supplier_id)
    supplier.is_active = False
    log_change("supplier", supplier.id, "delete")
    db.session.commit()
    flash(f"Supplier {supplier.name} deactivated.", "warning")
    return redirect(url_for("suppliers.list_suppliers"))
