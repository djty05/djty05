import json
from app.extensions import db
from app.models.audit import AuditLog


def log_change(entity_type, entity_id, action, old_values=None, new_values=None, source="manual"):
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        source=source,
    )
    if old_values or new_values:
        entry.changes = json.dumps(
            {"old": old_values or {}, "new": new_values or {}},
            default=str,
        )
    db.session.add(entry)


def get_audit_trail(entity_type=None, entity_id=None, limit=50):
    query = AuditLog.query.order_by(AuditLog.created_at.desc())
    if entity_type:
        query = query.filter_by(entity_type=entity_type)
    if entity_id:
        query = query.filter_by(entity_id=entity_id)
    return query.limit(limit).all()


def get_recent_activity(limit=20):
    return AuditLog.query.order_by(AuditLog.created_at.desc()).limit(limit).all()
