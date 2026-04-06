import csv
import io
import json
import os
import uuid
from flask import (
    Blueprint, render_template, request, redirect, url_for, flash, session, Response,
)
from app.models.supplier import Supplier
from app.services.import_service import parse_csv, parse_excel, preview_import, commit_import, export_catalogue

imports_bp = Blueprint("imports", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "instance", "uploads")


def _save_import_data(rows, fieldnames):
    """Save import data to a temp JSON file instead of the session."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    filepath = os.path.join(UPLOAD_DIR, f"{file_id}.json")
    with open(filepath, "w") as f:
        json.dump({"rows": rows, "fieldnames": fieldnames}, f)
    return file_id


def _load_import_data(file_id):
    """Load import data from temp file."""
    if not file_id:
        return None, None
    filepath = os.path.join(UPLOAD_DIR, f"{file_id}.json")
    if not os.path.exists(filepath):
        return None, None
    with open(filepath) as f:
        data = json.load(f)
    return data.get("rows"), data.get("fieldnames")


def _cleanup_import_data(file_id):
    """Remove temp file after import is done."""
    if not file_id:
        return
    filepath = os.path.join(UPLOAD_DIR, f"{file_id}.json")
    if os.path.exists(filepath):
        os.remove(filepath)


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
    filename = file.filename.lower()

    if filename.endswith(('.xlsx', '.xls')):
        rows, fieldnames = parse_excel(content)
    else:
        rows, fieldnames = parse_csv(content)

    if not rows:
        flash("Could not parse file. Ensure it is a valid CSV or Excel file.", "danger")
        return redirect(url_for("imports.upload_form"))

    # Store data in temp file (not session - sessions have a 4KB cookie limit)
    file_id = _save_import_data(rows, fieldnames)
    session["import_file_id"] = file_id
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
    file_id = session.get("import_file_id")
    rows, fieldnames = _load_import_data(file_id)
    if not rows:
        flash("No import data found. Please upload again.", "danger")
        return redirect(url_for("imports.upload_form"))

    import_type = session.get("import_type", "catalogue")
    supplier_id = session.get("import_supplier_id")

    # Build column mapping from form
    column_map = {
        "part_number": request.form.get("col_part_number", ""),
        "description": request.form.get("col_description", ""),
        "sell_price": request.form.get("col_sell_price", ""),
        "cost_price": request.form.get("col_cost_price", ""),
        "price": request.form.get("col_price", ""),  # legacy fallback
        "supplier_part_number": request.form.get("col_supplier_part_number", ""),
        "group": request.form.get("col_group", ""),
        "sub_group": request.form.get("col_sub_group", ""),
        "category": request.form.get("col_category", ""),
        "uom": request.form.get("col_uom", ""),
        "manufacturer": request.form.get("col_manufacturer", ""),
        "search_terms": request.form.get("col_search_terms", ""),
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
    file_id = session.get("import_file_id")
    rows, _ = _load_import_data(file_id)
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

    # Clean up
    _cleanup_import_data(file_id)
    session.pop("import_file_id", None)
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
