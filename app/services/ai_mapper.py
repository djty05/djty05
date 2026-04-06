"""AI-powered column mapping service using the Claude API.

Analyses CSV headers and sample data to automatically suggest
the correct column mapping for catalogue imports.
"""

import json
import os
import anthropic


# The fields the import system understands
IMPORT_FIELDS = {
    "part_number": "The internal/tradezone part number or product code (unique identifier)",
    "description": "Product description or name",
    "sell_price": "The trade/sell price charged to customers (sometimes called Trade Price)",
    "cost_price": "The cost/buy price paid to the supplier (sometimes called Cost Price)",
    "supplier_part_number": "The supplier's own part number or catalogue code",
    "group": "Top-level product category/group (e.g. Lighting, Switchgear, Electrical Conduit)",
    "sub_group": "Sub-category within the group (e.g. Lighting - Light Fittings - Bayonet Batten Holders)",
    "manufacturer": "Brand or manufacturer name (e.g. Clipsal, Wattmaster)",
    "search_terms": "Keywords/tags used for searching the product",
    "uom": "Unit of measure (e.g. each, metre, pack)",
}


def auto_map_columns(fieldnames, sample_rows, max_samples=3):
    """Use Claude to automatically map CSV columns to import fields.

    Args:
        fieldnames: List of column header strings from the CSV.
        sample_rows: List of dicts representing sample data rows.
        max_samples: Max sample rows to include in the prompt.

    Returns:
        dict: Mapping of import field name -> CSV column name.
              Only includes fields where a confident match was found.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {}

    # Build a compact representation of the data
    samples = sample_rows[:max_samples]
    sample_text = ""
    for i, row in enumerate(samples, 1):
        vals = [f"  {col}: {row.get(col, '')}" for col in fieldnames]
        sample_text += f"Row {i}:\n" + "\n".join(vals) + "\n\n"

    fields_text = "\n".join(
        f'  "{key}": {desc}' for key, desc in IMPORT_FIELDS.items()
    )

    prompt = f"""You are a data mapping assistant for an electrical wholesale parts catalogue system.

Given these CSV column headers and sample data, map each of our import fields to the correct CSV column.

**CSV Columns:** {json.dumps(fieldnames)}

**Sample Data:**
{sample_text}

**Import Fields to Map:**
{fields_text}

Rules:
- Only map a field if you are confident the CSV column matches.
- If no CSV column matches a field, omit it from the result.
- "Trade Price" or "Sell Price" maps to "sell_price"
- "Cost Price" or "Buy Price" maps to "cost_price"
- A generic "Price" column should map to "sell_price"
- "Tradezone Part Number" or similar unique ID columns map to "part_number"
- "Group" maps to "group", "Sub Group" maps to "sub_group"
- If there is only one category-like column, map it to "group"

Return ONLY a JSON object mapping import field names to the exact CSV column header strings. No explanation, no markdown, just the JSON object."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text.strip()

        # Handle potential markdown code block wrapper
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(
                line for line in lines if not line.startswith("```")
            )

        mapping = json.loads(response_text)

        # Validate: only keep mappings where the value is actually a CSV column
        valid = {}
        for field, col in mapping.items():
            if field in IMPORT_FIELDS and col in fieldnames:
                valid[field] = col

        return valid

    except Exception:
        # If AI mapping fails for any reason, fall back to manual
        return {}
