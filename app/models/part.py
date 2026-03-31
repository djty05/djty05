from datetime import datetime, timezone
from app.extensions import db


class PartCategory(db.Model):
    __tablename__ = "part_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("part_categories.id"), nullable=True)

    parent = db.relationship("PartCategory", remote_side=[id], backref="subcategories")
    parts = db.relationship("Part", back_populates="category", lazy="dynamic")

    def __repr__(self):
        return f"<PartCategory {self.name}>"


class Part(db.Model):
    __tablename__ = "parts"

    id = db.Column(db.Integer, primary_key=True)
    internal_part_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.String(500), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("part_categories.id"), nullable=True)
    unit_of_measure = db.Column(db.String(20), default="each")
    current_sell_price = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    category = db.relationship("PartCategory", back_populates="parts")
    supplier_parts = db.relationship(
        "SupplierPart", back_populates="part", lazy="dynamic", cascade="all, delete-orphan"
    )

    @property
    def best_cost_price(self):
        """Lowest current supplier price."""
        prices = [sp.supplier_price for sp in self.supplier_parts if sp.supplier_price]
        return min(prices) if prices else None

    @property
    def preferred_supplier_part(self):
        """The preferred supplier mapping, or first available."""
        preferred = self.supplier_parts.filter_by(is_preferred=True).first()
        if preferred:
            return preferred
        return self.supplier_parts.first()

    def __repr__(self):
        return f"<Part {self.internal_part_number}>"
