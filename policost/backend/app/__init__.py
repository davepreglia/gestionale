import os
from flask import Flask
from dotenv import load_dotenv
load_dotenv()

from .config import config_map
from .extensions import db, migrate, jwt, cors, limiter


def create_app(env: str = None) -> Flask:
    default_env = "production" if os.environ.get("RENDER") == "true" else "development"
    env = env or os.environ.get("FLASK_ENV", default_env)
    app = Flask(__name__)
    app.config.from_object(config_map[env])

    # Normalize database URI for SQLAlchemy (replace postgres:// with postgresql://)
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI")
    if db_uri and db_uri.startswith("postgres://"):
        app.config["SQLALCHEMY_DATABASE_URI"] = db_uri.replace("postgres://", "postgresql://", 1)

    # ── Extensions ─────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    import re
    origins_str = app.config["CORS_ORIGINS"]
    if origins_str:
        origins = [o.strip() for o in origins_str.split(",")]
    else:
        origins = ["http://localhost:5173", "http://localhost:5174"]
    
    # Automatically authorize any onrender.com subdomains in production
    origins.append(re.compile(r"https://.*\.onrender\.com"))
    
    cors.init_app(app, resources={r"/api/*": {"origins": origins}},
                  supports_credentials=True)
    limiter.init_app(app)

    # ── Ensure upload folder exists ─────────────────────────────────────────
    upload_dir = os.path.join(app.root_path, "..", app.config["UPLOAD_FOLDER"])
    os.makedirs(upload_dir, exist_ok=True)

    # ── Register blueprints ─────────────────────────────────────────────────
    from .api.auth import auth_bp
    from .api.users import users_bp
    from .api.expenses import expenses_bp
    from .api.projects import projects_bp
    from .api.approvals import approvals_bp
    from .api.documents import documents_bp
    from .api.departments import departments_bp
    from .api.analytics import analytics_bp

    for bp in [auth_bp, users_bp, expenses_bp, projects_bp,
               approvals_bp, documents_bp, departments_bp, analytics_bp]:
        app.register_blueprint(bp, url_prefix="/api")

    # ── Shell context ───────────────────────────────────────────────────────
    @app.shell_context_processor
    def ctx():
        from .models import User, Role, Department, Project, Expense, Approval
        return dict(db=db, User=User, Role=Role, Department=Department,
                    Project=Project, Expense=Expense, Approval=Approval)

    return app
