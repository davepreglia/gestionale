from flask import Blueprint
expenses_bp = Blueprint('expenses', __name__)
from . import routes  # noqa: F401, E402
