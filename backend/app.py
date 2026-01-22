"""
מערכת ניהול מתכונים - Flask Application
========================================
אפליקציה מבוססת Flask לניהול מתכונים, משתמשים, דירוגים והערות.
כולל אימות משתמשים, ניהול הרשאות ו-Rate Limiting.
"""

from flask import Flask, send_from_directory, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from datetime import timedelta
from dotenv import load_dotenv

# טעינת משתני סביבה
load_dotenv()

# ייבוא ה-Blueprints והמודלים
from auth import auth_bp
from models import db, User
from ratings import ratings_bp
from recipes import recipes_bp
from favorites import favorites_bp
from comments import comments_bp

# --- הגדרות השרת וה-DB ---
app = Flask(__name__)

# הוספת CORS
"""
הגדרת CORS - Cross-Origin Resource Sharing
מאפשר לשרת לקבל בקשות מ-localhost:4200 (Angular/React dev server).
מגדיר את שיטות ה-HTTP המותרות וכותרות הבקשה המותרות.
"""
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:4200"],
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# הגדרות קונפיגורציה עם משתני סביבה
"""
הגדרות קונפיגורציה של האפליקציה:
- SECRET_KEY: מפתח סודי להצפנת Session
- JWT_SECRET_KEY: מפתח להצפנת JWT Tokens
- SQLALCHEMY_DATABASE_URI: מיקום קובץ מסד הנתונים SQLite
- JWT_ACCESS_TOKEN_EXPIRES: תוקף טוקן גישה (24 שעות)
- UPLOAD_FOLDER: תיקייה לשמירת תמונות
- MAX_CONTENT_LENGTH: הגבלת גודל קובץ מקסימלי ל-5MB
"""
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recipes_db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config['JWT_IDENTITY_CLAIM'] = 'sub'
app.config['JWT_ALGORITHM'] = 'HS256'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # מגביל גודל קובץ ל-5MB

# הגדרת Rate Limiting
"""
הגדרת Rate Limiting למניעת שימוש יתר בשרת:
- 200 בקשות ליום
- 50 בקשות לשעה
משתמש בזיכרון זמני (memory://) לאחסון המונים
"""
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# --- אתחול ספריות ---
"""
אתחול הרחבות Flask:
- db: SQLAlchemy לניהול מסד נתונים
- jwt: JWT Manager לאימות משתמשים
"""
db.init_app(app)
jwt = JWTManager(app)

# --- רישום Blueprints ---
"""
רישום Blueprints - מודולים נפרדים לכל פונקציונליות:
- auth_bp: אימות והרשמה
- recipes_bp: ניהול מתכונים
- ratings_bp: דירוגים
- favorites_bp: מועדפים
- comments_bp: הערות
"""
app.register_blueprint(auth_bp)
app.register_blueprint(recipes_bp)
app.register_blueprint(ratings_bp)
app.register_blueprint(favorites_bp)
app.register_blueprint(comments_bp)


# הגשת תמונות
@app.route('/uploads/<path:filename>')
@limiter.exempt
def serve_upload(filename):
    """
    מגיש קבצי תמונות שהועלו למערכת.

    Args:
        filename (str): שם הקובץ להגשה

    Returns:
        File: הקובץ המבוקש מתיקיית uploads
    """
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# Error handlers
@app.errorhandler(404)
def not_found(error):
    """
    מטפל בשגיאות 404 - משאב לא נמצא.

    Args:
        error: אובייקט השגיאה

    Returns:
        JSON: הודעת שגיאה וקוד סטטוס 404
    """
    return jsonify({"message": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """
    מטפל בשגיאות שרת פנימיות (500).
    מבצע rollback לעסקת מסד הנתונים במקרה של שגיאה.

    Args:
        error: אובייקט השגיאה

    Returns:
        JSON: הודעת שגיאה וקוד סטטוס 500
    """
    db.session.rollback()
    return jsonify({"message": "Internal server error"}), 500


@app.errorhandler(429)
def ratelimit_handler(e):
    """
    מטפל בחריגת מגבלת קצב הבקשות (Rate Limit).
    מוחזר כאשר משתמש עבר את מכסת הבקשות המותרת.

    Args:
        e: אובייקט השגיאה

    Returns:
        JSON: הודעת שגיאה וקוד סטטוס 429
    """
    return jsonify({"message": "Rate limit exceeded. Please try again later."}), 429


@app.errorhandler(413)
def too_large(e):
    """
    מטפל בשגיאת קובץ גדול מדי.
    מוחזר כאשר הקובץ שהועלה גדול מ-5MB.

    Args:
        e: אובייקט השגיאה

    Returns:
        JSON: הודעת שגיאה וקוד סטטוס 413
    """
    return jsonify({"message": "File too large (maximum 5MB)"}), 413


# --- פונקציות עזר ליצירת DB ומשתמש Admin ---
"""
בלוק אתחול מסד נתונים ומשתמש Admin:
1. בודק אם קובץ מסד הנתונים קיים, אם לא - יוצר אותו
2. יוצר משתמש Admin ראשוני אם לא קיים
3. פרטי Admin נשלפים ממשתני סביבה או ערכי ברירת מחדל
"""
with app.app_context():
    db_filename = 'recipes_db.sqlite'

    if not os.path.exists(db_filename):
        db.create_all()
        print(f"✅ Database {db_filename} created successfully!")

    # משתני סביבה למשתמש Admin
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@recipes.com')
    admin_password = os.getenv('ADMIN_PASSWORD', '123456')

    admin_user = User.query.filter_by(email=admin_email).first()

    if not admin_user:
        print("Creating initial Admin user...")
        admin = User(
            email=admin_email,
            username='Admin',
            role='Admin',
            is_approved_uploader=True
        )
        admin.set_password(admin_password)
        db.session.add(admin)
        db.session.commit()
        print(f"✅ Admin user created successfully with email: {admin_email}")
    else:
        print(f"✅ Admin user already exists: {admin_email}")

# --- הרצת השרת ---
"""
נקודת כניסה ראשית להרצת השרת.
מריץ את השרת במצב Debug (מתאים לפיתוח בלבד).
בסביבת ייצור יש להשתמש ב-WSGI server כמו Gunicorn.
"""
if __name__ == '__main__':
    app.run(debug=True)