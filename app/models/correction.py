"""Correction rules that persist across catalogue re-imports.

When a user fixes a data issue (wrong pack size, bad UOM, incorrect description),
the fix is saved as a rule. On the next import, all matching rows have the rule
auto-applied so the same mistake never needs fixing twice.
"""

import json
from datetime import datetime, timezone
from app.extensions import db


class CorrectionRule(db.Model):
    __tablename__ = "correction_rules"

    id = db.Column(db.Integer, primary_key=True)
    # What to match on
    match_field = db.Column(db.String(50), nullable=False)  # e.g. "supplier_part_number", "part_number"
    match_value = db.Column(db.String(200), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)  # scope to supplier

    # What to change
    action = db.Column(db.String(20), nullable=False, default="set")  # set, multiply, skip
    target_field = db.Column(db.String(50), nullable=False)  # e.g. "description", "cost_price", "uom"
    target_value = db.Column(db.Text, nullable=True)  # the corrected value (JSON-encoded for complex types)

    reason = db.Column(db.String(300), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    times_applied = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_applied_at = db.Column(db.DateTime, nullable=True)

    supplier = db.relationship("Supplier", backref="correction_rules")

    def applies_to(self, row, column_map):
        """Check if this rule matches a given import row."""
        if not self.is_active:
            return False
        col_name = column_map.get(self.match_field, "")
        if not col_name:
            return False
        row_value = row.get(col_name, "").strip()
        return row_value.lower() == self.match_value.lower()

    def apply(self, row, column_map):
        """Apply this rule to modify the row in-place. Returns True if applied."""
        if self.action == "skip":
            return True  # caller should skip this row

        col_name = column_map.get(self.target_field, "")
        if not col_name and self.target_field in row:
            col_name = self.target_field

        if self.action == "set" and col_name:
            row[col_name] = self.target_value or ""
            self.times_applied += 1
            self.last_applied_at = datetime.now(timezone.utc)
            return True
        elif self.action == "multiply" and col_name:
            try:
                current = float(row.get(col_name, 0) or 0)
                factor = float(self.target_value or 1)
                row[col_name] = str(round(current * factor, 4))
                self.times_applied += 1
                self.last_applied_at = datetime.now(timezone.utc)
                return True
            except (ValueError, TypeError):
                return False
        return False

    def __repr__(self):
        return f"<CorrectionRule {self.match_field}={self.match_value} -> {self.target_field}>"
