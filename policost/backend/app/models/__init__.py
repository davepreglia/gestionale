import uuid
import enum
from datetime import datetime, timezone

from ..extensions import db


def utcnow():
    return datetime.now(timezone.utc)


def gen_uuid():
    return str(uuid.uuid4())


# ── Enums ───────────────────────────────────────────────────────────────────

class StaffType(str, enum.Enum):
    professor_ordinario = "professor_ordinario"
    professor_associato = "professor_associato"
    researcher = "researcher"
    phd_student = "phd_student"
    post_doc = "post_doc"
    contractor = "contractor"
    admin_tab = "admin_tab"


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    suspended = "suspended"
    closed = "closed"


class ExpenseStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    pm_approved = "pm_approved"
    admin_approved = "admin_approved"
    approved = "approved"
    rejected = "rejected"


class ApprovalLevel(str, enum.Enum):
    project_manager = "project_manager"
    financial_admin = "financial_admin"
    override = "override"


class ApprovalAction(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    returned_for_changes = "returned_for_changes"


class DocumentType(str, enum.Enum):
    receipt = "receipt"
    invoice = "invoice"
    contract = "contract"
    other = "other"


# ── Association table: user_roles ────────────────────────────────────────────

user_roles = db.Table(
    "user_roles",
    db.Column("user_id", db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id", ondelete="CASCADE"),
              primary_key=True),
    db.Column("assigned_by", db.String(36), nullable=True),
    db.Column("assigned_at", db.DateTime(timezone=True), default=utcnow),
)


# ── Department ───────────────────────────────────────────────────────────────

class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    head_id = db.Column(db.String(36), db.ForeignKey("users.id", use_alter=True, name="fk_dept_head_id"), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    head = db.relationship("User", foreign_keys=[head_id], back_populates="headed_departments")
    users = db.relationship("User", foreign_keys="User.department_id", back_populates="department")
    projects = db.relationship("Project", back_populates="department")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "head_id": self.head_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ── Role ─────────────────────────────────────────────────────────────────────

class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    permissions = db.Column(db.JSON, default=dict)

    users = db.relationship("User", secondary=user_roles, back_populates="roles")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "permissions": self.permissions,
        }


# ── User ──────────────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    matricola = db.Column(db.String(30), unique=True, nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    staff_type = db.Column(db.Enum(StaffType), nullable=False, default=StaffType.researcher)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    department = db.relationship("Department", foreign_keys=[department_id],
                                 back_populates="users")
    headed_departments = db.relationship("Department", foreign_keys="Department.head_id",
                                         back_populates="head")
    roles = db.relationship("Role", secondary=user_roles, back_populates="users")
    expenses = db.relationship("Expense", foreign_keys="Expense.submitter_id",
                               back_populates="submitter")
    approvals = db.relationship("Approval", back_populates="approver")
    documents = db.relationship("Document", back_populates="uploader")
    managed_projects = db.relationship("Project", foreign_keys="Project.manager_id",
                                       back_populates="manager")

    def set_password(self, password: str):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

    def has_role(self, role_name: str) -> bool:
        return any(r.name == role_name for r in self.roles)

    def has_any_role(self, *role_names) -> bool:
        return any(self.has_role(r) for r in role_names)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def to_dict(self, include_roles=True):
        data = {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.full_name,
            "matricola": self.matricola,
            "department_id": self.department_id,
            "department": self.department.to_dict() if self.department else None,
            "staff_type": self.staff_type.value if self.staff_type else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
        if include_roles:
            data["roles"] = [r.to_dict() for r in self.roles]
        return data


# ── ExpenseCategory ───────────────────────────────────────────────────────────

class ExpenseCategory(db.Model):
    __tablename__ = "expense_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    description = db.Column(db.Text)
    requires_approval_above = db.Column(db.Numeric(12, 2), nullable=True)

    expenses = db.relationship("Expense", back_populates="category")
    budget_allocations = db.relationship("BudgetAllocation", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "requires_approval_above": float(self.requires_approval_above)
            if self.requires_approval_above else None,
        }


# ── Project ───────────────────────────────────────────────────────────────────

class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(300), nullable=False)
    code = db.Column(db.String(50), nullable=False, unique=True, index=True)
    description = db.Column(db.Text)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    manager_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    total_budget = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.Enum(ProjectStatus), default=ProjectStatus.active, nullable=False)
    funding_source = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    department = db.relationship("Department", back_populates="projects")
    manager = db.relationship("User", foreign_keys=[manager_id], back_populates="managed_projects")
    expenses = db.relationship("Expense", back_populates="project")
    budget_allocations = db.relationship("BudgetAllocation", back_populates="project")

    @property
    def spent_budget(self):
        return sum(
            float(e.amount) for e in self.expenses
            if e.status == ExpenseStatus.approved
        )

    @property
    def remaining_budget(self):
        return float(self.total_budget) - self.spent_budget

    def to_dict(self, include_stats=False):
        data = {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "department_id": self.department_id,
            "department": self.department.to_dict() if self.department else None,
            "manager_id": self.manager_id,
            "manager": self.manager.to_dict(include_roles=False) if self.manager else None,
            "total_budget": float(self.total_budget),
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "status": self.status.value if self.status else None,
            "funding_source": self.funding_source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_stats:
            data["spent_budget"] = self.spent_budget
            data["remaining_budget"] = self.remaining_budget
        return data


# ── BudgetAllocation ──────────────────────────────────────────────────────────

class BudgetAllocation(db.Model):
    __tablename__ = "budget_allocations"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("expense_categories.id"), nullable=False)
    allocated_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    fiscal_year = db.Column(db.Integer, nullable=True)

    project = db.relationship("Project", back_populates="budget_allocations")
    category = db.relationship("ExpenseCategory", back_populates="budget_allocations")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "category_id": self.category_id,
            "category": self.category.to_dict() if self.category else None,
            "allocated_amount": float(self.allocated_amount),
            "fiscal_year": self.fiscal_year,
        }


# ── Expense ───────────────────────────────────────────────────────────────────

class Expense(db.Model):
    __tablename__ = "expenses"
    __table_args__ = (
        db.Index("ix_expenses_project_status", "project_id", "status"),
        db.Index("ix_expenses_submitter", "submitter_id"),
    )

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), default="EUR", nullable=False)
    expense_date = db.Column(db.Date, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("expense_categories.id"), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    submitter_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.Enum(ExpenseStatus), default=ExpenseStatus.draft, nullable=False)
    rejection_reason = db.Column(db.Text, nullable=True)
    receipt_required = db.Column(db.Boolean, default=True)
    is_duplicate_flagged = db.Column(db.Boolean, default=False)
    external_reference = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    category = db.relationship("ExpenseCategory", back_populates="expenses")
    project = db.relationship("Project", back_populates="expenses")
    submitter = db.relationship("User", foreign_keys=[submitter_id], back_populates="expenses")
    approvals = db.relationship("Approval", back_populates="expense",
                                cascade="all, delete-orphan",
                                order_by="Approval.approved_at")
    documents = db.relationship("Document", back_populates="expense",
                                cascade="all, delete-orphan")

    def to_dict(self, include_details=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "amount": float(self.amount),
            "currency": self.currency,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "category_id": self.category_id,
            "category": self.category.to_dict() if self.category else None,
            "project_id": self.project_id,
            "project": {"id": self.project.id, "name": self.project.name,
                        "code": self.project.code} if self.project else None,
            "submitter_id": self.submitter_id,
            "submitter": self.submitter.to_dict(include_roles=False) if self.submitter else None,
            "status": self.status.value if self.status else None,
            "rejection_reason": self.rejection_reason,
            "receipt_required": self.receipt_required,
            "is_duplicate_flagged": self.is_duplicate_flagged,
            "external_reference": self.external_reference,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
        }
        if include_details:
            data["approvals"] = [a.to_dict() for a in self.approvals]
            data["documents"] = [d.to_dict() for d in self.documents]
        return data


# ── Approval ──────────────────────────────────────────────────────────────────

class Approval(db.Model):
    __tablename__ = "approvals"
    __table_args__ = (
        db.Index("ix_approvals_expense_level", "expense_id", "approval_level"),
    )

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.String(36), db.ForeignKey("expenses.id"), nullable=False)
    approver_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    approval_level = db.Column(db.Enum(ApprovalLevel), nullable=False)
    action = db.Column(db.Enum(ApprovalAction), nullable=False)
    comment = db.Column(db.Text, nullable=True)
    approved_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    expense = db.relationship("Expense", back_populates="approvals")
    approver = db.relationship("User", back_populates="approvals")

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "approver_id": self.approver_id,
            "approver": self.approver.to_dict(include_roles=False) if self.approver else None,
            "approval_level": self.approval_level.value if self.approval_level else None,
            "action": self.action.value if self.action else None,
            "comment": self.comment,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
        }


# ── Document ──────────────────────────────────────────────────────────────────

class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    expense_id = db.Column(db.String(36), db.ForeignKey("expenses.id"), nullable=False)
    uploader_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    stored_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.Enum(DocumentType), default=DocumentType.receipt)
    file_size = db.Column(db.Integer, nullable=True)
    checksum = db.Column(db.String(64), nullable=True, index=True)
    uploaded_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    expense = db.relationship("Expense", back_populates="documents")
    uploader = db.relationship("User", back_populates="documents")

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "uploader_id": self.uploader_id,
            "filename": self.filename,
            "file_type": self.file_type.value if self.file_type else None,
            "file_size": self.file_size,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }


# ── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=True)
    entity_id = db.Column(db.String(36), nullable=True)
    old_value = db.Column(db.JSON, nullable=True)
    new_value = db.Column(db.JSON, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(db.DateTime(timezone=True), default=utcnow, index=True)

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
