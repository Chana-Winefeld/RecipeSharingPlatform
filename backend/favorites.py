"""
מודול מועדפים - Favorites Module
===================================
מודול זה מטפל בניהול מתכונים מועדפים:
- הוספה והסרה ממועדפים (Toggle)
- קבלת רשימת מועדפים של משתמש
- בדיקת סטטוס מועדפים למתכון
"""

from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from models import db, Recipe, Favorite, User
from decorators import token_required

favorites_bp = Blueprint('favorites', __name__)


@favorites_bp.route('/favorite/<int:recipe_id>', methods=['POST'])
@token_required
def toggle_favorite(user_id, recipe_id):
    """
    הוספה או הסרה של מתכון מהמועדפים (Toggle).

    Args:
        user_id (int): ID של המשתמש (מהטוקן)
        recipe_id (int): ID של המתכון

    Returns:
        JSON: סטטוס חדש (is_favorite), מספר מועדפים כולל וקוד 200/201

    Notes:
        - אם המתכון כבר במועדפים - מסיר אותו (קוד 200)
        - אם לא במועדפים - מוסיף אותו (קוד 201)
        - מחזיר גם את ספירת המועדפים הכוללת למתכון
    """
    try:
        # בדיקת קיום המתכון
        recipe = Recipe.query.get_or_404(recipe_id)

        # בדיקה אם כבר במועדפים
        existing_favorite = Favorite.query.filter_by(
            user_id=user_id,
            recipe_id=recipe_id
        ).first()

        if existing_favorite:
            # הסרה מהמועדפים
            db.session.delete(existing_favorite)
            db.session.commit()

            favorites_count = Favorite.query.filter_by(recipe_id=recipe_id).count()

            return jsonify({
                "message": "Removed from favorites",
                "is_favorite": False,
                "favorites_count": favorites_count
            }), 200
        else:
            # הוספה למועדפים
            new_favorite = Favorite(user_id=user_id, recipe_id=recipe_id)
            db.session.add(new_favorite)
            db.session.commit()

            favorites_count = Favorite.query.filter_by(recipe_id=recipe_id).count()

            return jsonify({
                "message": "Added to favorites",
                "is_favorite": True,
                "favorites_count": favorites_count
            }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error toggling favorite: {e}")
        return jsonify({"message": "Failed to update favorites"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error toggling favorite: {e}")
        return jsonify({"message": "Error updating favorites"}), 500


@favorites_bp.route('/favorites', methods=['GET'])
@token_required
def get_user_favorites(user_id):
    """
    קבלת כל המתכונים המועדפים של המשתמש המחובר.

    Args:
        user_id (int): ID של המשתמש (מהטוקן)

    Returns:
        JSON: מערך של מתכונים מועדפים וספירה כוללת

    Notes:
        - כל מתכון כולל: id, title, prep_time, image_path, ingredients_count
        - כולל תאריך הוספה למועדפים (added_at)
        - משתמש ב-joinedload לאופטימיזציה של שאילתות
    """
    try:
        # טעינה עם joinedload
        from sqlalchemy.orm import joinedload
        favorites = Favorite.query.options(
            # עבור כל מתכון מועדף מטעין גם את רכיביו
            joinedload(Favorite.recipe).joinedload(Recipe.ingredient_entries)
        ).filter_by(user_id=user_id).all()

        recipes_list = []
        for fav in favorites:
            recipe = fav.recipe
            if recipe:  # וידוא שהמתכון קיים
                recipes_list.append({
                    'id': recipe.id,
                    'title': recipe.title,
                    'prep_time': recipe.prep_time,
                    'image_path': recipe.image_path,
                    'ingredients_count': len(recipe.ingredient_entries),
                    'added_at': fav.created_at.isoformat() if fav.created_at else None
                })

        return jsonify({
            'favorites': recipes_list,
            'count': len(recipes_list)
        }), 200

    except Exception as e:
        print(f"Error getting favorites: {e}")
        return jsonify({"message": "Failed to retrieve favorites"}), 500


@favorites_bp.route('/favorite/<int:recipe_id>/check', methods=['GET'])
@token_required
def check_favorite(user_id, recipe_id):
    """
    בדיקת סטטוס מועדפים למתכון ספציפי.

    Args:
        user_id (int): ID של המשתמש (מהטוקן)
        recipe_id (int): ID של המתכון

    Returns:
        JSON: האם במועדפים (is_favorite) וספירת מועדפים כוללת

    Notes:
        - שימושי לממשק משתמש כדי להציג אייקון מועדף מלא/ריק
        - מחזיר גם כמה משתמשים סה"כ הוסיפו את המתכון למועדפים
    """
    try:
        is_favorite = Favorite.query.filter_by(
            user_id=user_id,
            recipe_id=recipe_id
        ).first() is not None

        # ספירת כמה אנשים הוסיפו למועדפים
        favorites_count = Favorite.query.filter_by(recipe_id=recipe_id).count()

        return jsonify({
            'is_favorite': is_favorite,
            'favorites_count': favorites_count
        }), 200

    except Exception as e:
        print(f"Error checking favorite: {e}")
        return jsonify({"message": "Failed to check favorite status"}), 500