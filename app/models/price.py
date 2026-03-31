from datetime import datetime, timezone
from app.extensions import db


class PriceHistory(db.Model):
    __tablename__ = "price_history"

    id = db.Column(db.Integer, primary_key=True)
    supplier_part_id = db.Column(
        db.Integer, db.ForeignKey("supplier_parts.id"), nullable=False, index=True
    )
    old_price = db.Column(db.Float, nullable=True)
    new_price = db.Column(db.Float, nullable=False)
    change_amount = db.Column(db.Float, nullable=True)
    change_percent = db.Column(db.Float, nullable=True)
    source = db.Column(db.String(50), nullable=False, default="manual")  # csv_import, manual
    recorded_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    supplier_part = db.relationship("SupplierPart", back_populates="price_history")

    def __repr__(self):
        return f"<PriceHistory {self.old_price} -> {self.new_price}>"
