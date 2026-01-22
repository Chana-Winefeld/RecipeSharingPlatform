import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = 'http://localhost:5000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // הוספת תגובה
  addComment(recipeId: number, content: string): Observable<any> {
    console.log('💬 Adding comment:', { recipeId, contentLength: content.length });

    return this.http.post(
      `${this.apiUrl}/recipe/${recipeId}/comment`,
      { content },
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Comment added successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error adding comment:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url
        });
        throw error;
      })
    );
  }

  // קבלת תגובות למתכון
  getRecipeComments(recipeId: number): Observable<any> {
    console.log('📖 Fetching comments for recipe:', recipeId);

    return this.http.get(`${this.apiUrl}/recipe/${recipeId}/comments`).pipe(
      tap(response => {
        console.log('✅ Comments loaded:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading comments:', error);
        throw error;
      })
    );
  }

  // עדכון תגובה
  updateComment(commentId: number, content: string): Observable<any> {
    console.log('🔧 Updating comment:', {
      commentId,
      contentLength: content.length,
      url: `${this.apiUrl}/comment/${commentId}`
    });

    return this.http.put(
      `${this.apiUrl}/comment/${commentId}`,
      { content },
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Comment updated successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error updating comment:', error);
        console.error('Full error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url,
          headers: error.headers
        });
        throw error;
      })
    );
  }

  // מחיקת תגובה
  deleteComment(commentId: number): Observable<any> {
    console.log('🗑️ Deleting comment:', {
      commentId,
      url: `${this.apiUrl}/comment/${commentId}`
    });

    return this.http.delete(
      `${this.apiUrl}/comment/${commentId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Comment deleted successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error deleting comment:', error);
        console.error('Full error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url,
          headers: error.headers
        });
        throw error;
      })
    );
  }

  // פונקציית עזר להכנת headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    console.log('🔑 Auth token exists:', !!token);

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
}