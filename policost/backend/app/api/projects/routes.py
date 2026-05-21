from flask import request, jsonify
from flask_jwt_extended import jwt_required

from . import projects_bp
from ...extensions import db
from ...models import Project, ProjectStatus, BudgetAllocation, ExpenseCategory
from ...middleware.rbac import require_roles, get_current_user
from ...services.budget_service import BudgetService
from ...services.audit_service import AuditService
from ...utils.helpers import paginate_query, success_response, error_response
from ...utils.constants import ADMIN, PROJECT_MANAGER


@projects_bp.get("/projects")
@jwt_required()
def list_projects():
    current = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    q = Project.query
    if not current.has_role(ADMIN):
        q = q.filter(
            db.or_(
                Project.manager_id == current.id,
                Project.department_id == current.department_id,
            )
        )

    q = q.order_by(Project.created_at.desc())
    result = paginate_query(q, page, per_page)
    result["items"] = [p.to_dict(include_stats=True) for p in result["items"]]
    return jsonify(success_response(result)[0]), 200


@projects_bp.post("/projects")
@require_roles(ADMIN)
def create_project():
    current = get_current_user()
    data = request.get_json(silent=True) or {}

    required = ["name", "code", "department_id", "manager_id", "total_budget"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify(error_response(f"Missing fields: {', '.join(missing)}")[0]), 400

    if Project.query.filter_by(code=data["code"]).first():
        return jsonify(error_response(f"Project code '{data['code']}' already exists.")[0]), 409

    from datetime import date
    start = None
    end = None
    try:
        if data.get("start_date"):
            start = date.fromisoformat(data["start_date"])
        if data.get("end_date"):
            end = date.fromisoformat(data["end_date"])
    except ValueError:
        return jsonify(error_response("Invalid date format.")[0]), 400

    project = Project(
        name=data["name"],
        code=data["code"].upper(),
        description=data.get("description", ""),
        department_id=data["department_id"],
        manager_id=data["manager_id"],
        total_budget=float(data["total_budget"]),
        start_date=start,
        end_date=end,
        funding_source=data.get("funding_source"),
        status=ProjectStatus.active,
    )
    db.session.add(project)
    db.session.flush()

    # Create category allocations if provided
    for alloc in data.get("allocations", []):
        cat = ExpenseCategory.query.get(alloc.get("category_id"))
        if cat:
            ba = BudgetAllocation(
                project_id=project.id,
                category_id=cat.id,
                allocated_amount=float(alloc.get("amount", 0)),
                fiscal_year=alloc.get("fiscal_year"),
            )
            db.session.add(ba)

    db.session.commit()
    AuditService.log(current, "PROJECT_CREATED", "project", project.id,
                     new_value={"code": project.code, "budget": float(project.total_budget)})
    return jsonify(success_response(project.to_dict(include_stats=True), "Project created", 201)[0]), 201


@projects_bp.get("/projects/<project_id>")
@jwt_required()
def get_project(project_id):
    current = get_current_user()
    project = Project.query.get_or_404(project_id)

    if (not current.has_role(ADMIN) and
            project.manager_id != current.id and
            project.department_id != current.department_id):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    data = project.to_dict(include_stats=True)
    data["budget_summary"] = BudgetService.get_project_budget_summary(project_id)
    data["allocations"] = [a.to_dict() for a in project.budget_allocations]
    return jsonify(success_response(data)[0]), 200


@projects_bp.put("/projects/<project_id>")
@jwt_required()
def update_project(project_id):
    current = get_current_user()
    project = Project.query.get_or_404(project_id)

    if (not current.has_role(ADMIN) and 
        not (current.has_role(PROJECT_MANAGER) and project.department_id == current.department_id) and 
        project.manager_id != current.id):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    data = request.get_json(silent=True) or {}
    editable = ["name", "description", "funding_source", "status"]
    if current.has_role(ADMIN):
        editable += ["total_budget", "manager_id", "department_id"]

    for field in editable:
        if field in data:
            if field == "status":
                try:
                    setattr(project, field, ProjectStatus(data[field]))
                except ValueError:
                    return jsonify(error_response(f"Invalid status: {data[field]}")[0]), 400
            else:
                setattr(project, field, data[field])

    db.session.commit()
    AuditService.log(current, "PROJECT_UPDATED", "project", project.id)
    return jsonify(success_response(project.to_dict(include_stats=True))[0]), 200


@projects_bp.get("/projects/<project_id>/expenses")
@jwt_required()
def project_expenses(project_id):
    current = get_current_user()
    project = Project.query.get_or_404(project_id)

    if not current.has_role(ADMIN) and project.manager_id != current.id:
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    from ...models import Expense
    q = Expense.query.filter_by(project_id=project_id).order_by(Expense.created_at.desc())
    result = paginate_query(q, page, per_page)
    result["items"] = [e.to_dict() for e in result["items"]]
    return jsonify(success_response(result)[0]), 200


@projects_bp.get("/categories")
@jwt_required()
def list_categories():
    cats = ExpenseCategory.query.order_by(ExpenseCategory.name).all()
    return jsonify(success_response([c.to_dict() for c in cats])[0]), 200
