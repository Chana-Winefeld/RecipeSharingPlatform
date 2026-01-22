import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadUserFromStorage();
  }

  // טעינת הפרטים מה localStorage
  private loadUserFromStorage(): void {
    if (!this.isBrowser) return;
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUserSubject.next(user);
        console.log('✅ משתמש נטען מ-localStorage:', user);
      } catch (error) {
        console.error('❌ שגיאה בפענוח משתמש:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  // רישום משתמש חדש
  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  // התחברות
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          if (!this.isBrowser) return;
          localStorage.setItem('token', response.token);
          this.getUserDetails(response.user_id).subscribe({
            next: user => this.setCurrentUser(user),
            error: () => {
              const user: User = {
                id: response.user_id,
                username: response.username,
                role: response.role as 'Admin' | 'User',
                email: '',
                is_approved_uploader: response.role === 'Admin',
                upload_request_sent: false
              };
              this.setCurrentUser(user);
            }
          });
        })
      );
  }

  // התנתקות
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    console.log('✅ משתמש התנתק');
  }

  // בדיקה אם מחובר
  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem('token') && !!this.currentUserSubject.value;
  }

  // לקיחת טוקן מה localStorage
  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // קבלת פרטי משתמש
  getUserDetails(userId: number): Observable<User> {
    const current = this.currentUserSubject.value;
    if (current?.id === userId) return of(current);
    return this.http.get<User>(`${this.apiUrl}/user/${userId}`, { headers: this.getAuthHeaders() });
  }

  // החזרת כל המשתמשים
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/users`, { headers: this.getAuthHeaders() });
  }

  getUploaderRequests(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/uploader_requests`, { headers: this.getAuthHeaders() });
  }

  // אישור משתמש להעלאה (מנהלים)
  approveUploader(userId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/user/approve/${userId}`, {}, { headers: this.getAuthHeaders() });
  }

  // בקשת הרשאת העלאה
  requestUploadPermission(): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/request-upload`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        const user = this.currentUserSubject.value;
        if (user) {
          user.upload_request_sent = true;
          this.setCurrentUser(user);
        }
      })
    );
  }

  // בדיקה אם מנהל
  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'Admin';
  }

  // בדיקה אם מאושר להעלאה
  isApprovedUploader(): boolean {
    return this.currentUserSubject.value?.is_approved_uploader || false;
  }

  // עדכון פרופיל
  updateUserProfile(userId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/${userId}/edit`, data, { headers: this.getAuthHeaders() }).pipe(
      tap((response: any) => { if (response.user) this.setCurrentUser(response.user); })
    );
  }

  // העלאת תמונת פרופיל
  uploadProfileImage(userId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profile_image', file);
    return this.http.post(`${this.apiUrl}/user/${userId}/upload-profile-image`, formData, { headers: this.getAuthHeaders() }).pipe(
      tap((response: any) => {
        const user = this.currentUserSubject.value;
        if (user && response.profile_image) {
          user.profile_image = response.profile_image;
          this.setCurrentUser(user);
        }
      })
    );
  }

  // מחיקת תמונת פרופיל
  deleteProfileImage(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/${userId}/delete-profile-image`, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        const user = this.currentUserSubject.value;
        if (user) {
          user.profile_image = null;
          this.setCurrentUser(user);
        }
      })
    );
  }

  getProfileImageUrl(imagePath: string | null | undefined): string {
    return imagePath ? `${this.apiUrl}/${imagePath}` : 'assets/no-image.png';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // עזר פנימי לעדכון משתמש ב-localStorage + BehaviorSubject
  private setCurrentUser(user: User) {
    if (!this.isBrowser) return;
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }
}
