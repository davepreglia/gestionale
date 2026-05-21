from flask import Blueprint
projects_bp = Blueprint('projects', __name__)
from . import routes  # noqa: F401, E402
