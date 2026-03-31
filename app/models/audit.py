import json
from datetime import datetime, timezone
from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_log"

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(50), nullable=False, index=True)
    entity_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(20), nullable=False)  # create, update, delete, import
    changes = db.Column(db.Text, nullable=True)  # JSON blob
    source = db.Column(db.String(50), default="manual")
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    @property
    def changes_dict(self):
        if self.changes:
            return json.loads(self.changes)
        return {}

    def set_changes(self, old_values, new_values):
        self.changes = json.dumps({"old": old_values, "new": new_values})

    def __repr__(self):
        return f"<AuditLog {self.action} {self.entity_type}#{self.entity_id}>"
