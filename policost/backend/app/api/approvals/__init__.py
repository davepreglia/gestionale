from flask import Blueprint
approvals_bp = Blueprint('approvals', __name__)
from . import routes  # noqa: F401, E402
