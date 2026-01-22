import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recipe, RecipeSearchResult } from '../models/recipe.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private apiUrl = 'http://localhost:5000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // קבלת כל המתכונים (עם סינון ומיון)
  getAllRecipes(filters?: {
    max_prep_time?: number,
    kosher_type?: string,
    min_rating?: number,
    sort_by?: string,
    order?: string
  }): Observable<Recipe[]> {
    let url = `${this.apiUrl}/recipes`;
    const params: string[] = [];

    if (filters?.max_prep_time) {
      params.push(`max_prep_time=${filters.max_prep_time}`);
    }

    if (filters?.kosher_type) {
      params.push(`kosher_type=${filters.kosher_type}`);
    }


    if (filters?.min_rating !== undefined && filters.min_rating > 0) {
      params.push(`min_rating=${filters.min_rating}`);
      console.log('🔥 Adding min_rating to URL:', filters.min_rating);
    }

    if (filters?.sort_by) {
      params.push(`sort_by=${filters.sort_by}`);
    }

    if (filters?.order) {
      params.push(`order=${filters.order}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    console.log('📡 Final URL:', url);

    return this.http.get<Recipe[]>(url);
  }


  // קבלת מתכון בודד
  getRecipe(recipeId: number): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.apiUrl}/recipe/${recipeId}`);
  }


  // הוספת מתכון חדש (עם תמונה)
  addRecipe(recipeData: any, imageFile?: File): Observable<any> {
    const formData = new FormData();

    formData.append('title', recipeData.title);
    formData.append('instructions', recipeData.instructions);
    formData.append('prep_time', recipeData.prep_time.toString());
    formData.append('ingredients', JSON.stringify(recipeData.ingredients));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.post(`${this.apiUrl}/recipe`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  // עדכון מתכון קיים
  updateRecipe(recipeId: number, recipeData: any, imageFile?: File): Observable<any> {
    const formData = new FormData();

    formData.append('title', recipeData.title);
    formData.append('instructions', recipeData.instructions);
    formData.append('prep_time', recipeData.prep_time.toString());
    formData.append('ingredients', JSON.stringify(recipeData.ingredients));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.put(`${this.apiUrl}/recipe/${recipeId}`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  // מחיקת מתכון
  deleteRecipe(recipeId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/recipe/${recipeId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // חיפוש מתכונים לפי רכיבים 
  searchRecipesByIngredients(ingredients: string[]): Observable<RecipeSearchResult[]> {
    return this.http.post<RecipeSearchResult[]>(
      `${this.apiUrl}/recipes/search`,
      { ingredients }
    );
  }

  // קבלת URL מלא של תמונה
  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/images/no-image.png';
    return `${this.apiUrl}/${imagePath}`;
  }

  // פונקציית עזר: יצירת headers עם טוקן 
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
}