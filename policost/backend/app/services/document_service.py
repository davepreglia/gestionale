import os
from werkzeug.utils import secure_filename
from flask import current_app

from ..extensions import db
from ..models import Document, DocumentType, Expense
from ..utils.helpers import allowed_file, compute_checksum


class DocumentService:
    @staticmethod
    def upload(file, expense_id: str, uploader, file_type: str = "receipt") -> Document:
        expense = Expense.query.get(expense_id)
        if not expense:
            raise ValueError("Expense not found.")

        if file.filename == "":
            raise ValueError("No file selected.")

        allowed = current_app.config["ALLOWED_EXTENSIONS"]
        if not allowed_file(file.filename, allowed):
            raise ValueError(f"File type not allowed. Allowed: {', '.join(allowed)}")

        filename = secure_filename(file.filename)
        # Namespaced by expense ID to avoid collisions
        upload_dir = os.path.join(
            current_app.root_path, "..", current_app.config["UPLOAD_FOLDER"], expense_id
        )
        os.makedirs(upload_dir, exist_ok=True)
        stored_path = os.path.join(upload_dir, filename)
        file.save(stored_path)

        checksum = compute_checksum(stored_path)

        # Duplicate document detection
        existing = Document.query.filter_by(checksum=checksum).first()
        if existing and existing.expense_id != expense_id:
            os.remove(stored_path)
            raise ValueError(
                f"This document appears to be a duplicate of one already uploaded "
                f"for expense ID {existing.expense_id}."
            )

        doc = Document(
            expense_id=expense_id,
            uploader_id=uploader.id,
            filename=filename,
            stored_path=stored_path,
            file_type=DocumentType(file_type) if file_type in DocumentType.__members__ else DocumentType.other,
            file_size=os.path.getsize(stored_path),
            checksum=checksum,
        )
        db.session.add(doc)
        db.session.commit()
        return doc

    @staticmethod
    def get_document_path(doc_id: str) -> str:
        doc = Document.query.get(doc_id)
        if not doc:
            raise ValueError("Document not found.")
        return doc.stored_path, doc.filename
