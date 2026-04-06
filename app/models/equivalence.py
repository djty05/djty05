"""Cross-supplier part equivalence mapping.

Maps the same physical product across different suppliers who use
different catalogue numbers. E.g. Clipsal 2025-WE at Tradezone
might be the same as CLP-2025WE at another wholesaler.
"""

from datetime import datetime, timezone
from app.extensions import db


class PartEquivalence(db.Model):
    __tablename__ = "part_equivalences"
    __table_args__ = (
        db.UniqueConstraint("supplier_part_a_id", "supplier_part_b_id", name="uq_equivalence_pair"),
    )

    id = db.Column(db.Integer, primary_key=True)
    supplier_part_a_id = db.Column(db.Integer, db.ForeignKey("supplier_parts.id"), nullable=False, index=True)
    supplier_part_b_id = db.Column(db.Integer, db.ForeignKey("supplier_parts.id"), nullable=False, index=True)
    confidence = db.Column(db.String(20), default="manual")  # manual, ai_suggested, confirmed
    notes = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    supplier_part_a = db.relationship("SupplierPart", foreign_keys=[supplier_part_a_id], backref="equivalences_as_a")
    supplier_part_b = db.relationship("SupplierPart", foreign_keys=[supplier_part_b_id], backref="equivalences_as_b")

    def __repr__(self):
        return f"<PartEquivalence {self.supplier_part_a_id} <-> {self.supplier_part_b_id}>"
