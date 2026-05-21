from datetime import datetime
from flask import request, jsonify
from flask_jwt_extended import jwt_required

from . import expenses_bp
from ...extensions import db
from ...models import Expense, ExpenseStatus, ExpenseCategory, Project
from ...middleware.rbac import get_current_user
from ...services.approval_service import ApprovalService
from ...services.budget_service import BudgetService
from ...services.audit_service import AuditService
from ...utils.helpers import paginate_query, success_response, error_response
from ...utils.constants import ADMIN, PROJECT_MANAGER, FINANCIAL_APPROVER


def _build_expense_query(current_user):
    """Return a scoped query based on user role."""
    q = Expense.query
    if current_user.has_role(ADMIN) or current_user.has_role(FINANCIAL_APPROVER):
        return q
    if current_user.has_role(PROJECT_MANAGER):
        managed_project_ids = [p.id for p in current_user.managed_projects]
        return q.filter(
            db.or_(
                Expense.submitter_id == current_user.id,
                Expense.project_id.in_(managed_project_ids),
            )
        )
    return q.filter_by(submitter_id=current_user.id)


@expenses_bp.get("/expenses")
@jwt_required()
def list_expenses():
    current = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")
    project_id = request.args.get("project_id")
    category_id = request.args.get("category_id", type=int)
    q = request.args.get("q", "")

    query = _build_expense_query(current)
    if status:
        try:
            query = query.filter(Expense.status == ExpenseStatus(status))
        except ValueError:
            return jsonify(error_response(f"Invalid status: {status}")[0]), 400
    if project_id:
        query = query.filter_by(project_id=project_id)
    if category_id:
        query = query.filter_by(category_id=category_id)
    if q:
        query = query.filter(Expense.title.ilike(f"%{q}%"))

    query = query.order_by(Expense.created_at.desc())
    result = paginate_query(query, page, per_page)
    result["items"] = [e.to_dict() for e in result["items"]]
    return jsonify(success_response(result)[0]), 200


@expenses_bp.post("/expenses")
@jwt_required()
def create_expense():
    current = get_current_user()
    data = request.get_json(silent=True) or {}

    required = ["title", "amount", "expense_date", "category_id", "project_id"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify(error_response(f"Missing fields: {', '.join(missing)}")[0]), 400

    try:
        amount = float(data["amount"])
        expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d").date()
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid data: {e}")[0]), 400

    if amount <= 0:
        return jsonify(error_response("Amount must be positive.")[0]), 400

    # Validate project exists and user has access
    project = Project.query.get(data["project_id"])
    if not project:
        return jsonify(error_response("Project not found.")[0]), 404
    if project.status.value != "active":
        return jsonify(error_response("Cannot add expenses to an inactive project.")[0]), 400

    # Budget check
    ok, msg = BudgetService.check_budget(data["project_id"], amount)
    if not ok:
        return jsonify(error_response(msg)[0]), 400

    category = ExpenseCategory.query.get(data["category_id"])
    if not category:
        return jsonify(error_response("Category not found.")[0]), 404

    expense = Expense(
        title=data["title"],
        description=data.get("description", ""),
        amount=amount,
        expense_date=expense_date,
        category_id=data["category_id"],
        project_id=data["project_id"],
        submitter_id=current.id,
        external_reference=data.get("external_reference"),
        receipt_required=data.get("receipt_required", True),
    )
    db.session.add(expense)
    db.session.commit()
    AuditService.log(current, "EXPENSE_CREATED", "expense", expense.id,
                     new_value={"title": expense.title, "amount": amount})
    return jsonify(success_response(expense.to_dict(include_details=True), "Expense created", 201)[0]), 201


@expenses_bp.get("/expenses/<expense_id>")
@jwt_required()
def get_expense(expense_id):
    current = get_current_user()
    expense = Expense.query.get_or_404(expense_id)

    # Access control
    is_owner = expense.submitter_id == current.id
    is_pm = current.has_role(PROJECT_MANAGER) and expense.project.manager_id == current.id
    is_privileged = current.has_any_role(ADMIN, FINANCIAL_APPROVER)
    if not (is_owner or is_pm or is_privileged):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    return jsonify(success_response(expense.to_dict(include_details=True))[0]), 200


@expenses_bp.put("/expenses/<expense_id>")
@jwt_required()
def update_expense(expense_id):
    current = get_current_user()
    expense = Expense.query.get_or_404(expense_id)

    if expense.submitter_id != current.id and not current.has_role(ADMIN):
        return jsonify(error_response("Forbidden.", 403)[0]), 403
    if expense.status != ExpenseStatus.draft:
        return jsonify(error_response("Only draft expenses can be edited.")[0]), 400

    data = request.get_json(silent=True) or {}
    editable = ["title", "description", "external_reference", "receipt_required"]
    for field in editable:
        if field in data:
            setattr(expense, field, data[field])

    if "amount" in data:
        try:
            new_amount = float(data["amount"])
            if new_amount <= 0:
                return jsonify(error_response("Amount must be positive.")[0]), 400
            ok, msg = BudgetService.check_budget(expense.project_id, new_amount)
            if not ok:
                return jsonify(error_response(msg)[0]), 400
            expense.amount = new_amount
        except ValueError:
            return jsonify(error_response("Invalid amount.")[0]), 400

    if "expense_date" in data:
        try:
            expense.expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify(error_response("Invalid date format. Use YYYY-MM-DD.")[0]), 400

    db.session.commit()
    AuditService.log(current, "EXPENSE_UPDATED", "expense", expense.id)
    return jsonify(success_response(expense.to_dict(include_details=True))[0]), 200


@expenses_bp.delete("/expenses/<expense_id>")
@jwt_required()
def delete_expense(expense_id):
    current = get_current_user()
    expense = Expense.query.get_or_404(expense_id)

    if expense.submitter_id != current.id and not current.has_role(ADMIN):
        return jsonify(error_response("Forbidden.", 403)[0]), 403
    if expense.status not in (ExpenseStatus.draft,) and not current.has_role(ADMIN):
        return jsonify(error_response("Cannot delete a submitted expense.")[0]), 400

    db.session.delete(expense)
    db.session.commit()
    AuditService.log(current, "EXPENSE_DELETED", "expense", expense_id)
    return jsonify(success_response(None, "Expense deleted")[0]), 200


@expenses_bp.post("/expenses/<expense_id>/submit")
@jwt_required()
def submit_expense(expense_id):
    current = get_current_user()
    expense = Expense.query.get_or_404(expense_id)

    if expense.submitter_id != current.id:
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    # Duplicate detection: same title, amount, date, same project
    duplicate = Expense.query.filter(
        Expense.id != expense.id,
        Expense.submitter_id == current.id,
        Expense.project_id == expense.project_id,
        Expense.title == expense.title,
        Expense.amount == expense.amount,
        Expense.expense_date == expense.expense_date,
        Expense.status != ExpenseStatus.rejected,
    ).first()
    if duplicate:
        expense.is_duplicate_flagged = True
        db.session.commit()
        return jsonify(error_response(
            f"Potential duplicate detected (expense #{duplicate.id}). "
            "Delete the duplicate or contact an admin."
        )[0]), 409

    try:
        ApprovalService.submit(expense, current)
    except ValueError as e:
        return jsonify(error_response(str(e))[0]), 400

    return jsonify(success_response(expense.to_dict(include_details=True), "Expense submitted")[0]), 200


@expenses_bp.post("/expenses/<expense_id>/approve")
@jwt_required()
def approve_expense(expense_id):
    current = get_current_user()
    expense = Expense.query.get_or_404(expense_id)
    data = request.get_json(silent=True) or {}

    action = data.get("action", "approved")
    comment = data.get("comment", "")
    override = data.get("override", False)

    try:
        expense = ApprovalService.process_approval(expense, current, action, comment, override)
    except (PermissionError, ValueError) as e:
        status = 403 if isinstance(e, PermissionError) else 400
        return jsonify(error_response(str(e), status)[0]), status

    return jsonify(success_response(expense.to_dict(include_details=True),
                                    f"Expense {action}")[0]), 200
