"""
מודול תגובות - Comments Module
================================
מודול זה מטפל בניהול תגובות על מתכונים:
- הוספת תגובות חדשות
- עריכת תגובות קיימות
- מחיקת תגובות
- צפייה בתגובות של מתכון
"""

from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from models import db, Recipe, Comment, User
from decorators import token_required

comments_bp = Blueprint('comments', __name__)


@comments_bp.route('/recipe/<int:recipe_id>/comment', methods=['POST'])
@token_required
def add_comment(user_id, recipe_id):
    """
    הוספת תגובה חדשה למתכון.

    Args:
        user_id (int): ID של המשתמש המגיב (מהטוקן)
        recipe_id (int): ID של המתכון

    Body Parameters (JSON):
        - content (str): תוכן התגובה (עד 1000 תווים)

    Returns:
        JSON: הודעת הצלחה ופרטי התגובה החדשה וקוד 201

    Notes:
        - משתמש יכול להגיב רק פעם אחת על כל מתכון
        - לעריכת תגובה קיימת יש להשתמש ב-PUT /comment/<comment_id>
    """
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        data = request.json
        content = data.get('content', '').strip()

        # Validation
        if not content:
            return jsonify({"message": "Comment content is required"}), 400

        if len(content) > 1000:
            return jsonify({"message": "Comment is too long (max 1000 characters)"}), 400

        # בדיקה אם המשתמש כבר הגיב
        existing_comment = Comment.query.filter_by(
            user_id=user_id,
            recipe_id=recipe_id
        ).first()

        if existing_comment:
            return jsonify({
                "message": "You already commented on this recipe. You can edit your existing comment."
            }), 400

        new_comment = Comment(
            content=content,
            user_id=user_id,
            recipe_id=recipe_id
        )
        db.session.add(new_comment)
        db.session.commit()

        user = User.query.get(user_id)

        return jsonify({
            "message": "Comment added successfully",
            "comment": {
                "id": new_comment.id,
                "content": new_comment.content,
                "user_id": user_id,
                "username": user.username if user else 'משתמש',
                "created_at": new_comment.created_at.isoformat() if new_comment.created_at else None
            }
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error adding comment: {e}")
        return jsonify({"message": "Failed to add comment"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error adding comment: {e}")
        return jsonify({"message": "Error adding comment"}), 500


@comments_bp.route('/recipe/<int:recipe_id>/comments', methods=['GET'])
def get_recipe_comments(recipe_id):
    """
    קבלת כל התגובות של מתכון ספציפי.

    Args:
        recipe_id (int): ID של המתכון

    Returns:
        JSON: מערך תגובות, ספירת תגובות וקוד 200

    Notes:
        - התגובות ממוינות לפי תאריך יצירה (החדשות ביותר קודם)
        - כולל פרטי מגיב (username) לכל תגובה
        - לא דורש אימות - כולם יכולים לראות תגובות
    """
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        comments = Comment.query.options(
            joinedload(Comment.user)
        ).filter_by(recipe_id=recipe_id).order_by(Comment.created_at.desc()).all()

        comments_list = []
        for comment in comments:
            comments_list.append({
                'id': comment.id,
                'content': comment.content,
                'user_id': comment.user_id,
                'username': comment.user.username if comment.user else 'משתמש',
                'created_at': comment.created_at.isoformat() if comment.created_at else None
            })

        return jsonify({
            'comments': comments_list,
            'count': len(comments_list)
        }), 200

    except Exception as e:
        print(f"Error getting comments: {e}")
        return jsonify({"message": "Failed to retrieve comments"}), 500


@comments_bp.route('/comment/<int:comment_id>', methods=['PUT'])
@token_required
def update_comment(current_user_id, comment_id):
    """
    עדכון תגובה קיימת.

    Args:
        current_user_id (int): ID של המשתמש המחובר
        comment_id (int): ID של התגובה לעדכון

    Body Parameters (JSON):
        - content (str): תוכן התגובה המעודכן (עד 1000 תווים)

    Returns:
        JSON: הודעת הצלחה ותוכן התגובה המעודכן וקוד 200

    Authorization:
        - משתמש יכול לערוך רק את התגובות שלו
    """
    try:
        comment = Comment.query.get(comment_id)

        if not comment:
            return jsonify({"message": "Comment not found"}), 404

        # בדיקת הרשאה
        if comment.user_id != current_user_id:
            return jsonify({"message": "You can only edit your own comments"}), 403

        data = request.json
        content = data.get('content', '').strip()

        # Validation
        if not content:
            return jsonify({"message": "Comment content is required"}), 400

        if len(content) > 1000:
            return jsonify({"message": "Comment is too long (max 1000 characters)"}), 400

        comment.content = content
        db.session.commit()

        return jsonify({
            "message": "Comment updated successfully",
            "comment": {
                "id": comment.id,
                "content": comment.content
            }
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error updating comment: {e}")
        return jsonify({"message": "Failed to update comment"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error updating comment: {e}")
        return jsonify({"message": "Error updating comment"}), 500


@comments_bp.route('/comment/<int:comment_id>', methods=['DELETE'])
@token_required
def delete_comment(current_user_id, comment_id):
    """
    מחיקת תגובה.

    Args:
        current_user_id (int): ID של המשתמש המחובר
        comment_id (int): ID של התגובה למחיקה

    Returns:
        JSON: הודעת הצלחה וקוד 200

    Authorization:
        - בעל התגובה יכול למחוק את התגובה שלו
        - Admin יכול למחוק כל תגובה
    """
    try:
        comment = Comment.query.get(comment_id)

        if not comment:
            return jsonify({"message": "Comment not found"}), 404

        current_user = User.query.get(current_user_id)

        # בדיקת הרשאה - בעל התגובה או מנהל
        if comment.user_id != current_user_id and current_user.role != 'Admin':
            return jsonify({"message": "You can only delete your own comments"}), 403

        db.session.delete(comment)
        db.session.commit()

        return jsonify({"message": "Comment deleted successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error deleting comment: {e}")
        return jsonify({"message": "Failed to delete comment"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting comment: {e}")
        return jsonify({"message": "Error deleting comment"}), 500