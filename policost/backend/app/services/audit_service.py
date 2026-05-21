from flask import request
from ..extensions import db
from ..models import AuditLog


class AuditService:
    @staticmethod
    def log(user, action: str, entity_type: str = None, entity_id: str = None,
            old_value=None, new_value=None):
        try:
            log = AuditLog(
                user_id=user.id if user else None,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else None,
                old_value=old_value,
                new_value=new_value,
                ip_address=_get_ip(),
            )
            db.session.add(log)
            db.session.commit()
        except Exception:
            db.session.rollback()

    @staticmethod
    def get_recent(entity_type: str = None, entity_id: str = None, limit: int = 50):
        q = AuditLog.query.order_by(AuditLog.timestamp.desc())
        if entity_type:
            q = q.filter_by(entity_type=entity_type)
        if entity_id:
            q = q.filter_by(entity_id=entity_id)
        return q.limit(limit).all()


def _get_ip():
    try:
        if request.environ.get("HTTP_X_FORWARDED_FOR"):
            return request.environ["HTTP_X_FORWARDED_FOR"].split(",")[0].strip()
        return request.remote_addr
    except RuntimeError:
        return None
