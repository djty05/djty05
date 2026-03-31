import re
from rapidfuzz import fuzz
from app.models.part import Part
from app.models.supplier import SupplierPart


def normalize_part_number(pn):
    """Strip whitespace, uppercase, remove common separators for comparison."""
    if not pn:
        return ""
    return re.sub(r"[\s\-_/.]", "", pn.strip().upper())


def search_parts(query, limit=50):
    """Search parts across internal numbers, descriptions, and supplier part numbers."""
    if not query or not query.strip():
        return []

    q = f"%{query.strip()}%"
    normalized = normalize_part_number(query)

    # SQL LIKE search across part fields
    part_matches = (
        Part.query
        .filter(
            (Part.internal_part_number.ilike(q))
            | (Part.description.ilike(q))
        )
        .limit(limit)
        .all()
    )

    # Also search supplier part numbers
    sp_matches = (
        SupplierPart.query
        .filter(SupplierPart.supplier_part_number.ilike(q))
        .limit(limit)
        .all()
    )

    # Merge results (parts from supplier matches)
    seen_ids = {p.id for p in part_matches}
    for sp in sp_matches:
        if sp.part_id not in seen_ids:
            part_matches.append(sp.part)
            seen_ids.add(sp.part_id)

    # Score and rank by fuzzy relevance
    scored = []
    for part in part_matches:
        best_score = fuzz.partial_ratio(normalized, normalize_part_number(part.internal_part_number))
        # Also check supplier part numbers
        for sp in part.supplier_parts:
            score = fuzz.partial_ratio(normalized, normalize_part_number(sp.supplier_part_number))
            best_score = max(best_score, score)
        scored.append((part, best_score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [part for part, _ in scored[:limit]]


def find_duplicates(part_number, description="", threshold=80):
    """Find potential duplicate parts using fuzzy matching."""
    normalized = normalize_part_number(part_number)
    if not normalized:
        return []

    # Get candidate parts - first by prefix for efficiency
    prefix = normalized[:3] if len(normalized) >= 3 else normalized
    candidates = Part.query.filter(
        Part.internal_part_number.ilike(f"%{prefix}%")
    ).limit(200).all()

    # Also check supplier part numbers
    sp_candidates = SupplierPart.query.filter(
        SupplierPart.supplier_part_number.ilike(f"%{prefix}%")
    ).limit(200).all()

    seen_ids = {p.id for p in candidates}
    for sp in sp_candidates:
        if sp.part_id not in seen_ids:
            candidates.append(sp.part)
            seen_ids.add(sp.part_id)

    duplicates = []
    for part in candidates:
        pn_score = fuzz.ratio(normalized, normalize_part_number(part.internal_part_number))
        desc_score = fuzz.partial_ratio(description.upper(), (part.description or "").upper()) if description else 0
        combined = max(pn_score, (pn_score * 0.6 + desc_score * 0.4))

        if combined >= threshold:
            duplicates.append({
                "part": part,
                "score": round(combined, 1),
                "match_type": "part_number" if pn_score >= threshold else "description",
            })

    duplicates.sort(key=lambda x: x["score"], reverse=True)
    return duplicates


def cross_reference(part_number):
    """Given any part number, find the canonical part and all its aliases."""
    normalized = normalize_part_number(part_number)

    # Try internal part number first
    part = Part.query.filter(Part.internal_part_number.ilike(f"%{part_number.strip()}%")).first()

    if not part:
        # Try supplier part numbers
        sp = SupplierPart.query.filter(
            SupplierPart.supplier_part_number.ilike(f"%{part_number.strip()}%")
        ).first()
        if sp:
            part = sp.part

    if not part:
        return None

    return {
        "part": part,
        "internal_number": part.internal_part_number,
        "supplier_numbers": [
            {
                "supplier": sp.supplier.name,
                "number": sp.supplier_part_number,
                "price": sp.supplier_price,
            }
            for sp in part.supplier_parts
        ],
    }
