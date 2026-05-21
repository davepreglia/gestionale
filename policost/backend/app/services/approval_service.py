from datetime import datetime, timezone

from ..extensions import db
from ..models import (
    Expense, Approval, Project, Document,
    ExpenseStatus, ApprovalLevel, ApprovalAction
)
from .audit_service import AuditService
from .budget_service import BudgetService


class ApprovalService:
    """Handles the multi-step expense approval workflow."""

    FLOW = [
        (ExpenseStatus.submitted, ExpenseStatus.under_review, ExpenseStatus.rejected),
        (ExpenseStatus.under_review, ExpenseStatus.pm_approved, ExpenseStatus.rejected),
        (ExpenseStatus.pm_approved, ExpenseStatus.approved, ExpenseStatus.rejected),
    ]

    LEVEL_MAP = {
        ExpenseStatus.submitted: ApprovalLevel.project_manager,
        ExpenseStatus.under_review: ApprovalLevel.project_manager,
        ExpenseStatus.pm_approved: ApprovalLevel.financial_admin,
    }

    @staticmethod
    def can_approve_pm(user, expense: Expense) -> bool:
        return (
            user.has_any_role("ADMIN_DEPARTMENT", "PROJECT_MANAGER")
            and expense.status in (ExpenseStatus.submitted, ExpenseStatus.under_review)
        )

    @staticmethod
    def can_approve_financial(user, expense: Expense) -> bool:
        return (
            user.has_any_role("ADMIN_DEPARTMENT", "FINANCIAL_APPROVER")
            and expense.status == ExpenseStatus.pm_approved
        )

    @staticmethod
    def can_override(user) -> bool:
        return user.has_role("ADMIN_DEPARTMENT")

    @staticmethod
    def validate_can_submit(expense: Expense) -> tuple[bool, str]:
        if expense.status != ExpenseStatus.draft:
            return False, "Only draft expenses can be submitted."
        if expense.receipt_required and not expense.documents:
            return False, "A supporting document (receipt/invoice) is required before submission."
        if expense.is_duplicate_flagged:
            return False, "This expense has been flagged as a potential duplicate. Review before submitting."
        return True, ""

    @staticmethod
    def submit(expense: Expense, submitter) -> Expense:
        ok, msg = ApprovalService.validate_can_submit(expense)
        if not ok:
            raise ValueError(msg)
        expense.status = ExpenseStatus.submitted
        expense.submitted_at = datetime.now(timezone.utc)
        db.session.commit()
        AuditService.log(submitter, "EXPENSE_SUBMITTED", "expense", expense.id,
                         old_value={"status": "draft"}, new_value={"status": "submitted"})
        return expense

    @staticmethod
    def process_approval(expense: Expense, approver, action: str, comment: str = None,
                         override: bool = False) -> Expense:
        old_status = expense.status.value

        if override:
            if not ApprovalService.can_override(approver):
                raise PermissionError("Only admins can override approvals.")
            level = ApprovalLevel.override
            if action == "approved":
                expense.status = ExpenseStatus.approved
                # Update budget on override
                BudgetService.record_spend(expense.project_id, expense.category_id,
                                           float(expense.amount))
            else:
                expense.status = ExpenseStatus.rejected
                expense.rejection_reason = comment
        elif action == "approved":
            if ApprovalService.can_approve_pm(approver, expense):
                level = ApprovalLevel.project_manager
                if expense.status == ExpenseStatus.submitted:
                    expense.status = ExpenseStatus.under_review
                else:
                    expense.status = ExpenseStatus.pm_approved
            elif ApprovalService.can_approve_financial(approver, expense):
                level = ApprovalLevel.financial_admin
                expense.status = ExpenseStatus.approved
                # Update budget
                BudgetService.record_spend(expense.project_id, expense.category_id,
                                           float(expense.amount))
            else:
                raise PermissionError("You are not authorized to approve this expense at its current stage.")
        elif action == "rejected":
            if not (ApprovalService.can_approve_pm(approver, expense) or
                    ApprovalService.can_approve_financial(approver, expense)):
                raise PermissionError("You are not authorized to reject this expense.")
            level = ApprovalService.LEVEL_MAP.get(expense.status, ApprovalLevel.project_manager)
            expense.status = ExpenseStatus.rejected
            expense.rejection_reason = comment
        else:
            raise ValueError(f"Unknown action: {action}")

        approval = Approval(
            expense_id=expense.id,
            approver_id=approver.id,
            approval_level=level,
            action=ApprovalAction(action) if action in ("approved", "rejected") else ApprovalAction.approved,
            comment=comment,
        )
        db.session.add(approval)
        db.session.commit()

        AuditService.log(approver, f"EXPENSE_{action.upper()}", "expense", expense.id,
                         old_value={"status": old_status},
                         new_value={"status": expense.status.value})
        return expense
