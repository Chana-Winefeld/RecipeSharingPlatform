import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  // רשימת כל המשתמשים
  allUsers: User[] = [];
  
  // רשימת בקשות העלאה (משתמשים שממתינים לאישור)
  uploaderRequests: User[] = [];
  
  // מצבי UI
  isLoadingUsers: boolean = true;
  isLoadingRequests: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  
  // טאב פעיל
  activeTab: 'users' | 'requests' = 'requests';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // בדיקה - רק מנהל יכול להיכנס
    if (!this.authService.isAdmin()) {
      alert('אין לך הרשאות גישה לדף זה');
      this.router.navigate(['/']);
      return;
    }

    this.loadAllUsers();
    this.loadUploaderRequests();
  }

  // טעינת כל המשתמשים
  loadAllUsers(): void {
    this.isLoadingUsers = true;
    this.errorMessage = '';

    this.authService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.isLoadingUsers = false;
        console.log('נטענו משתמשים:', users.length);
      },
      error: (error) => {
        this.isLoadingUsers = false;
        this.errorMessage = 'שגיאה בטעינת משתמשים';
        console.error('שגיאה:', error);
      }
    });
  }

  // טעינת בקשות העלאה (משתמשים לא מאושרים)
  loadUploaderRequests(): void {
    this.isLoadingRequests = true;

    this.authService.getUploaderRequests().subscribe({
      next: (requests) => {
        this.uploaderRequests = requests;
        this.isLoadingRequests = false;
        console.log('נטענו בקשות:', requests.length);
      },
      error: (error) => {
        this.isLoadingRequests = false;
        console.error('שגיאה בטעינת בקשות:', error);
      }
    });
  }

  // אישור משתמש להעלאה
  approveUser(userId: number, username: string): void {
    if (!confirm(`האם לאשר את ${username} להעלות מתכונים?`)) {
      return;
    }

    this.authService.approveUploader(userId).subscribe({
      next: (response) => {
        this.successMessage = `${username} אושר בהצלחה להעלות מתכונים!`;
        
        // רענון הרשימות
        this.loadAllUsers();
        this.loadUploaderRequests();
        
        // איפוס ההודעה אחרי 3 שניות
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = 'שגיאה באישור המשתמש';
        console.error('שגיאה:', error);
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 3000);
      }
    });
  }

  // החלפת טאב
  switchTab(tab: 'users' | 'requests'): void {
    this.activeTab = tab;
  }

  // קבלת תג תפקיד
  getRoleBadgeClass(role: string): string {
    return role === 'Admin' ? 'badge-admin' : 'badge-user';
  }

  // קבלת תג סטטוס
  getStatusBadgeClass(isApproved: boolean): string {
    return isApproved ? 'badge-approved' : 'badge-pending';
  }

  // קבלת טקסט סטטוס
  getStatusText(isApproved: boolean): string {
    return isApproved ? 'מאושר' : 'לא מאושר';
  }
}