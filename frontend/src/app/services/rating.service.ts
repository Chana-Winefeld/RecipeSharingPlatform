import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RatingResponse } from '../models/rating.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private apiUrl = 'http://localhost:5000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // הוספה/עדכון דירוג
  submitRating(recipeId: number, score: number, comment?: string): Observable<RatingResponse> {
    const body = { score, comment };
    
    return this.http.post<RatingResponse>(
      `${this.apiUrl}/rate/${recipeId}`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  // מחיקת דירוג
  deleteRating(recipeId: number): Observable<RatingResponse> {
    return this.http.delete<RatingResponse>(
      `${this.apiUrl}/rate/${recipeId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // קבלת כל הדירוגים של מתכון
  getRecipeRatings(recipeId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/recipe/${recipeId}/ratings`);
  }

  // פונקציית עזר: יצירת headers עם טוקן
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
}