"""
מודול אימות משתמשים - Authentication Module
============================================
מודול זה מטפל בכל פעולות האימות והרשאות המשתמשים במערכת:
- רישום והתחברות משתמשים
- ניהול פרופילים ותמונות פרופיל
- בקשות והרשאות להעלאת תוכן
- ניהול משתמשים (Admin)
"""

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
import os
from PIL import Image
import imghdr

from flask_jwt_extended import create_access_token
from models import db, User
from decorators import token_required, admin_required

auth_bp = Blueprint('auth', __name__)


# פונקציות validation פשוטות
def validate_email(email):
    """
    בדיקת תקינות כתובת אימייל.

    Args:
        email (str): כתובת האימייל לבדיקה

    Returns:
        str: האימייל בפורמט נקי (lowercase, ללא רווחים)

    Raises:
        ValueError: אם האימייל לא תקין
    """
    if not email or '@' not in email or len(email) < 3:
        raise ValueError("Invalid email format")
    return email.lower().strip()


def validate_password(password):
    """
    בדיקת תקינות סיסמה.
    דורש לפחות 6 תווים.

    Args:
        password (str): הסיסמה לבדיקה

    Returns:
        str: הסיסמה המאומתת

    Raises:
        ValueError: אם הסיסמה קצרה מדי
    """
    if not password or len(password) < 6:
        raise ValueError("Password must be at least 6 characters")
    return password


def validate_image_file(file):
    """
    בדיקת תקינות קובץ תמונה.
    בודק גודל קובץ (מקסימום 5MB) וסוג קובץ (jpg/png/gif).

    Args:
        file: אובייקט קובץ מ-Flask request.files

    Returns:
        bool: True אם הקובץ תקין

    Raises:
        ValueError: אם הקובץ לא תקין (גודל או סוג)
    """
    if not file or not file.filename:
        raise ValueError("No file provided")

    # בדיקת גודל
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > 5 * 1024 * 1024:  # 5MB
        raise ValueError("File too large (maximum 5MB)")

    # בדיקת סוג קובץ
    header = file.read(512)
    file.seek(0)
    file_type = imghdr.what(None, header)

    if file_type not in ['jpg', 'jpeg', 'png', 'gif']:
        raise ValueError("Invalid image type (allowed: jpg, png, gif)")

    return True


def user_to_json(user):
    """
    ממיר אובייקט User לפורמט JSON.
    משמש להחזרת פרטי משתמש ב-API responses.

    Args:
        user (User): אובייקט משתמש מהדאטאבייס

    Returns:
        dict: מילון עם פרטי המשתמש
    """
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'is_approved_uploader': user.is_approved_uploader,
        'upload_request_sent': user.upload_request_sent,
        'profile_image': user.profile_image
    }


# REGISTER
@auth_bp.route('/register', methods=['POST'])
def register():
    """
    רישום משתמש חדש למערכת.

    Body Parameters (JSON):
        - username (str): שם משתמש (מינימום 2 תווים)
        - email (str): כתובת אימייל (חייבת להיות ייחודית)
        - password (str): סיסמה (מינימום 6 תווים)

    Returns:
        JSON: הודעת הצלחה וקוד 201, או הודעת שגיאה

    Notes:
        - המשתמש הראשון במערכת הופך אוטומטית ל-Admin
        - משתמשים נוספים נרשמים כ-User רגיל
    """
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email')
        password = data.get('password')

        # Validation
        if not username or len(username) < 2:
            return jsonify({"message": "Username must be at least 2 characters"}), 400

        email = validate_email(email)
        password = validate_password(password)

        # בדיקת קיום משתמש
        if User.query.filter(func.lower(User.email) == func.lower(email)).first():
            return jsonify({"message": "User with this email already exists."}), 409

        is_first_user = db.session.query(User).first() is None
        role = 'Admin' if is_first_user else 'User'
        is_approved_uploader = is_first_user

        new_user = User(
            username=username,
            email=email,
            role=role,
            is_approved_uploader=is_approved_uploader,
            upload_request_sent=False
        )
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": f"User {username} registered successfully. Role: {role}"}), 201

    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in register: {e}")
        return jsonify({"message": "Registration failed"}), 500
    except Exception as e:
        print(f"Unexpected error in register: {e}")
        return jsonify({"message": "An error occurred during registration"}), 500


# LOGIN
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    כניסה למערכת והנפקת JWT token.

    Body Parameters (JSON):
        - username/email (str): שם משתמש או אימייל
        - password (str): סיסמה

    Returns:
        JSON: טוקן גישה, פרטי משתמש וקוד 200 במקרה של הצלחה

    Notes:
        - מאפשר כניסה עם שם משתמש או אימייל
        - הטוקן תקף ל-24 שעות (מוגדר ב-app.py)
    """
    try:
        auth = request.get_json()

        identifier = auth.get('username') or auth.get('email')
        password = auth.get('password')

        if not identifier or not password:
            return jsonify({"message": "Missing username/email or password"}), 400

        user = User.query.filter_by(username=identifier).first()
        if not user:
            user = User.query.filter_by(email=identifier).first()

        if not user or not user.check_password(password):
            return jsonify({"message": "Invalid credentials"}), 401

        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'user_id': user.id,
            'username': user.username,
            'role': user.role
        })

    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({"message": "Login failed"}), 500


# GET USER DETAILS
@auth_bp.route('/user/<int:user_id>', methods=['GET'])
@token_required
def get_user_details(current_user_id, user_id):
    """
    קבלת פרטי משתמש ספציפי.

    Args:
        current_user_id (int): ID של המשתמש המחובר (מהטוקן)
        user_id (int): ID של המשתמש המבוקש

    Returns:
        JSON: פרטי המשתמש וקוד 200

    Authorization:
        - משתמש יכול לראות רק את הפרטים שלו
        - Admin יכול לראות פרטי כל משתמש
    """
    try:
        current_user = User.query.get(current_user_id)

        if current_user.id != user_id and current_user.role != 'Admin':
            return jsonify({
                "message": "Authorization failed: You can only view your own details or you must be an Admin."
            }), 403

        user = User.query.get_or_404(user_id)
        return jsonify(user_to_json(user)), 200

    except Exception as e:
        print(f"Error in get_user_details: {e}")
        return jsonify({"message": "Failed to retrieve user details"}), 500


# שליחת בקשה להרשאת העלאה
@auth_bp.route('/user/request-upload', methods=['POST'])
@token_required
def request_upload_permission(current_user_id):
    """
    שליחת בקשה להרשאת העלאת תוכן.
    משתמש רגיל יכול לבקש הרשאה להעלות מתכונים.

    Args:
        current_user_id (int): ID של המשתמש המחובר

    Returns:
        JSON: הודעת הצלחה וקוד 200

    Notes:
        - משתמש שכבר מאושר לא יכול לשלוח בקשה
        - לא ניתן לשלוח בקשה פעמיים
        - Admin יכול לאשר בקשות דרך /user/approve/<user_id>
    """
    try:
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"message": "User not found."}), 404

        if user.is_approved_uploader:
            return jsonify({"message": "You are already approved to upload."}), 400

        if user.upload_request_sent:
            return jsonify({"message": "You already sent a request."}), 400

        user.upload_request_sent = True
        db.session.commit()

        return jsonify({
            "message": "Upload request sent successfully!",
            "upload_request_sent": True
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in request_upload: {e}")
        return jsonify({"message": "Failed to send request"}), 500


# APPROVE UPLOADER - משתמש ב-admin_required
@auth_bp.route('/user/approve/<int:user_to_approve_id>', methods=['PATCH'])
@admin_required
def approve_uploader(user_to_approve_id):
    """
    אישור משתמש כמעלה תוכן (Admin בלבד).

    Args:
        user_to_approve_id (int): ID של המשתמש לאישור

    Returns:
        JSON: הודעת הצלחה וקוד 200

    Authorization:
        - נדרש תפקיד Admin (דקורטור @admin_required)

    Notes:
        - מעדכן is_approved_uploader ל-True
        - מאפס את upload_request_sent ל-False
    """
    try:
        user_to_approve = User.query.get(user_to_approve_id)
        if not user_to_approve:
            return jsonify({"message": "User to approve not found."}), 404

        user_to_approve.is_approved_uploader = True
        user_to_approve.upload_request_sent = False
        db.session.commit()

        return jsonify({
            "message": f"User {user_to_approve.username} approved as content uploader.",
            "is_approved_uploader": True
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in approve_uploader: {e}")
        return jsonify({"message": "Approval failed"}), 500


# GET ALL USERS - משתמש ב-admin_required
@auth_bp.route('/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """
    קבלת רשימת כל המשתמשים במערכת (Admin בלבד).

    Returns:
        JSON: מערך של כל המשתמשים וקוד 200

    Authorization:
        - נדרש תפקיד Admin
    """
    try:
        users = User.query.all()
        users_list = [user_to_json(user) for user in users]
        return jsonify(users_list), 200

    except Exception as e:
        print(f"Error in get_all_users: {e}")
        return jsonify({"message": "Failed to retrieve users"}), 500


# GET UPLOADER REQUESTS - משתמש ב-admin_required
@auth_bp.route('/admin/uploader_requests', methods=['GET'])
@admin_required
def get_uploader_requests():
    """
    קבלת בקשות העלאה ממתינות (Admin בלבד).
    מחזיר רק משתמשים שביקשו הרשאה אך עדיין לא אושרו.

    Returns:
        JSON: מערך של בקשות ממתינות וקוד 200

    Authorization:
        - נדרש תפקיד Admin

    Notes:
        - מסנן משתמשים עם upload_request_sent=True
        - מחזיר רק משתמשים שעדיין לא אושרו (is_approved_uploader=False)
    """
    try:
        requests = User.query.filter_by(
            upload_request_sent=True,
            is_approved_uploader=False,
            role='User'
        ).all()

        requests_list = [user_to_json(user) for user in requests]
        return jsonify(requests_list), 200

    except Exception as e:
        print(f"Error in get_uploader_requests: {e}")
        return jsonify({"message": "Failed to retrieve requests"}), 500


# עדכון פרופיל משתמש
@auth_bp.route('/user/<int:user_id>/edit', methods=['PUT'])
@token_required
def update_user_profile(current_user_id, user_id):
    """
    עדכון פרטי משתמש (שם משתמש, אימייל, סיסמה).

    Args:
        current_user_id (int): ID של המשתמש המחובר
        user_id (int): ID של המשתמש לעדכון

    Body Parameters (JSON, כולם אופציונליים):
        - username (str): שם משתמש חדש
        - email (str): אימייל חדש (חייב להיות ייחודי)
        - password (str): סיסמה חדשה

    Returns:
        JSON: הודעת הצלחה ופרטי משתמש מעודכנים

    Authorization:
        - משתמש יכול לערוך רק את הפרופיל שלו
        - Admin יכול לערוך כל פרופיל
    """
    try:
        current_user = User.query.get(current_user_id)
        if current_user.id != user_id and current_user.role != 'Admin':
            return jsonify({"message": "Authorization failed"}), 403

        user = User.query.get_or_404(user_id)
        data = request.json

        # עדכון שם משתמש
        if 'username' in data and data['username']:
            username = data['username'].strip()
            if len(username) < 2:
                return jsonify({"message": "Username too short"}), 400
            user.username = username

        # עדכון אימייל
        if 'email' in data and data['email']:
            try:
                new_email = validate_email(data['email'])
                existing = User.query.filter(
                    User.email == new_email,
                    User.id != user_id
                ).first()
                if existing:
                    return jsonify({"message": "Email already in use"}), 409
                user.email = new_email
            except ValueError as e:
                return jsonify({"message": str(e)}), 400

        # עדכון סיסמה
        if 'password' in data and data['password']:
            try:
                password = validate_password(data['password'])
                user.set_password(password)
            except ValueError as e:
                return jsonify({"message": str(e)}), 400

        db.session.commit()

        return jsonify({
            "message": "Profile updated successfully",
            "user": user_to_json(user)
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in update_user_profile: {e}")
        return jsonify({"message": "Failed to update profile"}), 500


# העלאת תמונת פרופיל
@auth_bp.route('/user/<int:user_id>/upload-profile-image', methods=['POST'])
@token_required
def upload_profile_image(current_user_id, user_id):
    """
    העלאת תמונת פרופיל למשתמש.

    Args:
        current_user_id (int): ID של המשתמש המחובר
        user_id (int): ID של המשתמש

    Form Parameters:
        - profile_image (file): קובץ תמונה (jpg/png/gif, מקסימום 5MB)

    Returns:
        JSON: הודעת הצלחה ונתיב התמונה

    Authorization:
        - משתמש יכול להעלות רק את התמונה שלו
        - Admin יכול להעלות תמונה לכל משתמש

    Notes:
        - התמונה נשמרת בתיקייה uploads/profiles/user_{user_id}/
        - התמונה מעובדת: נחתכת לריבוע, ממוזערת ל-400x400
        - תמונה קודמת נמחקת אוטומטית
    """
    try:
        current_user = User.query.get(current_user_id)
        if current_user.id != user_id and current_user.role != 'Admin':
            return jsonify({"message": "Authorization failed"}), 403

        user = User.query.get_or_404(user_id)

        if 'profile_image' not in request.files:
            return jsonify({"message": "No image file provided"}), 400

        file = request.files['profile_image']

        # Validation
        try:
            validate_image_file(file)
        except ValueError as e:
            return jsonify({"message": str(e)}), 400

        # יצירת תיקייה
        user_folder = os.path.join('uploads', 'profiles', f'user_{user_id}')
        os.makedirs(user_folder, exist_ok=True)

        # מחיקת תמונה ישנה
        if user.profile_image and os.path.exists(user.profile_image):
            try:
                os.remove(user.profile_image)
            except:
                pass

        # שמירת תמונה
        filename = f'profile_{user_id}_{os.urandom(4).hex()}.jpg'
        filepath = os.path.join(user_folder, filename)

        # עיבוד תמונה
        img = Image.open(file)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # חיתוך לריבוע
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        right = left + min_dim
        bottom = top + min_dim

        img = img.crop((left, top, right, bottom))
        img.thumbnail((400, 400))
        img.save(filepath, 'JPEG', quality=90)

        user.profile_image = filepath
        db.session.commit()

        return jsonify({
            "message": "Profile image uploaded successfully",
            "profile_image": filepath
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error uploading profile image: {e}")
        return jsonify({"message": "Failed to upload image"}), 500


# מחיקת תמונת פרופיל
@auth_bp.route('/user/<int:user_id>/delete-profile-image', methods=['DELETE'])
@token_required
def delete_profile_image(current_user_id, user_id):
    """
    מחיקת תמונת פרופיל של משתמש.

    Args:
        current_user_id (int): ID של המשתמש המחובר
        user_id (int): ID של המשתמש

    Returns:
        JSON: הודעת הצלחה וקוד 200

    Authorization:
        - משתמש יכול למחוק רק את התמונה שלו
        - Admin יכול למחוק תמונה של כל משתמש

    Notes:
        - מוחק את הקובץ מהשרת
        - מעדכן את profile_image ל-None בדאטאבייס
    """
    try:
        current_user = User.query.get(current_user_id)
        if current_user.id != user_id and current_user.role != 'Admin':
            return jsonify({"message": "Authorization failed"}), 403

        user = User.query.get_or_404(user_id)

        if not user.profile_image:
            return jsonify({"message": "No profile image to delete"}), 400

        if os.path.exists(user.profile_image):
            os.remove(user.profile_image)

        user.profile_image = None
        db.session.commit()

        return jsonify({"message": "Profile image deleted successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Error deleting profile image: {e}")
        return jsonify({"message": "Failed to delete image"}), 500