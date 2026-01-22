import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private apiUrl = 'http://localhost:5000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // הוספה/הסרה של מועדף
  toggleFavorite(recipeId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/favorite/${recipeId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // קבלת כל המועדפים
  getUserFavorites(): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/favorites`,
      { headers: this.getAuthHeaders() }
    );
  }

  // בדיקה אם מתכון במועדפים
  checkFavorite(recipeId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/favorite/${recipeId}/check`,
      { headers: this.getAuthHeaders() }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
}