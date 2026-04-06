import csv
import io
from datetime import datetime, timezone
import openpyxl
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
        self.corrections_applied = 0
        self.skipped = 0
        self.total_rows = 0


def _apply_correction_rules(rows, column_map, supplier_id=None):
    """Apply all active correction rules to import rows. Returns count of applications."""
    from app.models.correction import CorrectionRule

    rules = CorrectionRule.query.filter_by(is_active=True)
    if supplier_id:
        rules = rules.filter(
            (CorrectionRule.supplier_id == supplier_id) | (CorrectionRule.supplier_id.is_(None))
        )
    else:
        rules = rules.filter(CorrectionRule.supplier_id.is_(None))
    rules = rules.all()

    if not rules:
        return 0, set()

    applied_count = 0
    skip_rows = set()  # row indices to skip

    for i, row in enumerate(rows):
        for rule in rules:
            if rule.applies_to(row, column_map):
                if rule.action == "skip":
                    skip_rows.add(i)
                    applied_count += 1
                else:
                    if rule.apply(row, column_map):
                        applied_count += 1

    return applied_count, skip_rows


def parse_excel(file_content):
    """Parse Excel (.xlsx/.xls) content and return rows as list of dicts."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True, data_only=True)
        ws = wb.active

        rows_iter = iter(ws.rows)
        header_row = next(rows_iter, None)
        if not header_row:
            return [], []

        fieldnames = [str(cell.value).strip() if cell.value is not None else f"Column{i+1}"
                      for i, cell in enumerate(header_row)]

        rows = []
        for row in rows_iter:
            row_dict = {}
            all_empty = True
            for i, cell in enumerate(row):
                if i < len(fieldnames):
                    val = cell.value
                    if val is not None:
                        all_empty = False
                    row_dict[fieldnames[i]] = str(val).strip() if val is not None else ""
            if not all_empty:
                rows.append(row_dict)

        wb.close()
        return rows, fieldnames
    except Exception as e:
        return [], []


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
        return [], []


def _parse_price(price_str, label, row_num, errors):
    """Parse a price string and return float or None."""
    if not price_str:
        return None
    cleaned = price_str.replace("$", "").replace(",", "").strip()
    if not cleaned:
        return None
    try:
        val = float(cleaned)
        if val < 0:
            errors.append(f"Row {row_num}: Negative {label} ({val})")
        return val
    except ValueError:
        errors.append(f"Row {row_num}: Invalid {label} format '{cleaned}'")
        return None


def validate_row(row, column_map, row_num):
    """Validate a single row based on the column mapping."""
    errors = []
    part_number = row.get(column_map.get("part_number", ""), "").strip()
    description = row.get(column_map.get("description", ""), "").strip()

    if not part_number:
        errors.append(f"Row {row_num}: Missing part number")
    if not description:
        errors.append(f"Row {row_num}: Missing description")

    sell_price = _parse_price(
        row.get(column_map.get("sell_price", ""), "").strip(), "sell price", row_num, errors
    )
    cost_price = _parse_price(
        row.get(column_map.get("cost_price", ""), "").strip(), "cost price", row_num, errors
    )

    # Legacy: if only "price" mapped, treat as sell price
    if sell_price is None and column_map.get("price"):
        sell_price = _parse_price(
            row.get(column_map.get("price", ""), "").strip(), "price", row_num, errors
        )

    return errors, part_number, description, sell_price, cost_price


def _resolve_category(group_name, sub_group_name):
    """Return the category to use, creating parent/child as needed."""
    if not group_name and not sub_group_name:
        return None

    if group_name and sub_group_name:
        # Ensure parent exists
        parent = PartCategory.query.filter_by(name=group_name, parent_id=None).first()
        if not parent:
            parent = PartCategory(name=group_name)
            db.session.add(parent)
            db.session.flush()
        # Ensure child exists under parent
        child = PartCategory.query.filter_by(name=sub_group_name, parent_id=parent.id).first()
        if not child:
            child = PartCategory(name=sub_group_name, parent_id=parent.id)
            db.session.add(child)
            db.session.flush()
        return child

    name = sub_group_name or group_name
    cat = PartCategory.query.filter_by(name=name).first()
    if not cat:
        cat = PartCategory(name=name)
        db.session.add(cat)
        db.session.flush()
    return cat


def preview_import(rows, column_map, import_type="catalogue", supplier_id=None):
    """Analyse the CSV data and return a preview of what will happen."""
    result = ImportResult()
    result.total_rows = len(rows)

    # Apply correction rules before processing
    corrections_count, skip_rows = _apply_correction_rules(rows, column_map, supplier_id)
    result.corrections_applied = corrections_count

    for i, row in enumerate(rows, start=1):
        if i - 1 in skip_rows:
            result.skipped += 1
            continue

        errors, part_number, description, sell_price, cost_price = validate_row(row, column_map, i)

        if errors:
            result.errors.extend(errors)
            continue

        if not part_number:
            result.skipped += 1
            continue

        supplier_part_number = row.get(column_map.get("supplier_part_number", ""), "").strip()
        group_name = row.get(column_map.get("group", ""), "").strip()
        sub_group_name = row.get(column_map.get("sub_group", ""), "").strip()
        # Legacy single-category support
        category_name = sub_group_name or group_name or row.get(column_map.get("category", ""), "").strip()
        uom = row.get(column_map.get("uom", ""), "").strip()
        manufacturer = row.get(column_map.get("manufacturer", ""), "").strip()

        # Use sell_price for display (legacy "price" field)
        price = sell_price

        # Check if part exists
        existing = Part.query.filter_by(internal_part_number=part_number).first()

        if existing:
            entry = {
                "row": i,
                "part_number": part_number,
                "description": description,
                "price": price,
                "cost_price": cost_price,
                "supplier_part_number": supplier_part_number,
                "category": category_name,
                "uom": uom,
                "manufacturer": manufacturer,
                "existing_part": existing,
                "action": "update",
            }
            # Check for price changes on supplier parts
            if supplier_id and supplier_part_number:
                sp = SupplierPart.query.filter_by(
                    supplier_id=supplier_id,
                    supplier_part_number=supplier_part_number,
                ).first()
                if sp and cost_price is not None and sp.supplier_price is not None:
                    if abs(sp.supplier_price - cost_price) > 0.001:
                        entry["old_price"] = sp.supplier_price
                        entry["new_price"] = cost_price
                        change_pct = ((cost_price - sp.supplier_price) / sp.supplier_price) * 100
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
                "cost_price": cost_price,
                "supplier_part_number": supplier_part_number,
                "category": category_name,
                "uom": uom,
                "manufacturer": manufacturer,
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

    # Apply correction rules before processing
    corrections_count, skip_rows = _apply_correction_rules(rows, column_map, supplier_id)
    result.corrections_applied = corrections_count

    for i, row in enumerate(rows, start=1):
        if i - 1 in skip_rows:
            result.skipped += 1
            continue
        if selected_rows is not None and i not in selected_rows:
            result.skipped += 1
            continue

        errors, part_number, description, sell_price, cost_price = validate_row(row, column_map, i)
        if errors or not part_number:
            result.errors.extend(errors)
            result.skipped += 1
            continue

        supplier_part_number = row.get(column_map.get("supplier_part_number", ""), "").strip()
        group_name = row.get(column_map.get("group", ""), "").strip()
        sub_group_name = row.get(column_map.get("sub_group", ""), "").strip()
        uom = row.get(column_map.get("uom", ""), "each").strip() or "each"
        manufacturer = row.get(column_map.get("manufacturer", ""), "").strip()
        search_terms = row.get(column_map.get("search_terms", ""), "").strip()

        try:
            # Resolve category (handles Group/Sub Group hierarchy)
            category = _resolve_category(group_name, sub_group_name)
            if category is None and column_map.get("category"):
                cat_name = row.get(column_map.get("category", ""), "").strip()
                if cat_name:
                    category = PartCategory.query.filter_by(name=cat_name).first()
                    if not category:
                        category = PartCategory(name=cat_name)
                        db.session.add(category)
                        db.session.flush()

            # Get or create part
            part = Part.query.filter_by(internal_part_number=part_number).first()
            if part:
                old_values = {
                    "description": part.description,
                    "sell_price": part.current_sell_price,
                    "cost_price": part.cost_price,
                }
                part.description = description
                if sell_price is not None and import_type == "catalogue":
                    part.current_sell_price = sell_price
                if cost_price is not None:
                    part.cost_price = cost_price
                if category:
                    part.category = category
                if uom:
                    part.unit_of_measure = uom
                if manufacturer:
                    part.manufacturer = manufacturer
                if search_terms:
                    part.search_terms = search_terms

                log_change("part", part.id, "update", old_values, {
                    "description": description, "sell_price": sell_price, "cost_price": cost_price
                }, source="csv_import")
                result.updated_parts.append({"part_number": part_number, "action": "update"})
            else:
                part = Part(
                    internal_part_number=part_number,
                    description=description,
                    current_sell_price=sell_price if import_type == "catalogue" else None,
                    cost_price=cost_price,
                    category=category,
                    unit_of_measure=uom,
                    manufacturer=manufacturer or None,
                    search_terms=search_terms or None,
                )
                db.session.add(part)
                db.session.flush()

                log_change("part", part.id, "create", source="csv_import")
                result.new_parts.append({"part_number": part_number, "action": "create"})

            # Handle supplier part mapping (use cost_price for supplier price)
            supplier_price = cost_price if cost_price is not None else sell_price
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
                        if supplier_price is not None:
                            record_price_change(sp.id, supplier_price, source="csv_import")
                    else:
                        sp = SupplierPart(
                            part_id=part.id,
                            supplier_id=supplier_id,
                            supplier_part_number=supplier_part_number,
                            supplier_description=description,
                            supplier_price=supplier_price,
                            last_price_check=datetime.now(timezone.utc),
                        )
                        db.session.add(sp)
                        db.session.flush()

                        if supplier_price is not None:
                            from app.models.price import PriceHistory
                            ph = PriceHistory(
                                supplier_part_id=sp.id,
                                old_price=None,
                                new_price=supplier_price,
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
        cat = part.category
        group = ""
        sub_group = ""
        if cat:
            if cat.parent_id:
                sub_group = cat.name
                group = cat.parent.name if cat.parent else ""
            else:
                group = cat.name

        row = {
            "Part Number": part.internal_part_number,
            "Description": part.description,
            "Manufacturer": part.manufacturer or "",
            "Group": group,
            "Sub Group": sub_group,
            "Unit": part.unit_of_measure or "",
            "Trade Price": part.current_sell_price or "",
            "Cost Price": part.cost_price or "",
            "Best Cost": part.best_cost_price or "",
            "Search Terms": part.search_terms or "",
        }
        # Add consistent supplier columns
        sp_map = {sp.supplier.name: sp for sp in part.supplier_parts}
        for sname in all_suppliers:
            sp = sp_map.get(sname)
            row[f"Supplier ({sname})"] = sp.supplier_part_number if sp else ""
            row[f"Cost ({sname})"] = sp.supplier_price or "" if sp else ""
        rows.append(row)
    return rows
