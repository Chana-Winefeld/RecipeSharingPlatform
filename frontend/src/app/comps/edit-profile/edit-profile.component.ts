import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css']
})
export class EditProfileComponent implements OnInit {
  user: User | null = null;

  // שדות לעדכון
  username: string = '';
  email: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  // תמונת פרופיל
  selectedProfileImage: File | null = null;
  profileImagePreview: string | null = null;
  isUploadingImage: boolean = false;

  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    public authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.username = this.user.username;
    this.email = this.user.email;

    // טעינת תמונה קיימת
    if (this.user.profile_image) {
      this.profileImagePreview = this.authService.getProfileImageUrl(this.user.profile_image);
    }
  }

  // העלאת תמונה חדשה
  onProfileImageSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // בדיקת סוג קובץ
    if (!file.type.startsWith('image/')) {
      alert('נא לבחור קובץ תמונה בלבד');
      return;
    }

    // בדיקת גודל (מקס 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('התמונה גדולה מדי. מקסימום 2MB');
      return;
    }

    this.selectedProfileImage = file;

    // תצוגה מקדימה
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.profileImagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // שמירת תמונה חדשה
  uploadProfileImage(): void {
    if (!this.selectedProfileImage || !this.user) return;

    this.isUploadingImage = true;
    this.errorMessage = '';

    this.authService.uploadProfileImage(this.user.id, this.selectedProfileImage).subscribe({
      next: (response) => {
        this.successMessage = 'תמונת הפרופיל עודכנה בהצלחה!';
        this.selectedProfileImage = null;
        this.isUploadingImage = false;

        // רענון המשתמש
        this.user = this.authService.getCurrentUser();
      },
      error: (error) => {
        this.isUploadingImage = false;
        this.errorMessage = 'שגיאה בהעלאת התמונה';
        console.error('Error:', error);
      }
    });
  }

  // מחיקת תמונה קיימת
  deleteProfileImage(): void {
    if (!confirm('למחוק את תמונת הפרופיל?')) return;
    if (!this.user) return;

    this.isUploadingImage = true;

    this.authService.deleteProfileImage(this.user.id).subscribe({
      next: () => {
        this.successMessage = 'תמונת הפרופיל נמחקה';
        this.profileImagePreview = null;
        this.selectedProfileImage = null;
        this.isUploadingImage = false;

        // רענון המשתמש
        this.user = this.authService.getCurrentUser();
      },
      error: (error) => {
        this.isUploadingImage = false;
        this.errorMessage = 'שגיאה במחיקת התמונה';
        console.error('Error:', error);
      }
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.username.trim()) {
      this.errorMessage = 'נא למלא שם משתמש';
      return;
    }

    if (!this.email.trim()) {
      this.errorMessage = 'נא למלא אימייל';
      return;
    }

    if (this.newPassword) {
      if (this.newPassword.length < 6) {
        this.errorMessage = 'הסיסמה חייבת להכיל לפחות 6 תווים';
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = 'הסיסמאות אינן תואמות';
        return;
      }
    }

    const updateData: any = {
      username: this.username.trim(),
      email: this.email.trim()
    };

    if (this.newPassword) {
      updateData.password = this.newPassword;
    }

    this.isSubmitting = true;

    this.authService.updateUserProfile(this.user!.id, updateData).subscribe({
      next: (response) => {
        this.successMessage = 'הפרופיל עודכן בהצלחה!';
        this.newPassword = '';
        this.confirmPassword = '';

        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 409) {
          this.errorMessage = 'האימייל כבר קיים במערכת';
        } else {
          this.errorMessage = 'שגיאה בעדכון הפרופיל';
        }
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }
}