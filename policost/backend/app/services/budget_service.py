from ..extensions import db
from ..models import BudgetAllocation, Expense, ExpenseStatus


class BudgetService:
    @staticmethod
    def check_budget(project_id: str, amount: float) -> tuple[bool, str]:
        from ..models import Project
        project = Project.query.get(project_id)
        if not project:
            return False, "Project not found."
        if project.status.value != "active":
            return False, "Project is not active."
        remaining = project.remaining_budget
        if amount > remaining:
            return False, (
                f"Expense amount €{amount:.2f} exceeds remaining budget "
                f"€{remaining:.2f} for project {project.code}."
            )
        return True, ""

    @staticmethod
    def check_category_budget(project_id: str, category_id: int, amount: float) -> tuple[bool, str]:
        alloc = BudgetAllocation.query.filter_by(
            project_id=project_id, category_id=category_id
        ).first()
        if not alloc:
            return True, ""  # No per-category limit set
        spent = db.session.query(
            db.func.coalesce(db.func.sum(Expense.amount), 0)
        ).filter(
            Expense.project_id == project_id,
            Expense.category_id == category_id,
            Expense.status.in_([ExpenseStatus.approved, ExpenseStatus.pm_approved,
                                 ExpenseStatus.admin_approved]),
        ).scalar()
        remaining = float(alloc.allocated_amount) - float(spent)
        if amount > remaining:
            return False, (
                f"Amount €{amount:.2f} exceeds remaining category allocation "
                f"€{remaining:.2f}."
            )
        return True, ""

    @staticmethod
    def record_spend(project_id: str, category_id: int, amount: float):
        """No-op here; Project.spent_budget is computed dynamically from approved expenses."""
        pass

    @staticmethod
    def get_project_budget_summary(project_id: str) -> dict:
        from ..models import Project
        project = Project.query.get(project_id)
        if not project:
            return {}

        categories_data = []
        for alloc in project.budget_allocations:
            spent = db.session.query(
                db.func.coalesce(db.func.sum(Expense.amount), 0)
            ).filter(
                Expense.project_id == project_id,
                Expense.category_id == alloc.category_id,
                Expense.status == ExpenseStatus.approved,
            ).scalar()
            categories_data.append({
                "category": alloc.category.to_dict(),
                "allocated": float(alloc.allocated_amount),
                "spent": float(spent),
                "remaining": float(alloc.allocated_amount) - float(spent),
            })

        return {
            "project_id": project_id,
            "project_code": project.code,
            "total_budget": float(project.total_budget),
            "spent_budget": project.spent_budget,
            "remaining_budget": project.remaining_budget,
            "categories": categories_data,
        }
