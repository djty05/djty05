import csv
import io
from datetime import datetime, timezone
from app.extensions import db
from app.models.part import Part, PartCategory
from app.models.supplier import Supplier, SupplierPart
from app.services.price_service import record_price_change
from app.services.search_service import find_duplicates, normalize_part_number
from app.services.audit_service import log_change


class ImportResult:
    def __init__(self):
        self.new_parts = []
        self.updated_parts = []
        self.price_changes = []
        self.errors = []
        self.duplicates = []
        self.skipped = 0
        self.total_rows = 0


def parse_csv(file_content, encoding="utf-8"):
    """Parse CSV content and return rows as list of dicts."""
    try:
        if isinstance(file_content, bytes):
            try:
                text = file_content.decode(encoding)
            except UnicodeDecodeError:
                text = file_content.decode("cp1252")  # Common Windows encoding
        else:
            text = file_content

        # Detect delimiter
        sniffer = csv.Sniffer()
        sample = text[:4096]
        try:
            dialect = sniffer.sniff(sample, delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel

        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        rows = list(reader)
        return rows, list(reader.fieldnames or [])
    except Exception as e:
        return [], [], str(e)


def validate_row(row, column_map, row_num):
    """Validate a single row based on the column mapping."""
    errors = []
    part_number = row.get(column_map.get("part_number", ""), "").strip()
    description = row.get(column_map.get("description", ""), "").strip()

    if not part_number:
        errors.append(f"Row {row_num}: Missing part number")
    if not description:
        errors.append(f"Row {row_num}: Missing description")

    price_str = row.get(column_map.get("price", ""), "").strip()
    price = None
    if price_str:
        # Remove currency symbols and whitespace
        price_str = price_str.replace("$", "").replace(",", "").strip()
        try:
            price = float(price_str)
            if price < 0:
                errors.append(f"Row {row_num}: Negative price ({price})")
        except ValueError:
            errors.append(f"Row {row_num}: Invalid price format '{price_str}'")

    return errors, part_number, description, price


def preview_import(rows, column_map, import_type="catalogue", supplier_id=None):
    """Analyse the CSV data and return a preview of what will happen."""
    result = ImportResult()
    result.total_rows = len(rows)

    for i, row in enumerate(rows, start=1):
        errors, part_number, description, price = validate_row(row, column_map, i)

        if errors:
            result.errors.extend(errors)
            continue

        if not part_number:
            result.skipped += 1
            continue

        supplier_part_number = row.get(column_map.get("supplier_part_number", ""), "").strip()
        category_name = row.get(column_map.get("category", ""), "").strip()
        uom = row.get(column_map.get("uom", ""), "").strip()

        # Check if part exists
        existing = Part.query.filter_by(internal_part_number=part_number).first()

        if existing:
            entry = {
                "row": i,
                "part_number": part_number,
                "description": description,
                "price": price,
                "supplier_part_number": supplier_part_number,
                "category": category_name,
                "uom": uom,
                "existing_part": existing,
                "action": "update",
            }
            # Check for price changes on supplier parts
            if supplier_id and supplier_part_number:
                sp = SupplierPart.query.filter_by(
                    supplier_id=supplier_id,
                    supplier_part_number=supplier_part_number,
                ).first()
                if sp and price is not None and sp.supplier_price is not None:
                    if abs(sp.supplier_price - price) > 0.001:
                        entry["old_price"] = sp.supplier_price
                        entry["new_price"] = price
                        change_pct = ((price - sp.supplier_price) / sp.supplier_price) * 100
                        entry["change_percent"] = round(change_pct, 2)
                        result.price_changes.append(entry)

            result.updated_parts.append(entry)
        else:
            # Check for potential duplicates
            dupes = find_duplicates(part_number, description, threshold=85)
            entry = {
                "row": i,
                "part_number": part_number,
                "description": description,
                "price": price,
                "supplier_part_number": supplier_part_number,
                "category": category_name,
                "uom": uom,
                "action": "create",
                "duplicates": dupes,
            }
            if dupes:
                result.duplicates.append(entry)
            result.new_parts.append(entry)

    return result


def commit_import(rows, column_map, import_type="catalogue", supplier_id=None, selected_rows=None):
    """Actually commit the import data to the database."""
    result = ImportResult()
    result.total_rows = len(rows)

    for i, row in enumerate(rows, start=1):
        if selected_rows is not None and i not in selected_rows:
            result.skipped += 1
            continue

        errors, part_number, description, price = validate_row(row, column_map, i)
        if errors or not part_number:
            result.errors.extend(errors)
            result.skipped += 1
            continue

        supplier_part_number = row.get(column_map.get("supplier_part_number", ""), "").strip()
        category_name = row.get(column_map.get("category", ""), "").strip()
        uom = row.get(column_map.get("uom", ""), "each").strip() or "each"

        try:
            # Get or create category
            category = None
            if category_name:
                category = PartCategory.query.filter_by(name=category_name).first()
                if not category:
                    category = PartCategory(name=category_name)
                    db.session.add(category)
                    db.session.flush()

            # Get or create part
            part = Part.query.filter_by(internal_part_number=part_number).first()
            if part:
                old_values = {"description": part.description, "price": part.current_sell_price}
                part.description = description
                if price is not None and import_type == "catalogue":
                    part.current_sell_price = price
                if category:
                    part.category = category
                if uom:
                    part.unit_of_measure = uom

                log_change("part", part.id, "update", old_values, {
                    "description": description, "price": price
                }, source="csv_import")
                result.updated_parts.append({"part_number": part_number, "action": "update"})
            else:
                part = Part(
                    internal_part_number=part_number,
                    description=description,
                    current_sell_price=price if import_type == "catalogue" else None,
                    category=category,
                    unit_of_measure=uom,
                )
                db.session.add(part)
                db.session.flush()

                log_change("part", part.id, "create", source="csv_import")
                result.new_parts.append({"part_number": part_number, "action": "create"})

            # Handle supplier part mapping
            if supplier_id and supplier_part_number:
                supplier = db.session.get(Supplier, supplier_id)
                if supplier:
                    sp = SupplierPart.query.filter_by(
                        supplier_id=supplier_id,
                        supplier_part_number=supplier_part_number,
                    ).first()

                    if sp:
                        sp.part_id = part.id
                        sp.supplier_description = description
                        if price is not None:
                            record_price_change(sp.id, price, source="csv_import")
                    else:
                        sp = SupplierPart(
                            part_id=part.id,
                            supplier_id=supplier_id,
                            supplier_part_number=supplier_part_number,
                            supplier_description=description,
                            supplier_price=price,
                            last_price_check=datetime.now(timezone.utc),
                        )
                        db.session.add(sp)
                        db.session.flush()

                        if price is not None:
                            # Record initial price
                            from app.models.price import PriceHistory
                            ph = PriceHistory(
                                supplier_part_id=sp.id,
                                old_price=None,
                                new_price=price,
                                source="csv_import",
                            )
                            db.session.add(ph)

                        log_change("supplier_part", sp.id, "create", source="csv_import")

        except Exception as e:
            result.errors.append(f"Row {i}: {str(e)}")
            continue

    db.session.commit()
    return result


def export_catalogue():
    """Export all active parts as a list of dicts for CSV download."""
    parts = Part.query.filter_by(is_active=True).order_by(Part.internal_part_number).all()

    # First pass: collect all supplier names to build consistent columns
    all_suppliers = set()
    for part in parts:
        for sp in part.supplier_parts:
            all_suppliers.add(sp.supplier.name)
    all_suppliers = sorted(all_suppliers)

    rows = []
    for part in parts:
        row = {
            "Part Number": part.internal_part_number,
            "Description": part.description,
            "Category": part.category.name if part.category else "",
            "Unit": part.unit_of_measure or "",
            "Sell Price": part.current_sell_price or "",
            "Best Cost": part.best_cost_price or "",
        }
        # Add consistent supplier columns
        sp_map = {sp.supplier.name: sp for sp in part.supplier_parts}
        for sname in all_suppliers:
            sp = sp_map.get(sname)
            row[f"Supplier ({sname})"] = sp.supplier_part_number if sp else ""
            row[f"Cost ({sname})"] = sp.supplier_price or "" if sp else ""
        rows.append(row)
    return rows
