import { Ingredient } from './ingredient.model';

export interface Recipe {
  id: number;
  title: string;
  instructions: string;
  prep_time: number;
  user_id: number;
  image_path: string | null;
  variation_paths: string[];
  ingredients: Ingredient[];
  created_at: string;

  // שדות דינמיים
  average_rating?: number;
  num_ratings?: number;
  is_favorite?: boolean;
  favorites_count?: number;

}

export interface RecipeSearchResult {
  recipe: Recipe;
  matching_score: number;
  missing_ingredients_count: number;
}