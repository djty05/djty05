"""Simpro-format CSV export.

Generates CSV files in the format Simpro expects for catalogue imports.
Simpro uses a specific column structure for its "Pre-Build > Catalogue"
import feature.

Reference columns for Simpro catalogue import:
  Part Number, Part Description, Cost Price, Sell Price (Trade),
  Unit Of Measure, Supplier, Supplier Part Number, Category,
  Sub Category, Manufacturer, Notes
"""


def export_simpro_format(parts):
    """Export parts in Simpro-compatible CSV format.

    Args:
        parts: List of Part model objects.

    Returns:
        List of dicts ready for csv.DictWriter.
    """
    rows = []
    for part in parts:
        # Get best supplier
        pref = part.preferred_supplier_part

        cat = part.category
        category = ""
        sub_category = ""
        if cat:
            if cat.parent_id:
                sub_category = cat.name
                category = cat.parent.name if cat.parent else ""
            else:
                category = cat.name

        # Simpro uses "Cost Price" (what you pay) and "Sell Price" (what you charge)
        cost = part.best_cost_price or part.cost_price or ""
        sell = part.current_sell_price or ""

        rows.append({
            "Part Number": part.internal_part_number,
            "Part Description": part.description,
            "Cost Price": f"{cost:.2f}" if isinstance(cost, (int, float)) else "",
            "Sell Price (Trade)": f"{sell:.2f}" if isinstance(sell, (int, float)) else "",
            "Unit Of Measure": (part.unit_of_measure or "each").upper(),
            "Supplier": pref.supplier.name if pref and pref.supplier else "",
            "Supplier Part Number": pref.supplier_part_number if pref else "",
            "Category": category,
            "Sub Category": sub_category,
            "Manufacturer": part.manufacturer or "",
            "Notes": "",
        })
    return rows


def export_simpro_price_update(parts):
    """Export a price-update-only file for Simpro.

    Simpro can import price updates separately from full catalogue imports.
    This generates a minimal file with just part numbers and updated prices.
    """
    rows = []
    for part in parts:
        cost = part.best_cost_price or part.cost_price
        sell = part.current_sell_price

        if cost is None and sell is None:
            continue

        rows.append({
            "Part Number": part.internal_part_number,
            "Cost Price": f"{cost:.2f}" if isinstance(cost, (int, float)) else "",
            "Sell Price (Trade)": f"{sell:.2f}" if isinstance(sell, (int, float)) else "",
        })
    return rows
