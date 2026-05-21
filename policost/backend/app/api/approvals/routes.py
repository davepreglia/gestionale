from flask import request, jsonify
from flask_jwt_extended import jwt_required

from . import approvals_bp
from ...models import Expense, ExpenseStatus
from ...middleware.rbac import get_current_user
from ...utils.helpers import paginate_query, success_response, error_response
from ...utils.constants import ADMIN, PROJECT_MANAGER, FINANCIAL_APPROVER
from ...extensions import db


@approvals_bp.get("/approvals/queue")
@jwt_required()
def approval_queue():
    """Returns expenses pending the current user's action."""
    current = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    q = Expense.query

    if current.has_role(ADMIN):
        # Admin sees everything in-flight
        q = q.filter(Expense.status.in_([
            ExpenseStatus.submitted,
            ExpenseStatus.under_review,
            ExpenseStatus.pm_approved,
        ]))
    elif current.has_role(PROJECT_MANAGER):
        managed_ids = [p.id for p in current.managed_projects]
        q = q.filter(
            Expense.project_id.in_(managed_ids),
            Expense.status.in_([ExpenseStatus.submitted, ExpenseStatus.under_review]),
        )
    elif current.has_role(FINANCIAL_APPROVER):
        q = q.filter(Expense.status == ExpenseStatus.pm_approved)
    else:
        return jsonify(success_response({"items": [], "total": 0, "page": 1, "per_page": per_page, "pages": 0})[0]), 200

    q = q.order_by(Expense.submitted_at.asc())
    result = paginate_query(q, page, per_page)
    result["items"] = [e.to_dict(include_details=True) for e in result["items"]]
    return jsonify(success_response(result)[0]), 200


@approvals_bp.get("/approvals/history/<expense_id>")
@jwt_required()
def approval_history(expense_id):
    current = get_current_user()
    expense = Expense.query.get_or_404(expense_id)

    is_owner = expense.submitter_id == current.id
    is_pm = current.has_role(PROJECT_MANAGER) and expense.project.manager_id == current.id
    if not (is_owner or is_pm or current.has_any_role(ADMIN, FINANCIAL_APPROVER)):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    return jsonify(success_response([a.to_dict() for a in expense.approvals])[0]), 200
