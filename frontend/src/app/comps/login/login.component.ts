import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,  
  imports: [CommonModule, FormsModule, RouterModule],  
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // משתנים לטופס
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // פונקציה שרצה כשלוחצים על "התחבר"
  onLogin(): void {
    // איפוס הודעת שגיאה
    this.errorMessage = '';

    // בדיקת ולידציה בסיסית
    if (!this.username || !this.password) {
      this.errorMessage = 'נא למלא את כל השדות';
      return;
    }

    this.isLoading = true;

    // שליחת בקשת Login ל-Flask
    this.authService.login({
      username: this.username,
      password: this.password
    }).subscribe({
      next: (response) => {
        // הצלחה! מעבר לדף הבית
        console.log('התחברת בהצלחה!', response);
        this.router.navigate(['/']);
      },
      error: (error) => {
        // שגיאה
        this.isLoading = false;
        console.error('שגיאה בהתחברות:', error);
        
        if (error.status === 401) {
          this.errorMessage = 'שם משתמש או סיסמה שגויים';
        } else {
          this.errorMessage = 'אירעה שגיאה. נסה שוב מאוחר יותר.';
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}