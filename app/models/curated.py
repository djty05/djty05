"""Curated parts list — sync only what you actually use.

Instead of importing entire supplier catalogues into Simpro,
users add specific parts to their curated list. Only those parts
get exported / synced.
"""

from datetime import datetime, timezone
from app.extensions import db


class CuratedList(db.Model):
    __tablename__ = "curated_lists"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items = db.relationship("CuratedListItem", back_populates="curated_list", cascade="all, delete-orphan", lazy="dynamic")

    @property
    def item_count(self):
        return self.items.count()

    def __repr__(self):
        return f"<CuratedList {self.name}>"


class CuratedListItem(db.Model):
    __tablename__ = "curated_list_items"
    __table_args__ = (
        db.UniqueConstraint("curated_list_id", "part_id", name="uq_curated_part"),
    )

    id = db.Column(db.Integer, primary_key=True)
    curated_list_id = db.Column(db.Integer, db.ForeignKey("curated_lists.id"), nullable=False, index=True)
    part_id = db.Column(db.Integer, db.ForeignKey("parts.id"), nullable=False, index=True)
    notes = db.Column(db.String(300), nullable=True)
    added_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    curated_list = db.relationship("CuratedList", back_populates="items")
    part = db.relationship("Part", backref="curated_items")

    def __repr__(self):
        return f"<CuratedListItem list={self.curated_list_id} part={self.part_id}>"
