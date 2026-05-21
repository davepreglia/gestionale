# Role name constants
ADMIN = "ADMIN_DEPARTMENT"
PROJECT_MANAGER = "PROJECT_MANAGER"
STANDARD_USER = "STANDARD_USER"
FINANCIAL_APPROVER = "FINANCIAL_APPROVER"

ALL_ROLES = [ADMIN, PROJECT_MANAGER, STANDARD_USER, FINANCIAL_APPROVER]

# Default permissions per role
ROLE_PERMISSIONS = {
    ADMIN: {
        "view_all_expenses": True,
        "create_expense": True,
        "approve_expense_pm": True,
        "approve_expense_financial": True,
        "override_approval": True,
        "manage_users": True,
        "manage_projects": True,
        "view_analytics_all": True,
        "view_analytics_own": True,
    },
    PROJECT_MANAGER: {
        "view_all_expenses": False,
        "create_expense": True,
        "approve_expense_pm": True,
        "approve_expense_financial": False,
        "override_approval": False,
        "manage_users": False,
        "manage_projects": True,
        "view_analytics_all": False,
        "view_analytics_own": True,
    },
    FINANCIAL_APPROVER: {
        "view_all_expenses": True,
        "create_expense": True,
        "approve_expense_pm": False,
        "approve_expense_financial": True,
        "override_approval": False,
        "manage_users": False,
        "manage_projects": False,
        "view_analytics_all": True,
        "view_analytics_own": True,
    },
    STANDARD_USER: {
        "view_all_expenses": False,
        "create_expense": True,
        "approve_expense_pm": False,
        "approve_expense_financial": False,
        "override_approval": False,
        "manage_users": False,
        "manage_projects": False,
        "view_analytics_all": False,
        "view_analytics_own": True,
    },
}

# Staff type labels
STAFF_TYPE_LABELS = {
    "professor_ordinario": "Full Professor",
    "professor_associato": "Associate Professor",
    "researcher": "Researcher (RTD)",
    "phd_student": "PhD Student",
    "post_doc": "Post-Doc Fellow",
    "contractor": "External Contractor",
    "admin_tab": "Administrative Staff (TAB)",
}

# Default expense categories
DEFAULT_CATEGORIES = [
    {"name": "Travel & Accommodation", "code": "TRAVEL", "requires_approval_above": 500},
    {"name": "Equipment & Instruments", "code": "EQUIPMENT", "requires_approval_above": 1000},
    {"name": "Personnel Costs", "code": "PERSONNEL", "requires_approval_above": 2000},
    {"name": "Consumables & Materials", "code": "CONSUMABLES", "requires_approval_above": 200},
    {"name": "Software & Licenses", "code": "SOFTWARE", "requires_approval_above": 500},
    {"name": "Conference & Publications", "code": "CONFERENCE", "requires_approval_above": 300},
    {"name": "Consulting & Services", "code": "CONSULTING", "requires_approval_above": 1000},
    {"name": "Other", "code": "OTHER", "requires_approval_above": None},
]
