"""
מודל מסד נתונים - Database Models
====================================
מודול זה מגדיר את כל מבני הנתונים (טבלאות) במערכת:
- User: משתמשים
- Recipe: מתכונים
- Ingredient: מרכיבים
- IngredientEntry: קשר בין מתכון למרכיב
- Rating: דירוגים
- Favorite: מועדפים
- Comment: תגובות
"""

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """
    מודל משתמש - מייצג משתמש במערכת.

    Attributes:
        id (int): מזהה ייחודי
        email (str): כתובת אימייל ייחודית
        username (str): שם משתמש
        password_hash (str): סיסמה מוצפנת
        role (str): תפקיד - 'User' או 'Admin'
        is_approved_uploader (bool): האם מאושר להעלות מתכונים
        upload_request_sent (bool): האם שלח בקשה להעלאת תוכן
        profile_image (str): נתיב לתמונת פרופיל

    Relationships:
        recipes: כל המתכונים של המשתמש
        ratings: כל הדירוגים שנתן המשתמש
    """
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), default='User', nullable=False)
    is_approved_uploader = db.Column(db.Boolean, default=False, nullable=False)
    upload_request_sent = db.Column(db.Boolean, default=False, nullable=False)
    profile_image = db.Column(db.String(256), nullable=True)
    # backref- יצירה אוטומטית של relationship בטבלת author
    recipes = db.relationship('Recipe', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    ratings = db.relationship('Rating', backref='user', lazy=True)

    def set_password(self, password):
        """
        הצפנת סיסמה ושמירתה.

        Args:
            password (str): סיסמה בטקסט גלוי
        """
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """
        בדיקת התאמת סיסמה.

        Args:
            password (str): סיסמה לבדיקה

        Returns:
            bool: True אם הסיסמה נכונה
        """
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


class Ingredient(db.Model):
    """
    מודל מרכיב - מייצג מרכיב כללי (למשל: "קמח", "ביצים").

    Attributes:
        id (int): מזהה ייחודי
        name (str): שם המרכיב (ייחודי)

    Relationships:
        ingredient_entries: כל המופעים של המרכיב במתכונים שונים

    Notes:
        - טבלה זו מאחסנת רשימה כללית של מרכיבים
        - IngredientEntry מקשר בין מרכיבים למתכונים עם כמויות
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)

    ingredient_entries = db.relationship('IngredientEntry', back_populates='ingredient')

    def __repr__(self):
        return f'<Ingredient {self.name}>'


class IngredientEntry(db.Model):
    """
    מודל רשומת מרכיב - מייצג מרכיב ספציפי במתכון (עם כמות ויחידה).

    Attributes:
        recipe_id (int): מזהה המתכון
        ingredient_id (int): מזהה המרכיב הכללי
        product (str): שם המוצר הספציפי
        amount (float): כמות
        unit (str): יחידת מידה (כוס, כפית, גרם וכו')
        type (str): סוג המרכיב

    Relationships:
        recipe: המתכון שאליו שייך המרכיב
        ingredient: המרכיב הכללי

    Notes:
        - מפתח ראשי מורכב: recipe_id + ingredient_id
        - מאפשר לשמור מידע ספציפי כמו כמות ויחידה למתכון
    """
    __tablename__ = 'ingredient_entry'
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id', ondelete='CASCADE'), primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.id'), primary_key=True)

    product = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50), nullable=True)
    type = db.Column(db.String(50), nullable=True)

    recipe = db.relationship("Recipe", back_populates="ingredient_entries")
    ingredient = db.relationship("Ingredient", back_populates="ingredient_entries")

    def __repr__(self):
        return f'<IngredientEntry {self.product} in Recipe {self.recipe_id}>'


# --- מודל דירוג ---
class Rating(db.Model):
    """
    מודל דירוג - מייצג דירוג של משתמש למתכון.

    Attributes:
        id (int): מזהה ייחודי
        score (int): ציון (1-5 כוכבים)
        comment (str): הערה אופציונלית
        user_id (int): מזהה המשתמש המדרג
        recipe_id (int): מזהה המתכון

    Constraints:
        - UniqueConstraint: משתמש יכול לדרג כל מתכון רק פעם אחת

    Notes:
        - ציון חייב להיות בין 1 ל-5
        - הערה היא אופציונלית
    """
    id = db.Column(db.Integer, primary_key=True)
    score = db.Column(db.Integer, nullable=False)  # ציון: 1 עד 5 כוכבים
    comment = db.Column(db.Text, nullable=True)  # הערה אופציונלית

    # מפתחות זרים
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id', ondelete='CASCADE'), nullable=False)

    # מניעת דירוג כפול: ניתן לדרג רק פעם אחת לכל מתכון
    __table_args__ = (db.UniqueConstraint('user_id', 'recipe_id', name='_user_recipe_uc'),)

    def __repr__(self):
        return f'<Rating {self.score} for Recipe {self.recipe_id}>'


# --- מודל מתכון ---
class Recipe(db.Model):
    """
    מודל מתכון - מייצג מתכון במערכת.

    Attributes:
        id (int): מזהה ייחודי
        title (str): כותרת המתכון (עד 100 תווים)
        instructions (str): הוראות הכנה
        prep_time (int): זמן הכנה בדקות
        image_path (str): נתיב לתמונה ראשית
        variation_paths (str): נתיבים לתמונות נוספות (JSON)
        created_at (datetime): תאריך יצירה
        user_id (int): מזהה היוצר

    Relationships:
        author: המשתמש שיצר את המתכון
        ingredient_entries: כל המרכיבים במתכון
        ratings: כל הדירוגים של המתכון

    Notes:
        - variation_paths מאוחסן כ-JSON string
        - מחיקת מתכון מוחקת אוטומטית גם מרכיבים ודירוגים
    """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    instructions = db.Column(db.Text, nullable=False)
    prep_time = db.Column(db.Integer, nullable=True)
    image_path = db.Column(db.String(256), nullable=True)
    variation_paths = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)

    ingredient_entries = db.relationship('IngredientEntry', back_populates='recipe', cascade='all, delete-orphan')

    ratings = db.relationship('Rating', backref='recipe', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Recipe {self.title}>'


# --- מודל מועדפים ---
class Favorite(db.Model):
    """
    מודל מועדפים - מייצג מתכון במועדפים של משתמש.

    Attributes:
        id (int): מזהה ייחודי
        user_id (int): מזהה המשתמש
        recipe_id (int): מזהה המתכון
        created_at (datetime): תאריך הוספה למועדפים

    Relationships:
        user: המשתמש שהוסיף למועדפים
        recipe: המתכון המועדף

    Constraints:
        - UniqueConstraint: מניעת שכפול - משתמש לא יכול להוסיף מתכון פעמיים

    Notes:
        - מחיקת משתמש או מתכון מוחקת אוטומטית רשומות מועדפים
    """
    __tablename__ = 'favorite'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    # מניעת שכפול יחסים
    __table_args__ = (db.UniqueConstraint('user_id', 'recipe_id', name='_user_recipe_fav_uc'),)

    # יחסים
    user = db.relationship('User', backref=db.backref('favorites', lazy='dynamic', cascade='all, delete-orphan'))
    recipe = db.relationship('Recipe', backref=db.backref('favorited_by', lazy='dynamic'))

    def __repr__(self):
        return f'<Favorite user={self.user_id} recipe={self.recipe_id}>'


class Comment(db.Model):
    """
    מודל תגובה - מייצג תגובה של משתמש על מתכון.

    Attributes:
        id (int): מזהה ייחודי
        content (str): תוכן התגובה
        user_id (int): מזהה המשתמש המגיב
        recipe_id (int): מזהה המתכון
        created_at (datetime): תאריך כתיבת התגובה

    Relationships:
        user: המשתמש שכתב את התגובה
        recipe: המתכון שעליו נכתבה התגובה

    Notes:
        - מחיקת משתמש או מתכון מוחקת אוטומטית את התגובות
        - תוכן מוגבל ל-1000 תווים (נאכף ברמת ה-API)
    """
    __tablename__ = 'comment'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    user = db.relationship('User', backref=db.backref('comments', lazy='dynamic'))
    recipe = db.relationship('Recipe', backref=db.backref('comments', lazy='dynamic', cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<Comment by user={self.user_id} on recipe={self.recipe_id}>'