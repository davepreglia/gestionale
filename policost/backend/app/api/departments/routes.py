from flask import request, jsonify
from flask_jwt_extended import jwt_required

from . import departments_bp
from ...extensions import db
from ...models import Department, User
from ...middleware.rbac import require_roles, get_current_user
from ...utils.helpers import success_response, error_response
from ...utils.constants import ADMIN


@departments_bp.get("/departments")
@jwt_required()
def list_departments():
    depts = Department.query.order_by(Department.name).all()
    result = []
    for d in depts:
        dd = d.to_dict()
        dd["user_count"] = len(d.users)
        dd["project_count"] = len(d.projects)
        dd["head"] = d.head.to_dict(include_roles=False) if d.head else None
        result.append(dd)
    return jsonify(success_response(result)[0]), 200


@departments_bp.post("/departments")
@require_roles(ADMIN)
def create_department():
    current = get_current_user()
    data = request.get_json(silent=True) or {}
    if not data.get("name") or not data.get("code"):
        return jsonify(error_response("name and code are required.")[0]), 400
    if Department.query.filter_by(code=data["code"].upper()).first():
        return jsonify(error_response("Department code already exists.")[0]), 409

    dept = Department(name=data["name"], code=data["code"].upper(),
                      head_id=data.get("head_id"))
    db.session.add(dept)
    db.session.commit()
    return jsonify(success_response(dept.to_dict(), "Department created", 201)[0]), 201


@departments_bp.put("/departments/<int:dept_id>")
@require_roles(ADMIN)
def update_department(dept_id):
    dept = Department.query.get_or_404(dept_id)
    data = request.get_json(silent=True) or {}
    if "name" in data:
        dept.name = data["name"]
    if "head_id" in data:
        dept.head_id = data["head_id"]
    db.session.commit()
    return jsonify(success_response(dept.to_dict())[0]), 200
