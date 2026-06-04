#!/usr/bin/env python
"""
Seed script — populate the DB with demo data for development.
Usage: python seed.py
"""
from app import create_app
from app.extensions import db
from app.models import (
    User, Role, Department, Project, ExpenseCategory,
    Expense, BudgetAllocation, ExpenseStatus, ProjectStatus,
    Approval, Document, AuditLog
)
from app.utils.constants import ALL_ROLES, ROLE_PERMISSIONS, DEFAULT_CATEGORIES
from datetime import date, timedelta
import random


def seed():
    app = create_app("development")
    with app.app_context():
        db.create_all()
        print("Cleaning up existing database tables to prevent unique constraint conflicts...")
        
        # Delete in order of dependency to respect foreign keys
        db.session.query(AuditLog).delete()
        db.session.query(Approval).delete()
        db.session.query(Document).delete()
        db.session.query(Expense).delete()
        db.session.query(BudgetAllocation).delete()
        
        # Clear department heads first to avoid self-reference block
        for dept in Department.query.all():
            dept.head_id = None
        db.session.flush()
        
        db.session.query(Project).delete()
        db.session.query(User).delete()
        db.session.query(Department).delete()
        db.session.query(Role).delete()
        db.session.query(ExpenseCategory).delete()
        db.session.commit()
        
        print("Tables cleared successfully.")

        # ── Roles ─────────────────────────────────────────────────
        print("Creating roles …")
        roles = {}
        for name in ALL_ROLES:
            r = Role(name=name, description=name.replace("_", " ").title(),
                     permissions=ROLE_PERMISSIONS[name])
            db.session.add(r)
            roles[name] = r
        db.session.flush()

        # ── Departments ───────────────────────────────────────────
        print("Creating departments …")
        depts_data = [
            ("Dept. of Control and Computer Engineering", "DAUIN"),
            ("Dept. of Electronics and Telecommunications", "DET"),
            ("Dept. of Mechanical Engineering", "DIMEAS"),
            ("Dept. of Applied Science and Technology", "DISAT"),
        ]
        depts = {}
        for name, code in depts_data:
            d = Department(name=name, code=code)
            db.session.add(d)
            depts[code] = d
        db.session.flush()

        # ── Categories ────────────────────────────────────────────
        print("Creating expense categories …")
        cats = {}
        for c in DEFAULT_CATEGORIES:
            cat = ExpenseCategory(**c)
            db.session.add(cat)
            cats[c["code"]] = cat
        db.session.flush()

        # ── Users ─────────────────────────────────────────────────
        print("Creating users …")

        admin = User(email="admin@polito.it", first_name="Admin",
                     last_name="Dipartimento", staff_type="admin_tab",
                     department_id=depts["DAUIN"].id, matricola="ADM001")
        admin.set_password("Admin123!")
        admin.roles.append(roles["ADMIN_DEPARTMENT"])
        db.session.add(admin)

        # Original PM
        pm = User(email="marco.rossi@polito.it", first_name="Marco",
                  last_name="Rossi", staff_type="professor_ordinario",
                  department_id=depts["DAUIN"].id, matricola="PR001")
        pm.set_password("Polito2024!")
        pm.roles.append(roles["PROJECT_MANAGER"])
        db.session.add(pm)

        # Added PM from startup guide
        pm_demo = User(email="pm@polito.it", first_name="PM",
                       last_name="Demo", staff_type="professor_ordinario",
                       department_id=depts["DAUIN"].id, matricola="PM001")
        pm_demo.set_password("Pm12345!")
        pm_demo.roles.append(roles["PROJECT_MANAGER"])
        db.session.add(pm_demo)

        fin = User(email="giulia.bianchi@polito.it", first_name="Giulia",
                   last_name="Bianchi", staff_type="admin_tab",
                   department_id=depts["DAUIN"].id, matricola="FA001")
        fin.set_password("Polito2024!")
        fin.roles.append(roles["FINANCIAL_APPROVER"])
        db.session.add(fin)

        users = [admin, pm, pm_demo, fin]
        standard_users_data = [
            ("luca.ferrari", "Luca", "Ferrari", "researcher", "DAUIN", "RES001"),
            ("anna.conti", "Anna", "Conti", "phd_student", "DAUIN", "PHD001"),
            ("roberto.gallo", "Roberto", "Gallo", "post_doc", "DET", "PD001"),
            ("sofia.marino", "Sofia", "Marino", "professor_associato", "DET", "PA001"),
        ]
        std_users = []
        for email_prefix, fn, ln, stype, dept_code, mat in standard_users_data:
            u = User(email=f"{email_prefix}@polito.it", first_name=fn,
                     last_name=ln, staff_type=stype,
                     department_id=depts[dept_code].id, matricola=mat)
            u.set_password("Polito2024!")
            u.roles.append(roles["STANDARD_USER"])
            db.session.add(u)
            std_users.append(u)
            users.append(u)
        db.session.flush()

        # Set dept heads
        depts["DAUIN"].head_id = pm.id
        depts["DET"].head_id = std_users[3].id

        # ── Projects ──────────────────────────────────────────────
        print("Creating projects …")
        projects_data = [
            ("AI for Sustainable Cities", "POLITO-2024-AI-001", 150000, "DAUIN", pm_demo),
            ("Advanced Robotics Platform", "POLITO-2024-ROB-002", 80000, "DAUIN", pm_demo),
            ("Quantum Communication Research", "POLITO-2024-QC-003", 200000, "DET", std_users[3]),
        ]
        projects = []
        for name, code, budget, dept_code, manager in projects_data:
            p = Project(
                name=name, code=code, total_budget=budget,
                department_id=depts[dept_code].id, manager_id=manager.id,
                status=ProjectStatus.active,
                start_date=date(2024, 1, 1), end_date=date(2025, 12, 31),
                funding_source="EU Horizon 2024",
            )
            db.session.add(p)
            projects.append(p)
        db.session.flush()

        # Budget allocations
        for proj in projects:
            for cat_code, pct in [("TRAVEL", 0.15), ("EQUIPMENT", 0.35),
                                   ("PERSONNEL", 0.30), ("CONSUMABLES", 0.10),
                                   ("OTHER", 0.10)]:
                ba = BudgetAllocation(
                    project_id=proj.id,
                    category_id=cats[cat_code].id,
                    allocated_amount=float(proj.total_budget) * pct,
                    fiscal_year=2024,
                )
                db.session.add(ba)

        # ── Expenses ──────────────────────────────────────────────
        print("Creating sample expenses …")
        expense_templates = [
            ("International Conference ICML 2024", 850, "TRAVEL", "CONF-2024-ICML"),
            ("GPU Server Dell PowerEdge", 4200, "EQUIPMENT", "INV-2024-001"),
            ("Research Software License (MATLAB)", 1200, "SOFTWARE", "LIC-2024-MAT"),
            ("Lab Consumables Q1", 320, "CONSUMABLES", None),
            ("Post-Doc Fellowship July 2024", 2800, "PERSONNEL", "HR-2024-PD-07"),
            ("Travel Rome Workshop", 430, "TRAVEL", "TRIP-2024-ROM"),
            ("Consulting - Data Analysis", 1500, "CONSULTING", "CONS-2024-01"),
        ]
        statuses = [
            ExpenseStatus.approved, ExpenseStatus.pm_approved,
            ExpenseStatus.submitted, ExpenseStatus.draft,
            ExpenseStatus.rejected, ExpenseStatus.approved, ExpenseStatus.under_review,
        ]
        for i, (title, amount, cat_code, ext_ref) in enumerate(expense_templates):
            submitter = std_users[i % len(std_users)]
            project = projects[i % len(projects)]
            expense_date = date(2024, (i % 12) + 1, random.randint(1, 28))
            e = Expense(
                title=title,
                description=f"Expense for {title} on project {project.code}",
                amount=amount,
                expense_date=expense_date,
                category_id=cats[cat_code].id,
                project_id=project.id,
                submitter_id=submitter.id,
                status=statuses[i],
                external_reference=ext_ref,
                receipt_required=True,
            )
            if statuses[i] != ExpenseStatus.draft:
                from datetime import datetime, timezone
                e.submitted_at = datetime.now(timezone.utc)
            if statuses[i] == ExpenseStatus.rejected:
                e.rejection_reason = "Amount exceeds approved category budget."
            db.session.add(e)

        db.session.commit()
        print("\n✅ Seed complete!")
        print("─" * 50)
        print("Demo credentials:")
        print("  Admin:             admin@polito.it       / Admin123!")
        print("  Project Manager:   pm@polito.it          / Pm12345!   (Seeded)")
        print("  Project Manager 2: marco.rossi@polito.it / Polito2024!")
        print("  Financial:         giulia.bianchi@polito.it / Polito2024!")
        print("  Standard User:     luca.ferrari@polito.it / Polito2024!")
        print("─" * 50)


if __name__ == "__main__":
    seed()
