// קובץ: src/app/comps/register/register.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  // משתנים לטופס
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // ניקוי השדות בכניסה לדף
    this.username = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  // פונקציה שרצה כשלוחצים על "הירשם"
  onRegister(): void {
    // איפוס הודעות
    this.errorMessage = '';
    this.successMessage = '';

    // בדיקת ולידציה בסיסית
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'נא למלא את כל השדות';
      return;
    }

    // בדיקת אימייל תקין
    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'כתובת אימייל לא תקינה';
      return;
    }

    // בדיקת אורך סיסמה
    if (this.password.length < 6) {
      this.errorMessage = 'הסיסמה חייבת להכיל לפחות 6 תווים';
      return;
    }

    // בדיקת התאמת סיסמאות
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'הסיסמאות אינן תואמות';
      return;
    }

    this.isLoading = true;

    // שליחת בקשת Register ל-Flask
    this.authService.register({
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        // הצלחה! עכשיו נעשה login אוטומטי
        console.log('נרשמת בהצלחה!', response);
        this.successMessage = 'נרשמת בהצלחה! מתחבר אוטומטית...';
        
        // התחברות אוטומטית עם הפרטים שהוזנו
        this.authService.login({
          username: this.username,
          password: this.password
        }).subscribe({
          next: (loginResponse) => {
            console.log('התחברת אוטומטית!', loginResponse);
            // מעבר לדף הבית - עכשיו השם יופיע בתפריט!
            this.router.navigate(['/']);
          },
          error: (loginError) => {
            console.error('שגיאה בהתחברות אוטומטית:', loginError);
            // אם נכשל ה-login האוטומטי, נעביר לדף login ידני
            this.successMessage = 'נרשמת בהצלחה! מעביר לדף התחברות...';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 1500);
          }
        });
      },
      error: (error) => {
        // שגיאה
        this.isLoading = false;
        console.error('שגיאה בהרשמה:', error);
        
        if (error.status === 409) {
          this.errorMessage = 'כתובת האימייל כבר קיימת במערכת';
        } else if (error.status === 400) {
          this.errorMessage = 'נתונים לא תקינים. אנא בדוק את השדות';
        } else {
          this.errorMessage = 'אירעה שגיאה. נסה שוב מאוחר יותר.';
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // פונקציית עזר לבדיקת אימייל תקין
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}