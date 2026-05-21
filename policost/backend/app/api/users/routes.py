from flask import request, jsonify
from flask_jwt_extended import jwt_required

from . import users_bp
from ...extensions import db
from ...models import User, Role, user_roles
from ...middleware.rbac import require_roles, get_current_user
from ...services.audit_service import AuditService
from ...utils.helpers import paginate_query, success_response, error_response
from ...utils.constants import ADMIN, ALL_ROLES, ROLE_PERMISSIONS


@users_bp.get("/users")
@jwt_required()
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("q", "")
    dept_id = request.args.get("department_id", type=int)

    q = User.query
    if search:
        q = q.filter(
            db.or_(
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )
    if dept_id:
        q = q.filter_by(department_id=dept_id)
    q = q.order_by(User.last_name)

    result = paginate_query(q, page, per_page)
    result["items"] = [u.to_dict() for u in result["items"]]
    return jsonify(success_response(result)[0]), 200


@users_bp.post("/users")
@require_roles(ADMIN)
def create_user():
    data = request.get_json(silent=True) or {}
    current = get_current_user()

    required = ["email", "password", "first_name", "last_name", "staff_type"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify(error_response(f"Missing fields: {', '.join(missing)}")[0]), 400

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify(error_response("Email already registered.")[0]), 409

    user = User(
        email=data["email"].strip().lower(),
        first_name=data["first_name"],
        last_name=data["last_name"],
        staff_type=data["staff_type"],
        department_id=data.get("department_id"),
        matricola=data.get("matricola"),
    )
    user.set_password(data["password"])

    # Assign default role
    default_role = Role.query.filter_by(name="STANDARD_USER").first()
    if default_role:
        user.roles.append(default_role)

    db.session.add(user)
    db.session.commit()
    AuditService.log(current, "USER_CREATED", "user", user.id,
                     new_value={"email": user.email})
    return jsonify(success_response(user.to_dict(), "User created", 201)[0]), 201


@users_bp.get("/users/<user_id>")
@jwt_required()
def get_user(user_id):
    current = get_current_user()
    if current.id != user_id and not current.has_role(ADMIN):
        return jsonify(error_response("Forbidden.", 403)[0]), 403
    user = User.query.get_or_404(user_id)
    return jsonify(success_response(user.to_dict())[0]), 200


@users_bp.put("/users/<user_id>")
@jwt_required()
def update_user(user_id):
    current = get_current_user()
    if current.id != user_id and not current.has_role(ADMIN):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}

    allowed_fields = ["first_name", "last_name", "department_id", "matricola", "staff_type"]
    if current.has_role(ADMIN):
        allowed_fields += ["is_active"]

    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    if "password" in data and data["password"]:
        user.set_password(data["password"])

    db.session.commit()
    AuditService.log(current, "USER_UPDATED", "user", user.id)
    return jsonify(success_response(user.to_dict())[0]), 200


@users_bp.post("/users/<user_id>/roles")
@require_roles(ADMIN)
def assign_role(user_id):
    current = get_current_user()
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}
    role_name = data.get("role")
    if not role_name:
        return jsonify(error_response("role is required.")[0]), 400
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return jsonify(error_response(f"Role '{role_name}' not found.")[0]), 404
    if role not in user.roles:
        user.roles.append(role)
        db.session.commit()
        AuditService.log(current, "ROLE_ASSIGNED", "user", user.id,
                         new_value={"role": role_name})
    return jsonify(success_response(user.to_dict())[0]), 200


@users_bp.delete("/users/<user_id>/roles/<role_name>")
@require_roles(ADMIN)
def remove_role(user_id, role_name):
    current = get_current_user()
    user = User.query.get_or_404(user_id)
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return jsonify(error_response("Role not found.")[0]), 404
    if role in user.roles:
        user.roles.remove(role)
        db.session.commit()
        AuditService.log(current, "ROLE_REMOVED", "user", user.id,
                         old_value={"role": role_name})
    return jsonify(success_response(user.to_dict())[0]), 200
