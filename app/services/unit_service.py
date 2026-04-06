"""Unit standardisation service.

Normalises pricing to a common unit (per-each or per-metre) so prices
from different suppliers with different pack sizes can be compared
fairly. E.g. one supplier prices cable per 100m roll, another per 305m
— this converts both to a per-metre unit price.
"""

import re

# Known unit conversions to base unit
# Format: pattern -> (base_unit, multiplier_to_get_base)
UNIT_CONVERSIONS = {
    # Length
    "each": ("each", 1),
    "ea": ("each", 1),
    "unit": ("each", 1),
    "pc": ("each", 1),
    "pcs": ("each", 1),
    "piece": ("each", 1),

    "m": ("metre", 1),
    "metre": ("metre", 1),
    "meter": ("metre", 1),
    "mtr": ("metre", 1),
    "lm": ("metre", 1),  # lineal metre

    "100m": ("metre", 100),
    "200m": ("metre", 200),
    "305m": ("metre", 305),

    "roll": ("roll", 1),
    "coil": ("roll", 1),

    "pack": ("pack", 1),
    "box": ("box", 1),
    "bag": ("bag", 1),
    "pair": ("each", 0.5),  # per-pair = 2 eaches

    "km": ("metre", 1000),
    "ft": ("metre", 0.3048),
}

# Regex to extract numeric pack sizes from UOM strings like "pack/10", "box of 100"
_PACK_RE = re.compile(r"(?:pack|box|bag|pk|bx)\s*(?:of|/|x)\s*(\d+)", re.IGNORECASE)
_QTY_RE = re.compile(r"(\d+)\s*(?:m|metre|meter|mtr)\b", re.IGNORECASE)


def parse_uom(uom_str):
    """Parse a UOM string into (base_unit, quantity_per_unit).

    Returns:
        tuple: (base_unit_name, qty) where qty is how many base units
               are in one of this UOM. E.g. "100m" -> ("metre", 100)
    """
    if not uom_str:
        return "each", 1

    cleaned = uom_str.strip().lower()

    # Direct lookup
    if cleaned in UNIT_CONVERSIONS:
        base, mult = UNIT_CONVERSIONS[cleaned]
        return base, mult

    # Try to extract pack size: "pack/10" -> 10 each
    pack_match = _PACK_RE.search(cleaned)
    if pack_match:
        return "each", int(pack_match.group(1))

    # Try to extract metre quantity: "100m roll" -> 100 metres
    qty_match = _QTY_RE.search(cleaned)
    if qty_match:
        return "metre", int(qty_match.group(1))

    # Default: treat as 1 each
    return "each", 1


def normalise_price(price, uom_str):
    """Convert a price to per-base-unit price.

    Args:
        price: The price for the given UOM.
        uom_str: The unit of measure string.

    Returns:
        tuple: (unit_price, base_unit) e.g. (2.50, "metre")
    """
    if price is None:
        return None, "each"

    base_unit, qty = parse_uom(uom_str)
    if qty <= 0:
        qty = 1

    unit_price = round(price / qty, 6)
    return unit_price, base_unit


def compare_supplier_prices(supplier_parts):
    """Compare prices across suppliers normalised to the same unit.

    Args:
        supplier_parts: List of SupplierPart objects.

    Returns:
        list of dicts with normalised pricing info, sorted cheapest first.
    """
    comparisons = []
    for sp in supplier_parts:
        if sp.supplier_price is None:
            continue

        uom = sp.part.unit_of_measure if sp.part else "each"
        unit_price, base_unit = normalise_price(sp.supplier_price, uom)

        comparisons.append({
            "supplier_part": sp,
            "supplier_name": sp.supplier.name if sp.supplier else "Unknown",
            "supplier_part_number": sp.supplier_part_number,
            "raw_price": sp.supplier_price,
            "uom": uom,
            "unit_price": unit_price,
            "base_unit": base_unit,
        })

    comparisons.sort(key=lambda x: x["unit_price"])
    return comparisons
