import os
from flask import request, jsonify, send_file
from flask_jwt_extended import jwt_required

from . import documents_bp
from ...models import Document, Expense
from ...middleware.rbac import get_current_user
from ...services.document_service import DocumentService
from ...utils.helpers import success_response, error_response
from ...utils.constants import ADMIN


@documents_bp.post("/documents/upload")
@jwt_required()
def upload_document():
    current = get_current_user()
    if "file" not in request.files:
        return jsonify(error_response("No file part in request.")[0]), 400

    file = request.files["file"]
    expense_id = request.form.get("expense_id")
    file_type = request.form.get("file_type", "receipt")

    if not expense_id:
        return jsonify(error_response("expense_id is required.")[0]), 400

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify(error_response("Expense not found.")[0]), 404
    if expense.submitter_id != current.id and not current.has_role(ADMIN):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    try:
        doc = DocumentService.upload(file, expense_id, current, file_type)
    except ValueError as e:
        return jsonify(error_response(str(e))[0]), 400

    return jsonify(success_response(doc.to_dict(), "Document uploaded", 201)[0]), 201


@documents_bp.get("/documents/<doc_id>")
@jwt_required()
def download_document(doc_id):
    current = get_current_user()
    doc = Document.query.get_or_404(doc_id)
    expense = doc.expense

    is_owner = expense.submitter_id == current.id
    if not (is_owner or current.has_any_role(ADMIN, "PROJECT_MANAGER", "FINANCIAL_APPROVER")):
        return jsonify(error_response("Forbidden.", 403)[0]), 403

    if not os.path.exists(doc.stored_path):
        return jsonify(error_response("File not found on server.", 404)[0]), 404

    return send_file(doc.stored_path, as_attachment=True, download_name=doc.filename)
