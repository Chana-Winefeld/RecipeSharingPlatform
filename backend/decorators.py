"""
מודול דקורטורים - Decorators Module
======================================
מודול זה מכיל דקורטורים לאבטחת API endpoints:
- token_required: אימות JWT token
- admin_required: אימות token + בדיקת הרשאות Admin
"""

from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import User


# דקורטור 1: אימות טוקן ושליפת user_id
def token_required(f):
    """
    דקורטור לאימות JWT token וחילוץ user_id.

    שימוש:
        @token_required
        def my_function(user_id, ...):
            # user_id מועבר אוטומטית

    Args:
        f (function): הפונקציה המקורית

    Returns:
        function: הפונקציה המעטפת

    Notes:
        - בודק שהטוקן תקף באמצעות @jwt_required
        - מחלץ את ה-user_id מה-token
        - מעביר את user_id כפרמטר ראשון לפונקציה המקורית
        - מחזיר 401 אם הטוקן לא תקין

    Example:
        @auth_bp.route('/protected')
        @token_required
        def protected_route(user_id):
            return f"Hello user {user_id}"
    """

    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        # get_jwt_identity מחזיר את ה-identity שנקבע ב-create_access_token (שזה ה-user_id)
        current_user_id = get_jwt_identity()
        try:
            current_user_id = int(current_user_id)
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid token"}), 401

        # מעביר את ה-user_id לפונקציה המקורית
        return f(current_user_id, *args, **kwargs)

    return decorated_function


# דקורטור 2: אימות טוקן ודרישה לתפקיד 'Admin'
def admin_required(f):
    """
    דקורטור לאימות JWT token ובדיקת הרשאות Admin.

    שימוש:
        @admin_required
        def admin_only_function(...):
            # רק Admin יכול להגיע לכאן

    Args:
        f (function): הפונקציה המקורית

    Returns:
        function: הפונקציה המעטפת

    Notes:
        - בודק שהטוקן תקף
        - שולף את המשתמש מהדאטאבייס
        - בודק שהתפקיד הוא 'Admin'
        - מחזיר 401 אם הטוקן לא תקין
        - מחזיר 403 אם המשתמש לא Admin

    Example:
        @auth_bp.route('/admin/users')
        @admin_required
        def get_all_users():
            # רק מנהל יכול להגיע לכאן
            return jsonify(users_list)
    """

    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        try:
            current_user_id = int(current_user_id)
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid token"}), 401

        current_user = User.query.get(current_user_id)

        # בדיקה: אם המשתמש לא קיים או שהתפקיד שלו אינו 'Admin'
        if not current_user or current_user.role != 'Admin':
            return jsonify({
                "message": "Authorization failed: Admin role required."
            }), 403  # 403 Forbidden - גישה נדחתה

        # אם המשתמש הוא מנהל, נמשיך עם הפונקציה המקורית
        return f(*args, **kwargs)

    return decorated_function