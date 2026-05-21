from flask import Blueprint
departments_bp = Blueprint('departments', __name__)
from . import routes  # noqa: F401, E402
