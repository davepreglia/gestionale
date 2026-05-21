from flask import request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, extract
from datetime import date

from . import analytics_bp
from ...extensions import db
from ...models import Expense, ExpenseStatus, Project, User, ExpenseCategory
from ...middleware.rbac import get_current_user
from ...utils.helpers import success_response, error_response
from ...utils.constants import ADMIN, FINANCIAL_APPROVER


@analytics_bp.get("/analytics/overview")
@jwt_required()
def overview():
    current = get_current_user()
    if not current.has_any_role(ADMIN, FINANCIAL_APPROVER):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    total_expenses = Expense.query.count()
    approved_sum = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(Expense.status == ExpenseStatus.approved).scalar()

    pending_count = Expense.query.filter(
        Expense.status.in_([
            ExpenseStatus.submitted,
            ExpenseStatus.under_review,
            ExpenseStatus.pm_approved,
        ])
    ).count()

    rejected_count = Expense.query.filter_by(status=ExpenseStatus.rejected).count()
    active_projects = Project.query.filter_by(status="active").count()
    total_users = User.query.filter_by(is_active=True).count()

    return jsonify(success_response({
        "total_expenses": total_expenses,
        "approved_amount": float(approved_sum),
        "pending_count": pending_count,
        "rejected_count": rejected_count,
        "active_projects": active_projects,
        "total_users": total_users,
    })[0]), 200


@analytics_bp.get("/analytics/expenses/timeline")
@jwt_required()
def expense_timeline():
    current = get_current_user()
    year = request.args.get("year", date.today().year, type=int)

    q = db.session.query(
        extract("month", Expense.expense_date).label("month"),
        func.count(Expense.id).label("count"),
        func.coalesce(func.sum(Expense.amount), 0).label("total"),
    ).filter(
        extract("year", Expense.expense_date) == year,
    )

    # Scope non-admins to their own expenses
    if not current.has_any_role(ADMIN, FINANCIAL_APPROVER):
        q = q.filter(Expense.submitter_id == current.id)

    rows = q.group_by("month").order_by("month").all()

    timeline = []
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for row in rows:
        timeline.append({
            "month": int(row.month),
            "month_label": month_names[int(row.month) - 1],
            "count": int(row.count),
            "total": float(row.total),
        })

    return jsonify(success_response({"year": year, "data": timeline})[0]), 200


@analytics_bp.get("/analytics/expenses/by-category")
@jwt_required()
def expenses_by_category():
    current = get_current_user()

    q = db.session.query(
        ExpenseCategory.name.label("category"),
        func.count(Expense.id).label("count"),
        func.coalesce(func.sum(Expense.amount), 0).label("total"),
    ).join(Expense, Expense.category_id == ExpenseCategory.id)

    if not current.has_any_role(ADMIN, FINANCIAL_APPROVER):
        q = q.filter(Expense.submitter_id == current.id)

    rows = q.group_by(ExpenseCategory.name).order_by(func.sum(Expense.amount).desc()).all()

    return jsonify(success_response([
        {"category": r.category, "count": int(r.count), "total": float(r.total)}
        for r in rows
    ])[0]), 200


@analytics_bp.get("/analytics/budget/usage")
@jwt_required()
def budget_usage():
    current = get_current_user()
    if not current.has_any_role(ADMIN, FINANCIAL_APPROVER, "PROJECT_MANAGER"):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    q = Project.query.filter_by(status="active")
    if not current.has_any_role(ADMIN, FINANCIAL_APPROVER):
        q = q.filter_by(manager_id=current.id)

    projects = q.all()
    result = []
    for p in projects:
        spent = p.spent_budget
        result.append({
            "project_id": p.id,
            "project_name": p.name,
            "project_code": p.code,
            "total_budget": float(p.total_budget),
            "spent": spent,
            "remaining": p.remaining_budget,
            "usage_pct": round(spent / float(p.total_budget) * 100, 1) if p.total_budget else 0,
        })

    return jsonify(success_response(result)[0]), 200


@analytics_bp.get("/analytics/my-dashboard")
@jwt_required()
def my_dashboard():
    """Personal analytics for the current user."""
    current = get_current_user()

    my_expenses = Expense.query.filter_by(submitter_id=current.id)

    status_counts = {}
    for s in ExpenseStatus:
        status_counts[s.value] = my_expenses.filter(Expense.status == s).count()

    total_submitted = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(
        Expense.submitter_id == current.id,
        Expense.status != ExpenseStatus.rejected,
    ).scalar()

    total_approved = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(
        Expense.submitter_id == current.id,
        Expense.status == ExpenseStatus.approved,
    ).scalar()

    recent = my_expenses.order_by(Expense.created_at.desc()).limit(5).all()

    return jsonify(success_response({
        "status_summary": status_counts,
        "total_submitted_amount": float(total_submitted),
        "total_approved_amount": float(total_approved),
        "recent_expenses": [e.to_dict() for e in recent],
    })[0]), 200
