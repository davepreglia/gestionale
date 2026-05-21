import os
import uuid
import datetime
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

# ── PAGE SETUP & CONFIGURATION ────────────────────────────────────────────────
st.set_page_config(
    page_title="PoliSync AI - Cost Management",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), "policost", "backend", ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Custom styles for premium look
st.markdown("""
<style>
    .main {
        background-color: #f8f9fa;
    }
    .stCard {
        background-color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        margin-bottom: 20px;
        border-left: 5px solid #0056b3;
    }
    .metric-value {
        font-size: 24px;
        font-weight: bold;
        color: #2b2d42;
    }
    .metric-label {
        font-size: 14px;
        color: #8d99ae;
        text-transform: uppercase;
    }
</style>
""", unsafe_allow_html=True)

# ── TRANSLATIONS (ITALIAN & ENGLISH) ──────────────────────────────────────────
t = {
    "it": {
        "title": "PoliSync AI 🔄 Gestione Costi",
        "subtitle": "Sistema Gestionale per la rendicontazione spese di ricerca",
        "login_header": "Accedi al Sistema",
        "login_button": "Accedi",
        "logout_button": "Disconnetti",
        "login_failed": "Email o password errate.",
        "username": "Email",
        "password": "Password",
        "demo_login": "Accesso Rapido (Demo)",
        "menu_dashboard": "📊 Cruscotto Analitico",
        "menu_projects": "📁 Progetti e Budget",
        "menu_expenses": "💸 Registro Spese",
        "menu_approvals": "✅ Approvazioni Spese",
        "menu_admin": "⚙️ Admin Control Center",
        "dashboard_title": "Cruscotto Analitico - Panoramica Generale",
        "tot_budget": "Budget Totale",
        "tot_spent": "Spesa Totale (Approvata)",
        "remaining_budget": "Budget Rimanente",
        "tot_projects": "Progetti Attivi",
        "spent_by_cat": "Spese per Categoria",
        "budget_vs_spent": "Budget Allocato vs Speso per Progetto",
        "project_list": "Elenco dei Progetti",
        "new_project": "Nuovo Progetto",
        "proj_name": "Nome Progetto",
        "proj_code": "Codice Progetto",
        "proj_budget": "Budget Totale (€)",
        "proj_dept": "Dipartimento",
        "proj_manager": "Project Manager (PM)",
        "proj_source": "Fonte di Finanziamento",
        "proj_start": "Data Inizio",
        "proj_end": "Data Fine",
        "save": "Salva",
        "success_project": "Progetto creato con successo!",
        "new_expense": "Invia Nuova Spesa",
        "exp_title": "Titolo Spesa",
        "exp_amount": "Importo (€)",
        "exp_category": "Categoria di Spesa",
        "exp_project": "Progetto Associato",
        "exp_date": "Data Spesa",
        "exp_desc": "Descrizione / Giustificativo",
        "exp_receipt": "Ricevuta / Documento (PDF, PNG, JPG)",
        "success_expense": "Richiesta di spesa inserita con successo!",
        "pending_pm": "In attesa di approvazione PM",
        "pending_finance": "In attesa di approvazione Amministratore",
        "approval_queue": "Coda di Approvazione Spese",
        "approve": "Approva",
        "reject": "Rifiuta",
        "comment": "Commento / Nota",
        "no_approvals": "Non ci sono spese da approvare al momento.",
        "success_approved": "Spesa approvata con successo!",
        "success_rejected": "Spesa rifiutata.",
        "admin_title": "Controllo Amministrativo",
        "new_user": "Aggiungi Nuovo Utente",
        "first_name": "Nome",
        "last_name": "Cognome",
        "matricola": "Matricola",
        "staff_type": "Ruolo di Staff",
        "user_role": "Privilegio Applicativo",
        "success_user": "Nuovo utente creato con successo!",
        "new_dept": "Nuovo Dipartimento",
        "dept_name": "Nome Dipartimento",
        "dept_code": "Codice Dipartimento",
        "success_dept": "Dipartimento creato!",
        "new_cat": "Nuova Categoria di Spesa",
        "cat_name": "Nome Categoria",
        "cat_code": "Codice Categoria",
        "cat_limit": "Soglia approvazione sopra (€)",
        "success_cat": "Categoria creata!",
        "upload_receipt_warning": "Si prega di caricare una ricevuta per questa spesa.",
        "spent_by_dept": "Spese per Dipartimento",
        "user_profile": "Profilo Utente",
        "status_draft": "Bozza",
        "status_submitted": "Inviata",
        "status_under_review": "In Revisione",
        "status_pm_approved": "Approvata da PM",
        "status_admin_approved": "Approvata da Admin",
        "status_approved": "Approvata Definitivamente",
        "status_rejected": "Rifiutata"
    },
    "en": {
        "title": "PoliSync AI 🔄 Cost Management",
        "subtitle": "Research Expense Reporting & Control System",
        "login_header": "System Access",
        "login_button": "Log In",
        "logout_button": "Log Out",
        "login_failed": "Invalid email or password.",
        "username": "Email",
        "password": "Password",
        "demo_login": "Quick Access (Demo)",
        "menu_dashboard": "📊 Dashboard",
        "menu_projects": "📁 Projects & Budgets",
        "menu_expenses": "💸 Expense Registry",
        "menu_approvals": "✅ Expense Approvals",
        "menu_admin": "⚙️ Admin Control Center",
        "dashboard_title": "Analytical Dashboard - Overview",
        "tot_budget": "Total Budget",
        "tot_spent": "Total Spent (Approved)",
        "remaining_budget": "Remaining Budget",
        "tot_projects": "Active Projects",
        "spent_by_cat": "Expenses by Category",
        "budget_vs_spent": "Budget Allocated vs Spent by Project",
        "project_list": "Projects List",
        "new_project": "New Project",
        "proj_name": "Project Name",
        "proj_code": "Project Code",
        "proj_budget": "Total Budget (€)",
        "proj_dept": "Department",
        "proj_manager": "Project Manager (PM)",
        "proj_source": "Funding Source",
        "proj_start": "Start Date",
        "proj_end": "End Date",
        "save": "Save",
        "success_project": "Project created successfully!",
        "new_expense": "Submit New Expense",
        "exp_title": "Expense Title",
        "exp_amount": "Amount (€)",
        "exp_category": "Expense Category",
        "exp_project": "Associated Project",
        "exp_date": "Expense Date",
        "exp_desc": "Description / Justification",
        "exp_receipt": "Receipt / Document (PDF, PNG, JPG)",
        "success_expense": "Expense request submitted successfully!",
        "pending_pm": "Awaiting PM Approval",
        "pending_finance": "Awaiting Admin Approval",
        "approval_queue": "Expense Approval Queue",
        "approve": "Approve",
        "reject": "Reject",
        "comment": "Comment / Note",
        "no_approvals": "There are no expenses waiting for approval.",
        "success_approved": "Expense approved successfully!",
        "success_rejected": "Expense rejected.",
        "admin_title": "Admin Settings",
        "new_user": "Add New User",
        "first_name": "First Name",
        "last_name": "Last Name",
        "matricola": "ID Number",
        "staff_type": "Staff Type",
        "user_role": "Application Privilege",
        "success_user": "New user created successfully!",
        "new_dept": "New Department",
        "dept_name": "Department Name",
        "dept_code": "Department Code",
        "success_dept": "Department created!",
        "new_cat": "New Expense Category",
        "cat_name": "Category Name",
        "cat_code": "Category Code",
        "cat_limit": "Approval limit above (€)",
        "success_cat": "Category created!",
        "upload_receipt_warning": "Please upload a receipt for this expense.",
        "spent_by_dept": "Expenses by Department",
        "user_profile": "User Profile",
        "status_draft": "Draft",
        "status_submitted": "Submitted",
        "status_under_review": "Under Review",
        "status_pm_approved": "PM Approved",
        "status_admin_approved": "Admin Approved",
        "status_approved": "Fully Approved",
        "status_rejected": "Rejected"
    }
}

# ── DATABASE ENGINE CONNECTION ────────────────────────────────────────────────
@st.cache_resource
def get_engine():
    # Attempt to read DATABASE_URL from system environment (populated by dotenv)
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Fallback to local default development postgres url
        db_url = "postgresql://policost_user:policost_pass@localhost:5432/policost_db"
    
    # Check if running in Streamlit Cloud and secrets are configured
    if "DATABASE_URL" in st.secrets:
        db_url = st.secrets["DATABASE_URL"]
        
    try:
        engine = create_engine(db_url)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except Exception as e:
        # SQLite backup in case PostgreSQL is offline
        st.sidebar.warning("⚠️ PostgreSQL offline, using mock SQLite database for preview.")
        sqlite_engine = create_engine("sqlite:///mock_policost.db")
        # Initialize basic tables if it's new
        with sqlite_engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS departments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    code TEXT UNIQUE NOT NULL,
                    head_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    permissions TEXT
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    matricola TEXT,
                    department_id INTEGER,
                    staff_type TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_roles (
                    user_id TEXT,
                    role_id INTEGER,
                    PRIMARY KEY(user_id, role_id)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS expense_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    code TEXT UNIQUE NOT NULL,
                    description TEXT,
                    requires_approval_above DECIMAL
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    code TEXT UNIQUE NOT NULL,
                    description TEXT,
                    department_id INTEGER,
                    manager_id TEXT,
                    total_budget DECIMAL,
                    start_date DATE,
                    end_date DATE,
                    status TEXT,
                    funding_source TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS expenses (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    amount DECIMAL NOT NULL,
                    currency TEXT DEFAULT 'EUR',
                    expense_date DATE NOT NULL,
                    category_id INTEGER,
                    project_id TEXT,
                    submitter_id TEXT,
                    status TEXT,
                    rejection_reason TEXT,
                    receipt_required BOOLEAN DEFAULT 1,
                    is_duplicate_flagged BOOLEAN DEFAULT 0,
                    external_reference TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS approvals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    expense_id TEXT,
                    approver_id TEXT,
                    approval_level TEXT,
                    action TEXT,
                    comment TEXT,
                    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    expense_id TEXT,
                    uploader_id TEXT,
                    filename TEXT,
                    stored_path TEXT,
                    file_type TEXT,
                    file_size INTEGER,
                    checksum TEXT,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            # Seed mock SQLite data if tables are empty
            r = conn.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            if r[0] == 0:
                conn.execute(text("""
                    INSERT INTO departments (id, name, code) VALUES 
                    (1, 'Dept. of Control and Computer Engineering', 'DAUIN'),
                    (2, 'Dept. of Electronics and Telecommunications', 'DET');
                """))
                conn.execute(text("""
                    INSERT INTO roles (id, name, description) VALUES 
                    (1, 'ADMIN_DEPARTMENT', 'Admin Department'),
                    (2, 'PROJECT_MANAGER', 'Project Manager'),
                    (3, 'FINANCIAL_APPROVER', 'Financial Approver'),
                    (4, 'STANDARD_USER', 'Standard User');
                """))
                # Passwords are: Admin123!, Pm12345!, Polito2024!
                admin_pw = generate_password_hash("Admin123!")
                pm_pw = generate_password_hash("Pm12345!")
                fin_pw = generate_password_hash("Polito2024!")
                
                conn.execute(text(f"""
                    INSERT INTO users (id, email, password_hash, first_name, last_name, staff_type, department_id, matricola) VALUES 
                    ('u1', 'admin@polito.it', '{admin_pw}', 'Admin', 'Dipartimento', 'admin_tab', 1, 'ADM001'),
                    ('u2', 'pm@polito.it', '{pm_pw}', 'PM', 'Demo', 'professor_ordinario', 1, 'PM001'),
                    ('u3', 'giulia.bianchi@polito.it', '{fin_pw}', 'Giulia', 'Bianchi', 'admin_tab', 1, 'FA001');
                """))
                conn.execute(text("""
                    INSERT INTO user_roles (user_id, role_id) VALUES 
                    ('u1', 1), ('u2', 2), ('u3', 3);
                """))
                conn.execute(text("""
                    INSERT INTO expense_categories (id, name, code, requires_approval_above) VALUES 
                    (1, 'Travel', 'TRAVEL', 500),
                    (2, 'Equipment', 'EQUIPMENT', 2000),
                    (3, 'Personnel', 'PERSONNEL', 5000),
                    (4, 'Consumables', 'CONSUMABLES', 300);
                """))
                conn.execute(text("""
                    INSERT INTO projects (id, name, code, total_budget, department_id, manager_id, status) VALUES 
                    ('p1', 'AI for Sustainable Cities', 'POLITO-2024-AI-001', 150000.00, 1, 'u2', 'active'),
                    ('p2', 'Advanced Robotics Platform', 'POLITO-2024-ROB-002', 80000.00, 1, 'u2', 'active');
                """))
                conn.execute(text("""
                    INSERT INTO expenses (id, title, description, amount, expense_date, category_id, project_id, submitter_id, status) VALUES 
                    ('e1', 'International Conference', 'Travel to ICML', 850.00, '2024-05-10', 1, 'p1', 'u2', 'pm_approved'),
                    ('e2', 'GPU server', 'For neural network models', 4200.00, '2024-04-15', 2, 'p1', 'u2', 'approved');
                """))
            conn.commit()
        return sqlite_engine

engine = get_engine()

# Helper function to execute queries safely
def run_query(query, params=None):
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        if result.returns_rows:
            return pd.DataFrame(result.fetchall(), columns=result.keys())
        conn.commit()
        return None

def execute_statement(stmt, params=None):
    with engine.begin() as conn:
        conn.execute(text(stmt), params or {})

# ── SESSION STATE INITIALIZATION ──────────────────────────────────────────────
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "user" not in st.session_state:
    st.session_state.user = None
if "roles" not in st.session_state:
    st.session_state.roles = []
if "lang" not in st.session_state:
    st.session_state.lang = "it"

# ── LANGUAGE CHOICE ───────────────────────────────────────────────────────────
lang = st.sidebar.selectbox("🌐 Lingua / Language", ["Italiano", "English"], 
                            index=0 if st.session_state.lang == "it" else 1)
st.session_state.lang = "it" if lang == "Italiano" else "en"
curr_trans = t[st.session_state.lang]

# ── AUTHENTICATION FUNCTIONS ──────────────────────────────────────────────────
def check_login(email, password):
    # Query user details
    query = """
        SELECT u.*, GROUP_CONCAT(r.name) as role_names 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = :email
        GROUP BY u.id
    """
    # Adjust role concat for PostgreSQL vs SQLite
    if "postgresql" in engine.driver:
        query = """
            SELECT u.*, string_agg(r.name, ',') as role_names 
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.email = :email
            GROUP BY u.id
        """
    df = run_query(query, {"email": email})
    
    if len(df) > 0:
        pw_hash = df.iloc[0]["password_hash"]
        if check_password_hash(pw_hash, password):
            user_data = df.iloc[0].to_dict()
            st.session_state.logged_in = True
            st.session_state.user = user_data
            roles = [r.strip() for r in (user_data["role_names"] or "").split(",") if r.strip()]
            st.session_state.roles = roles
            return True
    return False

# ── LOGIN PAGE ────────────────────────────────────────────────────────────────
if not st.session_state.logged_in:
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(f"<h1 style='text-align: center;'>{curr_trans['title']}</h1>", unsafe_allow_html=True)
        st.markdown(f"<p style='text-align: center; color: #6c757d;'>{curr_trans['subtitle']}</p>", unsafe_allow_html=True)
        
        with st.form("login_form"):
            st.subheader(curr_trans["login_header"])
            email_input = st.text_input(curr_trans["username"])
            pass_input = st.text_input(curr_trans["password"], type="password")
            submitted = st.form_submit_button(curr_trans["login_button"])
            
            if submitted:
                if check_login(email_input, pass_input):
                    st.success("Accesso eseguito!")
                    st.rerun()
                else:
                    st.error(curr_trans["login_failed"])
        
        # Demo Quick Access Card
        st.markdown("---")
        st.subheader(curr_trans["demo_login"])
        col_demo1, col_demo2, col_demo3 = st.columns(3)
        with col_demo1:
            if st.button("Admin"):
                if check_login("admin@polito.it", "Admin123!"):
                    st.rerun()
        with col_demo2:
            if st.button("Project Manager"):
                if check_login("pm@polito.it", "Pm12345!"):
                    st.rerun()
        with col_demo3:
            if st.button("Finance Admin"):
                if check_login("giulia.bianchi@polito.it", "Polito2024!"):
                    st.rerun()
    st.stop()

# ── APP LAYOUT & SIDEBAR ──────────────────────────────────────────────────────
user = st.session_state.user
roles = st.session_state.roles

st.sidebar.markdown(f"### {curr_trans['title']}")
st.sidebar.write(f"🧑 **{user['first_name']} {user['last_name']}**")
st.sidebar.write(f"📧 `{user['email']}`")
st.sidebar.write(f"🎭 Ruoli: `{', '.join(roles)}`")

# Navigation Menu
menu_options = [
    curr_trans["menu_dashboard"],
    curr_trans["menu_projects"],
    curr_trans["menu_expenses"]
]

# Add specific menu based on roles
has_approver_privilege = "PROJECT_MANAGER" in roles or "FINANCIAL_APPROVER" in roles or "ADMIN_DEPARTMENT" in roles
if has_approver_privilege:
    menu_options.append(curr_trans["menu_approvals"])

if "ADMIN_DEPARTMENT" in roles:
    menu_options.append(curr_trans["menu_admin"])

st.sidebar.markdown("---")
selected_menu = st.sidebar.radio("Navigazione", menu_options)

st.sidebar.markdown("---")
if st.sidebar.button(curr_trans["logout_button"]):
    st.session_state.logged_in = False
    st.session_state.user = None
    st.session_state.roles = []
    st.rerun()

# ── SUBPAGE: DASHBOARD / CRUSCOTTO ────────────────────────────────────────────
if selected_menu == curr_trans["menu_dashboard"]:
    st.title(curr_trans["dashboard_title"])
    
    # Query summary metrics
    # Approved amount is mapped to 'approved' status
    budget_data = run_query("SELECT SUM(total_budget) as tot_b, COUNT(*) as proj_c FROM projects WHERE status = 'active'")
    spent_data = run_query("SELECT SUM(amount) as tot_s FROM expenses WHERE status = 'approved'")
    
    tot_b = float(budget_data.iloc[0]["tot_b"] or 0.0)
    proj_c = int(budget_data.iloc[0]["proj_c"] or 0)
    tot_s = float(spent_data.iloc[0]["tot_s"] or 0.0)
    rem_b = tot_b - tot_s
    
    # Print metrics
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(f"""
        <div class="stCard">
            <div class="metric-label">{curr_trans['tot_budget']}</div>
            <div class="metric-value">€ {tot_b:,.2f}</div>
        </div>
        """, unsafe_allow_html=True)
    with m2:
        st.markdown(f"""
        <div class="stCard">
            <div class="metric-label">{curr_trans['tot_spent']}</div>
            <div class="metric-value">€ {tot_s:,.2f}</div>
        </div>
        """, unsafe_allow_html=True)
    with m3:
        st.markdown(f"""
        <div class="stCard">
            <div class="metric-label">{curr_trans['remaining_budget']}</div>
            <div class="metric-value">€ {rem_b:,.2f}</div>
        </div>
        """, unsafe_allow_html=True)
    with m4:
        st.markdown(f"""
        <div class="stCard">
            <div class="metric-label">{curr_trans['tot_projects']}</div>
            <div class="metric-value">{proj_c}</div>
        </div>
        """, unsafe_allow_html=True)
        
    # Visual Analytics Section
    st.markdown("### Analisi Grafica / Graphical Analysis")
    
    col_g1, col_g2 = st.columns(2)
    
    with col_g1:
        # Expenses by category chart
        cat_df = run_query("""
            SELECT ec.name as category_name, SUM(e.amount) as total_amount
            FROM expenses e
            JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.status = 'approved'
            GROUP BY ec.name
        """)
        
        if len(cat_df) > 0:
            fig_pie = px.pie(cat_df, values='total_amount', names='category_name', 
                             title=curr_trans['spent_by_cat'], hole=0.4,
                             color_discrete_sequence=px.colors.qualitative.Pastel)
            fig_pie.update_layout(showlegend=True)
            st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.info("Nessuna spesa approvata disponibile per i grafici.")
            
    with col_g2:
        # Budget vs Spent per project
        proj_spent_df = run_query("""
            SELECT p.code as project_code, p.total_budget,
            COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as spent
            FROM projects p
            LEFT JOIN expenses e ON p.id = e.project_id
            GROUP BY p.id, p.code, p.total_budget
        """)
        
        if len(proj_spent_df) > 0:
            fig_bar = go.Figure(data=[
                go.Bar(name='Allocated Budget', x=proj_spent_df['project_code'], y=proj_spent_df['total_budget'], marker_color='#0056b3'),
                go.Bar(name='Spent', x=proj_spent_df['project_code'], y=proj_spent_df['spent'], marker_color='#e63946')
            ])
            fig_bar.update_layout(barmode='group', title=curr_trans['budget_vs_spent'], xaxis_title="Progetto / Project", yaxis_title="€")
            st.plotly_chart(fig_bar, use_container_width=True)

# ── SUBPAGE: PROJECTS & BUDGETS ───────────────────────────────────────────────
elif selected_menu == curr_trans["menu_projects"]:
    st.title(curr_trans["project_list"])
    
    # Query projects with manager details
    projects_df = run_query("""
        SELECT p.id, p.name, p.code, p.total_budget, p.status, p.funding_source,
               u.first_name || ' ' || u.last_name as pm_name,
               d.name as dept_name
        FROM projects p
        LEFT JOIN users u ON p.manager_id = u.id
        LEFT JOIN departments d ON p.department_id = d.id
    """)
    
    st.dataframe(projects_df, use_container_width=True, hide_index=True)
    
    # Create project if Admin or Project Manager
    if "ADMIN_DEPARTMENT" in roles or "PROJECT_MANAGER" in roles:
        st.markdown("---")
        with st.expander(f"➕ {curr_trans['new_project']}", expanded=False):
            with st.form("new_project_form"):
                p_name = st.text_input(curr_trans["proj_name"])
                p_code = st.text_input(curr_trans["proj_code"])
                p_budget = st.number_input(curr_trans["proj_budget"], min_value=0.0, step=1000.0)
                
                # Fetch departments for selectbox
                depts = run_query("SELECT id, name FROM departments")
                dept_dict = dict(zip(depts['name'], depts['id']))
                p_dept = st.selectbox(curr_trans["proj_dept"], list(dept_dict.keys()))
                
                # Fetch PMs for selectbox
                pms = run_query("""
                    SELECT u.id, u.first_name || ' ' || u.last_name as name 
                    FROM users u
                    JOIN user_roles ur ON u.id = ur.user_id
                    JOIN roles r ON ur.role_id = r.id
                    WHERE r.name = 'PROJECT_MANAGER'
                """)
                pm_dict = dict(zip(pms['name'], pms['id']))
                p_pm = st.selectbox(curr_trans["proj_manager"], list(pm_dict.keys()))
                
                p_source = st.text_input(curr_trans["proj_source"])
                p_start = st.date_input(curr_trans["proj_start"])
                p_end = st.date_input(curr_trans["proj_end"])
                
                proj_submitted = st.form_submit_button(curr_trans["save"])
                
                if proj_submitted:
                    new_id = str(uuid.uuid4())
                    execute_statement("""
                        INSERT INTO projects (id, name, code, total_budget, department_id, manager_id, funding_source, start_date, end_date, status)
                        VALUES (:id, :name, :code, :budget, :dept_id, :pm_id, :source, :start, :end, 'active')
                    """, {
                        "id": new_id, "name": p_name, "code": p_code, "budget": p_budget,
                        "dept_id": int(dept_dict[p_dept]), "pm_id": pm_dict[p_pm], "source": p_source,
                        "start": p_start, "end": p_end
                    })
                    st.success(curr_trans["success_project"])
                    st.rerun()

# ── SUBPAGE: EXPENSE REGISTRY ─────────────────────────────────────────────────
elif selected_menu == curr_trans["menu_expenses"]:
    st.title(curr_trans["menu_expenses"])
    
    # Query all expenses
    expenses_df = run_query("""
        SELECT e.id, e.title, e.amount, e.expense_date, e.status,
               ec.name as category_name, p.name as project_name,
               u.first_name || ' ' || u.last_name as submitter_name
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN users u ON e.submitter_id = u.id
        ORDER BY e.expense_date DESC
    """)
    
    st.dataframe(expenses_df, use_container_width=True, hide_index=True)
    
    st.markdown("---")
    st.subheader(curr_trans["new_expense"])
    
    with st.form("new_expense_form", clear_on_submit=True):
        e_title = st.text_input(curr_trans["exp_title"])
        e_amount = st.number_input(curr_trans["exp_amount"], min_value=0.01, step=10.0)
        
        # Categories SelectBox
        cats = run_query("SELECT id, name FROM expense_categories")
        cat_dict = dict(zip(cats['name'], cats['id']))
        e_cat = st.selectbox(curr_trans["exp_category"], list(cat_dict.keys()))
        
        # Projects SelectBox
        projs = run_query("SELECT id, name FROM projects WHERE status = 'active'")
        proj_dict = dict(zip(projs['name'], projs['id']))
        e_proj = st.selectbox(curr_trans["exp_project"], list(proj_dict.keys()))
        
        e_date = st.date_input(curr_trans["exp_date"])
        e_desc = st.text_area(curr_trans["exp_desc"])
        
        uploaded_file = st.file_uploader(curr_trans["exp_receipt"], type=["pdf", "png", "jpg", "jpeg"])
        
        exp_submitted = st.form_submit_button(curr_trans["save"])
        
        if exp_submitted:
            if not uploaded_file:
                st.warning(curr_trans["upload_receipt_warning"])
            else:
                new_exp_id = str(uuid.uuid4())
                # Save receipt metadata
                upload_dir = os.path.join(os.path.dirname(__file__), "policost", "backend", "uploads")
                os.makedirs(upload_dir, exist_ok=True)
                
                stored_path = os.path.join(upload_dir, f"{new_exp_id}_{uploaded_file.name}")
                with open(stored_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())
                
                # Insert expense with status 'submitted'
                execute_statement("""
                    INSERT INTO expenses (id, title, description, amount, expense_date, category_id, project_id, submitter_id, status)
                    VALUES (:id, :title, :desc, :amount, :date, :cat_id, :proj_id, :sub_id, 'submitted')
                """, {
                    "id": new_exp_id, "title": e_title, "desc": e_desc, "amount": e_amount,
                    "date": e_date, "cat_id": int(cat_dict[e_cat]), "proj_id": proj_dict[e_proj],
                    "sub_id": user["id"]
                })
                
                # Insert document metadata
                execute_statement("""
                    INSERT INTO documents (id, expense_id, uploader_id, filename, stored_path, file_type, file_size)
                    VALUES (:doc_id, :exp_id, :up_id, :filename, :path, 'receipt', :size)
                """, {
                    "doc_id": str(uuid.uuid4()), "exp_id": new_exp_id, "up_id": user["id"],
                    "filename": uploaded_file.name, "path": stored_path, "size": uploaded_file.size
                })
                
                st.success(curr_trans["success_expense"])
                st.rerun()

# ── SUBPAGE: EXPENSE APPROVALS ────────────────────────────────────────────────
elif selected_menu == curr_trans["menu_approvals"]:
    st.title(curr_trans["approval_queue"])
    
    # Formulate status query depending on the current user role
    # PMs approve 'submitted' expenses for their projects -> advances to 'pm_approved'
    # Financial Approvers / Admins approve 'pm_approved' expenses -> advances to 'approved'
    
    pending_query = ""
    target_status = ""
    app_level = ""
    next_status_ok = ""
    
    if "PROJECT_MANAGER" in roles:
        # Show expenses under projects managed by current PM
        pending_query = """
            SELECT e.id, e.title, e.amount, e.expense_date, e.description,
                   ec.name as category_name, p.name as project_name, p.code as project_code,
                   u.first_name || ' ' || u.last_name as submitter_name
            FROM expenses e
            JOIN projects p ON e.project_id = p.id
            JOIN expense_categories ec ON e.category_id = ec.id
            JOIN users u ON e.submitter_id = u.id
            WHERE e.status = 'submitted' AND p.manager_id = :manager_id
        """
        target_status = "submitted"
        app_level = "project_manager"
        next_status_ok = "pm_approved"
    elif "FINANCIAL_APPROVER" in roles or "ADMIN_DEPARTMENT" in roles:
        # Financial Approver approves globally PM-approved tasks
        pending_query = """
            SELECT e.id, e.title, e.amount, e.expense_date, e.description,
                   ec.name as category_name, p.name as project_name, p.code as project_code,
                   u.first_name || ' ' || u.last_name as submitter_name
            FROM expenses e
            JOIN projects p ON e.project_id = p.id
            JOIN expense_categories ec ON e.category_id = ec.id
            JOIN users u ON e.submitter_id = u.id
            WHERE e.status = 'pm_approved'
        """
        target_status = "pm_approved"
        app_level = "financial_admin"
        next_status_ok = "approved"
        
    if pending_query:
        pending_df = run_query(pending_query, {"manager_id": user["id"]})
        
        if len(pending_df) == 0:
            st.info(curr_trans["no_approvals"])
        else:
            for idx, row in pending_df.iterrows():
                with st.expander(f"📝 {row['title']} - € {row['amount']:.2f} (da: {row['submitter_name']})"):
                    st.write(f"📁 **Progetto:** {row['project_name']} ({row['project_code']})")
                    st.write(f"🏷️ **Categoria:** {row['category_name']}")
                    st.write(f"📅 **Data Spesa:** {row['expense_date']}")
                    st.write(f"💬 **Motivazione:** {row['description']}")
                    
                    # Fetch and show download links for receipts if any
                    docs_df = run_query("SELECT filename, stored_path FROM documents WHERE expense_id = :exp_id", {"exp_id": row["id"]})
                    if len(docs_df) > 0:
                        st.write("📄 **Ricevuta:**")
                        for d_idx, doc_row in docs_df.iterrows():
                            # Give standard download file
                            if os.path.exists(doc_row["stored_path"]):
                                with open(doc_row["stored_path"], "rb") as file_bytes:
                                    st.download_button(
                                        label=f"⬇️ {doc_row['filename']}",
                                        data=file_bytes.read(),
                                        file_name=doc_row["filename"],
                                        key=f"dl_{row['id']}_{d_idx}"
                                    )
                    
                    # Action form
                    with st.form(key=f"approve_form_{row['id']}"):
                        note = st.text_area(curr_trans["comment"])
                        col_btn1, col_btn2 = st.columns(2)
                        
                        with col_btn1:
                            btn_app = st.form_submit_button(curr_trans["approve"])
                        with col_btn2:
                            btn_rej = st.form_submit_button(curr_trans["reject"])
                            
                        if btn_app:
                            # Update status and save approval record
                            execute_statement("""
                                UPDATE expenses SET status = :next_status WHERE id = :exp_id
                            """, {"next_status": next_status_ok, "exp_id": row["id"]})
                            
                            execute_statement("""
                                INSERT INTO approvals (expense_id, approver_id, approval_level, action, comment)
                                VALUES (:exp_id, :app_id, :level, 'approved', :comment)
                            """, {"exp_id": row["id"], "app_id": user["id"], "level": app_level, "comment": note})
                            
                            st.success(curr_trans["success_approved"])
                            st.rerun()
                            
                        elif btn_rej:
                            # Reject expense
                            execute_statement("""
                                UPDATE expenses SET status = 'rejected', rejection_reason = :reason WHERE id = :exp_id
                            """, {"reason": note, "exp_id": row["id"]})
                            
                            execute_statement("""
                                INSERT INTO approvals (expense_id, approver_id, approval_level, action, comment)
                                VALUES (:exp_id, :app_id, :level, 'rejected', :comment)
                            """, {"exp_id": row["id"], "app_id": user["id"], "level": app_level, "comment": note})
                            
                            st.error(curr_trans["success_rejected"])
                            st.rerun()
    else:
        st.info("I tuoi ruoli non hanno permessi per approvare spese.")

# ── SUBPAGE: ADMIN CONTROL CENTER ─────────────────────────────────────────────
elif selected_menu == curr_trans["menu_admin"] and "ADMIN_DEPARTMENT" in roles:
    st.title(curr_trans["admin_title"])
    
    tab_users, tab_depts, tab_cats = st.tabs([
        curr_trans["new_user"],
        curr_trans["new_dept"],
        curr_trans["new_cat"]
    ])
    
    with tab_users:
        st.subheader(curr_trans["new_user"])
        with st.form("new_user_form"):
            u_email = st.text_input("Email")
            u_pass = st.text_input("Password", type="password")
            u_fname = st.text_input(curr_trans["first_name"])
            u_lname = st.text_input(curr_trans["last_name"])
            u_mat = st.text_input(curr_trans["matricola"])
            
            # Staff Types
            staff_options = ["professor_ordinario", "professor_associato", "researcher", "phd_student", "post_doc", "contractor", "admin_tab"]
            u_staff = st.selectbox(curr_trans["staff_type"], staff_options)
            
            # Departments
            depts = run_query("SELECT id, name FROM departments")
            dept_dict = dict(zip(depts['name'], depts['id']))
            u_dept = st.selectbox(curr_trans["proj_dept"], list(dept_dict.keys()))
            
            # Application privilege (Role assignment)
            roles_df = run_query("SELECT id, name FROM roles")
            role_dict = dict(zip(roles_df['name'], roles_df['id']))
            u_role = st.selectbox(curr_trans["user_role"], list(role_dict.keys()))
            
            user_btn = st.form_submit_button(curr_trans["save"])
            
            if user_btn:
                new_user_id = str(uuid.uuid4())
                hashed = generate_password_hash(u_pass)
                # Create user
                execute_statement("""
                    INSERT INTO users (id, email, password_hash, first_name, last_name, matricola, staff_type, department_id, is_active)
                    VALUES (:id, :email, :pw, :fn, :ln, :mat, :staff, :dept_id, 1)
                """, {
                    "id": new_user_id, "email": u_email, "pw": hashed, "fn": u_fname, "ln": u_lname,
                    "mat": u_mat, "staff": u_staff, "dept_id": int(dept_dict[u_dept])
                })
                
                # Assign role
                execute_statement("""
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (:user_id, :role_id)
                """, {"user_id": new_user_id, "role_id": int(role_dict[u_role])})
                
                st.success(curr_trans["success_user"])
                st.rerun()
                
    with tab_depts:
        st.subheader(curr_trans["new_dept"])
        with st.form("new_dept_form"):
            d_name = st.text_input(curr_trans["dept_name"])
            d_code = st.text_input(curr_trans["dept_code"])
            
            dept_btn = st.form_submit_button(curr_trans["save"])
            
            if dept_btn:
                execute_statement("""
                    INSERT INTO departments (name, code) VALUES (:name, :code)
                """, {"name": d_name, "code": d_code})
                st.success(curr_trans["success_dept"])
                st.rerun()
                
    with tab_cats:
        st.subheader(curr_trans["new_cat"])
        with st.form("new_cat_form"):
            c_name = st.text_input(curr_trans["cat_name"])
            c_code = st.text_input(curr_trans["cat_code"])
            c_limit = st.number_input(curr_trans["cat_limit"], min_value=0.0, step=100.0)
            
            cat_btn = st.form_submit_button(curr_trans["save"])
            
            if cat_btn:
                execute_statement("""
                    INSERT INTO expense_categories (name, code, requires_approval_above)
                    VALUES (:name, :code, :limit)
                """, {"name": c_name, "code": c_code, "limit": c_limit})
                st.success(curr_trans["success_cat"])
                st.rerun()
