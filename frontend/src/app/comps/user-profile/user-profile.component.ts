import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  isRequestingPermission: boolean = false;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserDetails();
  }

  loadUserDetails(): void {
    this.isLoading = true;
    
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.isLoading = false;
      this.errorMessage = 'לא מחובר';
      this.router.navigate(['/login']);
      return;
    }

    this.authService.getUserDetails(currentUser.id).subscribe({
      next: (fullUser) => {
        this.user = fullUser;
        this.isLoading = false;
        console.log('✅ פרטי משתמש נטענו:', fullUser);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'שגיאה בטעינת פרטי משתמש';
        console.error('❌ שגיאה:', error);
      }
    });
  }

  // שולח בקשה לשרת
  requestUploadPermission(): void {
    if (!this.user) return;
    
    this.isRequestingPermission = true;
    this.errorMessage = '';
    
    this.authService.requestUploadPermission().subscribe({
      next: (response) => {
        this.successMessage = 'הבקשה נשלחה בהצלחה! המנהל יאשר אותך בקרוב.';
        this.isRequestingPermission = false;
        
        // רענון הפרטים
        this.loadUserDetails();
      },
      error: (error) => {
        this.isRequestingPermission = false;
        
        if (error.status === 400 && error.error.message.includes('already')) {
          this.successMessage = 'הבקשה כבר נשלחה קודם לכן. המנהל יאשר אותך בקרוב.';
        } else {
          this.errorMessage = 'שגיאה בשליחת הבקשה. נסה שוב.';
        }
      }
    });
  }

  goToAddRecipe(): void {
    this.router.navigate(['/add-recipe']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // קבלת טקסט תפקיד
  getRoleText(): string {
    if (!this.user) return 'משתמש';
    
    if (this.user.role === 'Admin') {
      return '👑 מנהל';
    }
    
    if (this.user.is_approved_uploader) {
      return '👤 משתמש מורשה';
    }
    
    return '👤 משתמש';
  }
}