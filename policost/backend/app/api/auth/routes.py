from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)

from . import auth_bp
from ...extensions import db
from ...models import User
from ...services.audit_service import AuditService
from ...utils.helpers import error_response, success_response


@auth_bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify(error_response("Email and password are required.")[0]), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify(error_response("Invalid credentials.", 401)[0]), 401

    if not user.is_active:
        return jsonify(error_response("Account is deactivated. Contact your administrator.", 403)[0]), 403

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    AuditService.log(user, "USER_LOGIN")

    return jsonify(success_response({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }, "Login successful")[0]), 200


@auth_bp.post("/auth/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify(error_response("User not found.", 401)[0]), 401
    access_token = create_access_token(identity=user_id)
    return jsonify(success_response({"access_token": access_token})[0]), 200


@auth_bp.get("/auth/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify(error_response("Not found.", 404)[0]), 404
    return jsonify(success_response(user.to_dict())[0]), 200


@auth_bp.post("/auth/impersonate")
@jwt_required()
def impersonate():
    admin_id = get_jwt_identity()
    admin_user = User.query.get(admin_id)
    
    if not admin_user or not admin_user.has_role("ADMIN_DEPARTMENT"):
        return jsonify(error_response("Unauthorized to impersonate.", 403)[0]), 403
        
    data = request.get_json(silent=True) or {}
    target_id = data.get("target_user_id")
    
    if not target_id:
        return jsonify(error_response("Target user ID is required.", 400)[0]), 400
        
    target_user = User.query.get(target_id)
    if not target_user or not target_user.is_active:
        return jsonify(error_response("Target user not found or inactive.", 404)[0]), 404
        
    # Create tokens for the target user but keep track of who is impersonating?
    # In a real app we'd add impersonator info to the JWT claims.
    # For now, we'll just log it and issue the tokens.
    AuditService.log(admin_user, f"IMPERSONATED_USER_{target_id}")
    
    access_token = create_access_token(identity=target_user.id)
    refresh_token = create_refresh_token(identity=target_user.id)
    
    return jsonify(success_response({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": target_user.to_dict(),
        "impersonated_by": admin_user.to_dict()
    }, f"Impersonating {target_user.full_name}")[0]), 200
