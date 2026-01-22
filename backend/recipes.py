"""
מודול מתכונים - Recipes Module
=================================
מודול זה מטפל בכל פעולות CRUD על מתכונים:
- יצירת מתכון חדש
- קריאת מתכון/ים (עם סינון ומיון)
- עדכון מתכון קיים
- מחיקת מתכון
- חיפוש מתכונים לפי מרכיבים
- עיבוד והעלאת תמונות
"""

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import json
import shutil
import os
import imghdr
from PIL import Image
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError

from decorators import token_required
from models import db, Recipe, Ingredient, User, IngredientEntry, Rating, Favorite, Comment
from ratings import calculate_average_rating

# קבועים
"""רשימת יחידות מידה מותרות למרכיבים"""
UNIT_CHOICES = [
    'חבילה', 'כפית', 'כפות', 'יחידה', 'כוס', 'כוסות', 'גרם', 'ק"ג', 'ליטר', 'מ"ל', 'כף', 'כפיות', 'קורט'
]

recipes_bp = Blueprint('recipes', __name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# פונקציות validation
def validate_recipe_image(file):
    """
    בדיקת תקינות קובץ תמונה למתכון.

    Args:
        file: אובייקט קובץ מ-request.files

    Returns:
        bool: True אם הקובץ תקין

    Raises:
        ValueError: אם הקובץ לא תקין (גודל/סוג)

    Notes:
        - מקסימום 5MB
        - רק jpg/jpeg/png/gif
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


def validate_ingredient(item):
    """
    בדיקת תקינות מרכיב במתכון.

    Args:
        item (dict): מילון עם פרטי המרכיב

    Returns:
        bool: True אם המרכיב תקין

    Raises:
        ValueError: אם חסרים שדות או ערכים לא תקינים

    Expected fields:
        - product (str): שם המוצר
        - amount (float): כמות (חיובית)
        - unit (str): יחידה (מתוך UNIT_CHOICES)
        - type (str): סוג המרכיב
    """
    required_fields = ['product', 'amount', 'unit', 'type']

    for field in required_fields:
        if field not in item:
            raise ValueError(f"Missing field: {field}")

    if item['unit'] not in UNIT_CHOICES:
        raise ValueError(f"Invalid unit: {item['unit']}")

    try:
        amount = float(item['amount'])
        if amount <= 0:
            raise ValueError("Amount must be positive")
    except (ValueError, TypeError):
        raise ValueError("Invalid amount value")

    return True


# --- פונקציות עזר לעיבוד תמונה ---
def process_image(file, user_id, recipe_id):
    """
    עיבוד ושמירת תמונת מתכון עם וריאציות.

    Args:
        file: אובייקט קובץ תמונה
        user_id (int): מזהה המשתמש
        recipe_id (int): מזהה המתכון

    Returns:
        tuple: (נתיב תמונה מקורית, רשימת נתיבי וריאציות)

    Creates:
        - תמונה מקורית (עד 1024x1024)
        - תמונה ממוזערת (200x200)
        - תמונה בשחור-לבן
        - תמונה מסובבת (90 מעלות)

    Notes:
        - כל התמונות נשמרות בתיקייה uploads/user_{id}/recipe_{id}/
        - כל הקבצים נשמרים כ-JPEG
    """
    user_dir = os.path.join(UPLOAD_FOLDER, f'user_{user_id}')
    recipe_dir = os.path.join(user_dir, f'recipe_{recipe_id}')
    os.makedirs(recipe_dir, exist_ok=True)

    base_img = Image.open(file)
    if base_img.mode != 'RGB':
        base_img = base_img.convert('RGB')

    variation_paths = []

    # תמונה מקורית
    original_path = os.path.join(recipe_dir, f'{os.urandom(8).hex()}_original.jpg')
    max_size_img = base_img.copy()
    max_size_img.thumbnail((1024, 1024))
    max_size_img.save(original_path, 'JPEG')

    # תמונה ממוזערת
    try:
        thumb = max_size_img.copy()
        thumb.thumbnail((200, 200))
        thumbnail_path = os.path.join(recipe_dir, f'{os.urandom(8).hex()}_thumb.jpg')
        thumb.save(thumbnail_path, 'JPEG')
        variation_paths.append(thumbnail_path)
    except Exception as e:
        print(f"Error creating Thumbnail: {e}")

    # שחור-לבן
    try:
        grayscale = max_size_img.convert('L')
        grayscale_path = os.path.join(recipe_dir, f'{os.urandom(8).hex()}_grayscale.jpg')
        grayscale.save(grayscale_path, 'JPEG')
        variation_paths.append(grayscale_path)
    except Exception as e:
        print(f"Error creating Grayscale: {e}")

    # מסובבת
    try:
        rotated = max_size_img.rotate(90, expand=True)
        rotated_path = os.path.join(recipe_dir, f'{os.urandom(8).hex()}_rotated.jpg')
        rotated.save(rotated_path, 'JPEG')
        variation_paths.append(rotated_path)
    except Exception as e:
        print(f"Error creating Rotated image: {e}")

    return original_path, variation_paths


# --- פונקציה לעיבוד מתכון ל-JSON ---
def recipe_to_json(recipe):
    """
    ממיר אובייקט Recipe לפורמט JSON.

    Args:
        recipe (Recipe): אובייקט מתכון מהדאטאבייס

    Returns:
        dict: מתכון בפורמט JSON להחזרה ב-API

    Notes:
        - כולל את כל המרכיבים עם הכמויות
        - variation_paths מומר מ-JSON string למערך
    """
    ingredients_list = []
    for entry in recipe.ingredient_entries:
        ingredients_list.append({
            'product': entry.product,
            'amount': entry.amount,
            'unit': entry.unit,
            'type': entry.type
        })

    try:
        variation_paths_json = json.loads(recipe.variation_paths) if recipe.variation_paths else []
    except json.JSONDecodeError:
        variation_paths_json = [recipe.variation_paths] if recipe.variation_paths else []

    return {
        'id': recipe.id,
        'title': recipe.title,
        'instructions': recipe.instructions,
        'prep_time': recipe.prep_time,
        'user_id': recipe.user_id,
        'image_path': recipe.image_path,
        'variation_paths': variation_paths_json,
        'ingredients': ingredients_list,
        'created_at': recipe.created_at.isoformat() if recipe.created_at else None
    }


# --- CREATE ---
@recipes_bp.route('/recipe', methods=['POST'])
@token_required
def add_recipe(user_id):
    """
    יצירת מתכון חדש.

    Args:
        user_id (int): מזהה המשתמש (מהטוקן)

    Form Parameters:
        - title (str): כותרת (1-100 תווים)
        - instructions (str): הוראות הכנה
        - prep_time (int): זמן הכנה בדקות (0-10000)
        - ingredients (JSON str): מערך מרכיבים
        - image (file, optional): תמונת המתכון

    Returns:
        JSON: הודעת הצלחה ו-recipe_id

    Authorization:
        - רק משתמשים מאושרים (is_approved_uploader=True) יכולים להעלות

    Notes:
        - המרכיבים חייבים להיות JSON תקין
        - כל מרכיב עובר validation
        - אם מועלית תמונה, היא מעובדת אוטומטית
    """
    try:
        current_user = User.query.get(user_id)
        if not current_user or not current_user.is_approved_uploader:
            return jsonify({"message": "Authorization failed: User is not approved to upload recipes."}), 403

        title = request.form.get('title', '').strip()
        instructions = request.form.get('instructions', '').strip()
        prep_time = request.form.get('prep_time')

        # Validation
        if not title or len(title) > 100:
            return jsonify({"message": "Invalid title (1-100 characters required)"}), 400

        if not instructions:
            return jsonify({"message": "Instructions are required"}), 400

        try:
            prep_time = int(prep_time)
            if prep_time < 0 or prep_time > 10000:
                return jsonify({"message": "Invalid preparation time"}), 400
        except (ValueError, TypeError):
            return jsonify({"message": "Preparation time must be a number"}), 400

        ingredients_json = request.form.get('ingredients', '[]')

        try:
            ingredients_list = json.loads(ingredients_json)
        except json.JSONDecodeError:
            return jsonify({"message": "Invalid ingredients format"}), 400

        new_recipe = Recipe(title=title, instructions=instructions, prep_time=prep_time, user_id=user_id)
        db.session.add(new_recipe)
        db.session.flush()

        # עיבוד תמונה
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                try:
                    validate_recipe_image(file)
                    image_path, variation_paths_list = process_image(file, user_id, new_recipe.id)
                    new_recipe.image_path = image_path
                    new_recipe.variation_paths = json.dumps(variation_paths_list)
                except ValueError as e:
                    db.session.rollback()
                    return jsonify({"message": str(e)}), 400

        # הוספת מרכיבים
        for item in ingredients_list:
            try:
                validate_ingredient(item)
            except ValueError as e:
                db.session.rollback()
                return jsonify({"message": str(e)}), 400

            ingredient_obj = Ingredient.query.filter_by(name=item['product']).first()
            if not ingredient_obj:
                ingredient_obj = Ingredient(name=item['product'])
                db.session.add(ingredient_obj)
                db.session.flush()

            new_entry = IngredientEntry(
                recipe_id=new_recipe.id,
                ingredient_id=ingredient_obj.id,
                product=item['product'],
                amount=item['amount'],
                unit=item['unit'],
                type=item['type']
            )
            db.session.add(new_entry)

        db.session.commit()
        return jsonify({"message": "Recipe added successfully!", "recipe_id": new_recipe.id}), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error during recipe creation: {e}")
        return jsonify({"message": "Failed to create recipe"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Unexpected error during recipe creation: {e}")
        return jsonify({"message": "An error occurred"}), 500


# --- READ (ספציפי) ---
@recipes_bp.route('/recipe/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    """
    קבלת מתכון ספציפי עם כל הפרטים.

    Args:
        recipe_id (int): מזהה המתכון

    Returns:
        JSON: פרטי המתכון המלאים כולל דירוג ממוצע

    Notes:
        - לא דורש אימות - כולם יכולים לראות מתכונים
        - כולל את כל המרכיבים עם כמויות
        - כולל average_rating ו-num_ratings
    """
    try:
        recipe = Recipe.query.options(joinedload(Recipe.ingredient_entries)).get_or_404(recipe_id)
        recipe_data = recipe_to_json(recipe)
        avg_rating, num_ratings = calculate_average_rating(recipe.id)
        recipe_data['average_rating'] = avg_rating
        recipe_data['num_ratings'] = num_ratings
        return jsonify(recipe_data), 200
    except Exception as e:
        print(f"Error getting recipe: {e}")
        return jsonify({"message": "Failed to retrieve recipe"}), 500


# --- READ (כללי עם סינון ומיון) ---
@recipes_bp.route('/recipes', methods=['GET'])
def get_all_recipes():
    """
    קבלת כל המתכונים עם אפשרויות סינון ומיון.

    Query Parameters:
        - max_prep_time (int): זמן הכנה מקסימלי בדקות
        - kosher_type (str): סוג כשרות (לא מיושם כרגע)
        - min_rating (float): דירוג מינימלי
        - sort_by (str): שדה למיון (created_at/rating/prep_time)
        - order (str): כיוון מיון (asc/desc)

    Returns:
        JSON: מערך מתכונים ממוינים ומסוננים

    Notes:
        - ברירת מחדל: מיון לפי תאריך יצירה, מהחדש לישן
        - כל מתכון כולל דירוג ממוצע ומספר דירוגים
    """
    try:
        query = Recipe.query.options(joinedload(Recipe.ingredient_entries))
        max_prep_time = request.args.get('max_prep_time', type=int)
        kosher_type = request.args.get('kosher_type')
        min_rating = request.args.get('min_rating', type=float)
        sort_by = request.args.get('sort_by', 'created_at')
        order = request.args.get('order', 'desc')

        # סינון לפי זמן הכנה
        if max_prep_time and max_prep_time > 0:
            query = query.filter(Recipe.prep_time <= max_prep_time)

        recipes = query.all()
        recipes_with_ratings = []

        for recipe in recipes:
            avg_rating, num_ratings = calculate_average_rating(recipe.id)

            # סינון לפי דירוג מינימלי
            if min_rating and min_rating > 0 and (num_ratings == 0 or avg_rating < min_rating):
                continue

            recipe_data = recipe_to_json(recipe)
            recipe_data['average_rating'] = avg_rating
            recipe_data['num_ratings'] = num_ratings
            recipes_with_ratings.append(recipe_data)

        # מיון
        if sort_by == 'rating':
            recipes_with_ratings.sort(key=lambda x: x['average_rating'], reverse=(order == 'desc'))
        elif sort_by == 'prep_time':
            recipes_with_ratings.sort(key=lambda x: x['prep_time'], reverse=(order == 'desc'))
        else:
            recipes_with_ratings.sort(key=lambda x: x['created_at'] or '', reverse=(order == 'desc'))

        return jsonify(recipes_with_ratings), 200

    except Exception as e:
        print(f"Error getting recipes: {e}")
        return jsonify({"message": "Failed to retrieve recipes"}), 500


# --- UPDATE ---
@recipes_bp.route('/recipe/<int:recipe_id>', methods=['PUT'])
@token_required
def update_recipe(user_id, recipe_id):
    """
    עדכון מתכון קיים.

    Args:
        user_id (int): מזהה המשתמש (מהטוקן)
        recipe_id (int): מזהה המתכון

    Form Parameters (כולם אופציונליים):
        - title (str): כותרת חדשה
        - instructions (str): הוראות חדשות
        - prep_time (int): זמן הכנה חדש
        - ingredients (JSON str): מרכיבים חדשים
        - image (file): תמונה חדשה

    Returns:
        JSON: הודעת הצלחה ו-recipe_id

    Authorization:
        - רק יוצר המתכון יכול לערוך אותו

    Notes:
        - עדכון מרכיבים מוחק את הקודמים ויוצר חדשים
        - עדכון תמונה שומר את התמונה החדשה בלבד
    """
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        if int(recipe.user_id) != int(user_id):
            return jsonify({"message": "Authorization failed"}), 403

        # עדכון שדות בסיסיים
        if request.form.get('title'):
            title = request.form.get('title').strip()
            if len(title) > 100:
                return jsonify({"message": "Title too long"}), 400
            recipe.title = title

        if request.form.get('instructions'):
            recipe.instructions = request.form.get('instructions')

        if request.form.get('prep_time'):
            try:
                prep_time = int(request.form.get('prep_time'))
                if prep_time < 0 or prep_time > 10000:
                    return jsonify({"message": "Invalid preparation time"}), 400
                recipe.prep_time = prep_time
            except ValueError:
                return jsonify({"message": "Preparation time must be a number"}), 400

        # עדכון מרכיבים
        ingredients_json = request.form.get('ingredients', '[]')
        try:
            ingredients_list = json.loads(ingredients_json)
        except json.JSONDecodeError:
            return jsonify({"message": "Invalid ingredients format"}), 400

        if ingredients_list:
            IngredientEntry.query.filter_by(recipe_id=recipe.id).delete()

            for item in ingredients_list:
                try:
                    validate_ingredient(item)
                except ValueError as e:
                    db.session.rollback()
                    return jsonify({"message": str(e)}), 400

                ingredient_obj = Ingredient.query.filter_by(name=item['product']).first()
                if not ingredient_obj:
                    ingredient_obj = Ingredient(name=item['product'])
                    db.session.add(ingredient_obj)
                    db.session.flush()

                new_entry = IngredientEntry(
                    recipe_id=recipe.id,
                    ingredient_id=ingredient_obj.id,
                    product=item['product'],
                    amount=item['amount'],
                    unit=item['unit'],
                    type=item['type']
                )
                db.session.add(new_entry)

        # עדכון תמונה
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                try:
                    validate_recipe_image(file)
                    image_path, variation_paths_list = process_image(file, user_id, recipe.id)
                    recipe.image_path = image_path
                    recipe.variation_paths = json.dumps(variation_paths_list)
                except ValueError as e:
                    db.session.rollback()
                    return jsonify({"message": str(e)}), 400

        db.session.commit()
        return jsonify({"message": f"Recipe ID {recipe_id} updated successfully!", "recipe_id": recipe.id}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error during recipe update: {e}")
        return jsonify({"message": "Failed to update recipe"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Unexpected error during recipe update: {e}")
        return jsonify({"message": "An error occurred"}), 500


# --- DELETE ---
@recipes_bp.route('/recipe/<int:recipe_id>', methods=['DELETE'])
@token_required
def delete_recipe(user_id, recipe_id):
    """
    מחיקת מתכון.

    Args:
        user_id (int): מזהה המשתמש (מהטוקן)
        recipe_id (int): מזהה המתכון

    Returns:
        JSON: הודעת הצלחה

    Authorization:
        - יוצר המתכון או Admin יכולים למחוק

    Notes:
        - מוחק אוטומטית את כל התמונות מהשרת
        - מוחק אוטומטית מרכיבים, דירוגים, תגובות ומועדפים (CASCADE)
    """
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        current_user = User.query.get(user_id)

        if current_user.role != 'Admin' and current_user.id != recipe.user_id:
            return jsonify({"message": "Authorization failed"}), 403

        # מחיקת תיקיית תמונות
        if recipe.image_path:
            recipe_dir = os.path.dirname(recipe.image_path)
            if os.path.exists(recipe_dir):
                try:
                    shutil.rmtree(recipe_dir)
                except Exception as e:
                    print(f"Error deleting recipe directory: {e}")

        db.session.delete(recipe)
        db.session.commit()

        return jsonify({"message": f"Recipe ID {recipe_id} deleted successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error during deletion: {e}")
        return jsonify({"message": "Failed to delete recipe"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Unexpected error during deletion: {e}")
        return jsonify({"message": "An error occurred during deletion"}), 500


# --- SEARCH ---
@recipes_bp.route('/recipes/search', methods=['POST'])
def search_recipes():
    """
    חיפוש מתכונים לפי מרכיבים זמינים.

    Body Parameters (JSON):
        - ingredients (array): רשימת מרכיבים שיש למשתמש

    Returns:
        JSON: מערך מתכונים ממוינים לפי אחוז התאמה

    Algorithm:
        - בודק התאמה בין מרכיבי המשתמש למרכיבי המתכון
        - מחשב אחוז התאמה = (מרכיבים משותפים / סה"כ מרכיבים נדרשים) * 100
        - מחזיר רק מתכונים עם לפחות 20% התאמה
        - ממיין לפי אחוז התאמה (גבוה לנמוך)

    Notes:
        - חיפוש חלקי: "עגבניות" תתאים גם ל"עגבניות שרי"
        - כל תוצאה כוללת: recipe, matching_score, missing_ingredients_count
    """
    try:
        data = request.json
        user_ingredients = data.get('ingredients', [])

        if not user_ingredients:
            return jsonify({"message": "Please provide ingredients"}), 400

        user_ingredients_set = set(i.strip().lower() for i in user_ingredients if i.strip())

        if not user_ingredients_set:
            return jsonify({"message": "Please provide valid ingredients"}), 400

        all_recipes = Recipe.query.options(joinedload(Recipe.ingredient_entries)).all()
        scored_recipes = []

        for recipe in all_recipes:
            required_set = set(entry.product.strip().lower() for entry in recipe.ingredient_entries)

            if not required_set:
                continue

            # חישוב התאמה
            shared_count = sum(1 for ui in user_ingredients_set for ri in required_set if ui in ri or ri in ui)
            len_required = len(required_set)
            matching_score = (shared_count / len_required) * 100

            # מינימום 20% התאמה
            if matching_score < 20:
                continue

            recipe_data = recipe_to_json(recipe)
            scored_recipes.append({
                "recipe": recipe_data,
                "matching_score": round(matching_score, 2),
                "missing_ingredients_count": len_required - shared_count
            })

        scored_recipes.sort(key=lambda x: x['matching_score'], reverse=True)
        return jsonify(scored_recipes), 200

    except Exception as e:
        print(f"Error during recipe search: {e}")
        return jsonify({"message": "Search failed"}), 500