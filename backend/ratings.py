"""
מודול דירוגים - Ratings Module
=================================
מודול זה מטפל בניהול דירוגים של מתכונים:
- הוספת/עדכון דירוג
- מחיקת דירוג
- קבלת כל הדירוגים של מתכון
- חישוב דירוג ממוצע
"""

from flask import Blueprint, request, jsonify
from sqlalchemy import func
from models import db, Recipe, Rating, User
from decorators import token_required

ratings_bp = Blueprint('ratings', __name__)


# --- פונקציית עזר לחישוב דירוג ממוצע ---
def calculate_average_rating(recipe_id):
    """
    מחשב את הדירוג הממוצע ומספר המדרגים למתכון.

    Args:
        recipe_id (int): מזהה המתכון

    Returns:
        tuple: (ממוצע מעוגל ל-2 ספרות, מספר דירוגים)

    Notes:
        - אם אין דירוגים, מחזיר (0, 0)
        - הממוצע מעוגל ל-2 ספרות עשרוניות
        - משמש בכל הקריאות שמחזירות מידע על מתכון
    """
    result = db.session.query(
        func.avg(Rating.score),
        func.count(Rating.id)
    ).filter(Rating.recipe_id == recipe_id).first()

    avg_score = result[0] if result[0] is not None else 0
    num_ratings = result[1]

    return round(avg_score, 2), num_ratings


# --- הראוטים של הדירוג (CRUD) ---
@ratings_bp.route('/rate/<int:recipe_id>', methods=['POST'])
@token_required
def submit_rating(user_id, recipe_id):
    """
    הוספה או עדכון של דירוג למתכון.

    Args:
        user_id (int): מזהה המשתמש (מהטוקן)
        recipe_id (int): מזהה המתכון

    Body Parameters (JSON):
        - score (int): ציון בין 1 ל-5
        - comment (str, optional): הערה על הדירוג

    Returns:
        JSON: הודעה, דירוג ממוצע חדש ומספר דירוגים

    Notes:
        - משתמש לא יכול לדרג את המתכון שלו
        - משתמש יכול לדרג כל מתכון רק פעם אחת
        - אם כבר קיים דירוג, הוא מתעדכן
        - אם הדירוג זהה לקיים, לא מתבצע עדכון
    """
    data = request.json
    score = data.get('score')
    comment = data.get('comment')

    if not score or not (1 <= score <= 5):
        return jsonify({"message": "Score is required and must be between 1 and 5."}), 400

    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({"message": "Recipe not found."}), 404

    if recipe.user_id == user_id:
        return jsonify({"message": "You cannot rate your own recipe."}), 403

    existing_rating = Rating.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()

    if existing_rating:
        if existing_rating.score == score and existing_rating.comment == comment:
            return jsonify(
                {"message": "Rating already exists with the same score and comment. No update performed."}), 200

        existing_rating.score = score
        existing_rating.comment = comment
        message = "Rating updated successfully."
    else:
        new_rating = Rating(user_id=user_id, recipe_id=recipe_id, score=score, comment=comment)
        db.session.add(new_rating)
        message = "Rating created successfully."

    try:
        db.session.commit()
        avg_score, num_ratings = calculate_average_rating(recipe_id)

        return jsonify({
            "message": message,
            "recipe_id": recipe_id,
            "average_rating": avg_score,
            "num_ratings": num_ratings
        }), 201 if not existing_rating else 200
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting rating: {e}")
        return jsonify({"message": "An error occurred while saving the rating."}), 500


@ratings_bp.route('/rate/<int:recipe_id>', methods=['DELETE'])
@token_required
def delete_rating(user_id, recipe_id):
    """
    מחיקת דירוג של משתמש למתכון.

    Args:
        user_id (int): מזהה המשתמש (מהטוקן)
        recipe_id (int): מזהה המתכון

    Returns:
        JSON: הודעה, דירוג ממוצע מעודכן ומספר דירוגים

    Notes:
        - משתמש יכול למחוק רק את הדירוג שלו
        - מחזיר 404 אם לא קיים דירוג
    """
    rating = Rating.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()
    if not rating:
        return jsonify({"message": "Rating not found or you have not rated this recipe."}), 404

    try:
        db.session.delete(rating)
        db.session.commit()
        avg_score, num_ratings = calculate_average_rating(recipe_id)

        return jsonify({
            "message": "Rating deleted successfully.",
            "recipe_id": recipe_id,
            "average_rating": avg_score,
            "num_ratings": num_ratings
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting rating: {e}")
        return jsonify({"message": "An error occurred during rating deletion."}), 500


@ratings_bp.route('/recipe/<int:recipe_id>/ratings', methods=['GET'])
def get_recipe_ratings(recipe_id):
    """
    קבלת כל הדירוגים של מתכון ספציפי.

    Args:
        recipe_id (int): מזהה המתכון

    Returns:
        JSON: מערך דירוגים, ממוצע ומספר דירוגים כולל

    Notes:
        - לא דורש אימות - כולם יכולים לראות דירוגים
        - כל דירוג כולל: id, user_id, username, score, comment
        - מחזיר גם סטטיסטיקה: average_rating, num_ratings
    """
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({"message": "Recipe not found."}), 404

    ratings = Rating.query.filter_by(recipe_id=recipe_id).all()
    ratings_list = []
    for rating in ratings:
        user = User.query.get(rating.user_id)
        ratings_list.append({
            'id': rating.id,
            'user_id': rating.user_id,
            'username': user.username if user else 'משתמש',
            'score': rating.score,
            'comment': rating.comment,
        })

    avg_score, num_ratings = calculate_average_rating(recipe_id)
    return jsonify({
        'ratings': ratings_list,
        'average_rating': avg_score,
        'num_ratings': num_ratings
    }), 200