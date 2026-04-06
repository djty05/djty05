from datetime import datetime, timezone
from app.extensions import db


class Supplier(db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=True, index=True)
    contact_email = db.Column(db.String(200), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    website = db.Column(db.String(300), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    supplier_parts = db.relationship(
        "SupplierPart", back_populates="supplier", lazy="dynamic", cascade="all, delete-orphan"
    )

    @property
    def part_count(self):
        return self.supplier_parts.count()

    def __repr__(self):
        return f"<Supplier {self.name}>"


class SupplierPart(db.Model):
    __tablename__ = "supplier_parts"
    __table_args__ = (
        db.UniqueConstraint("supplier_id", "supplier_part_number", name="uq_supplier_part"),
    )

    id = db.Column(db.Integer, primary_key=True)
    part_id = db.Column(db.Integer, db.ForeignKey("parts.id"), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False, index=True)
    supplier_part_number = db.Column(db.String(100), nullable=False, index=True)
    supplier_description = db.Column(db.String(500), nullable=True)
    supplier_price = db.Column(db.Float, nullable=True)
    last_price_check = db.Column(db.DateTime, nullable=True)
    is_preferred = db.Column(db.Boolean, default=False, nullable=False)
    priority = db.Column(db.Integer, default=0, nullable=False)  # lower = higher priority; 0 = unranked
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    part = db.relationship("Part", back_populates="supplier_parts")
    supplier = db.relationship("Supplier", back_populates="supplier_parts")
    price_history = db.relationship(
        "PriceHistory", back_populates="supplier_part", lazy="dynamic", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<SupplierPart {self.supplier_part_number} ({self.supplier.name if self.supplier else '?'})>"
