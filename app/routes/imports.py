import csv
import io
from flask import (
    Blueprint, render_template, request, redirect, url_for, flash, session, Response,
)
from app.models.supplier import Supplier
from app.services.import_service import parse_csv, preview_import, commit_import, export_catalogue

imports_bp = Blueprint("imports", __name__)


@imports_bp.route("/", methods=["GET"])
def upload_form():
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()
    return render_template("imports/upload.html", suppliers=suppliers)


@imports_bp.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("csv_file")
    if not file or not file.filename:
        flash("Please select a CSV file.", "danger")
        return redirect(url_for("imports.upload_form"))

    import_type = request.form.get("import_type", "catalogue")
    supplier_id = request.form.get("supplier_id", type=int)

    content = file.read()
    rows, fieldnames = parse_csv(content)

    if not rows:
        flash("Could not parse CSV file. Check the format.", "danger")
        return redirect(url_for("imports.upload_form"))

    # Store in session for the review step
    session["import_rows"] = rows
    session["import_fieldnames"] = fieldnames
    session["import_type"] = import_type
    session["import_supplier_id"] = supplier_id

    return render_template(
        "imports/mapping.html",
        fieldnames=fieldnames,
        sample_rows=rows[:5],
        import_type=import_type,
        supplier_id=supplier_id,
        total_rows=len(rows),
    )


@imports_bp.route("/review", methods=["POST"])
def review():
    rows = session.get("import_rows")
    if not rows:
        flash("No import data found. Please upload again.", "danger")
        return redirect(url_for("imports.upload_form"))

    import_type = session.get("import_type", "catalogue")
    supplier_id = session.get("import_supplier_id")

    # Build column mapping from form
    column_map = {
        "part_number": request.form.get("col_part_number", ""),
        "description": request.form.get("col_description", ""),
        "price": request.form.get("col_price", ""),
        "supplier_part_number": request.form.get("col_supplier_part_number", ""),
        "category": request.form.get("col_category", ""),
        "uom": request.form.get("col_uom", ""),
    }

    session["import_column_map"] = column_map

    result = preview_import(rows, column_map, import_type, supplier_id)

    return render_template(
        "imports/review.html",
        result=result,
        import_type=import_type,
        supplier_id=supplier_id,
    )


@imports_bp.route("/commit", methods=["POST"])
def commit():
    rows = session.get("import_rows")
    column_map = session.get("import_column_map")
    import_type = session.get("import_type", "catalogue")
    supplier_id = session.get("import_supplier_id")

    if not rows or not column_map:
        flash("No import data found. Please upload again.", "danger")
        return redirect(url_for("imports.upload_form"))

    # Get selected rows (if user deselected any)
    selected = request.form.getlist("selected_rows")
    selected_rows = set(int(r) for r in selected) if selected else None

    result = commit_import(rows, column_map, import_type, supplier_id, selected_rows)

    # Clear session data
    session.pop("import_rows", None)
    session.pop("import_fieldnames", None)
    session.pop("import_column_map", None)
    session.pop("import_type", None)
    session.pop("import_supplier_id", None)

    flash(
        f"Import complete: {len(result.new_parts)} new, {len(result.updated_parts)} updated, "
        f"{len(result.errors)} errors, {result.skipped} skipped.",
        "success" if not result.errors else "warning",
    )
    return redirect(url_for("main.dashboard"))


@imports_bp.route("/export")
def export():
    rows = export_catalogue()
    if not rows:
        flash("No parts to export.", "warning")
        return redirect(url_for("parts.list_parts"))

    output = io.StringIO()
    fieldnames = list(rows[0].keys()) if rows else []
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=catalogue_export.csv"},
    )
