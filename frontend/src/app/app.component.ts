import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { User } from './models/user.model';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'מתכונים';
  currentUser: User | null = null;

  constructor(
  public authService: AuthService,
  private router: Router,
  public themeService: ThemeService  
) {
  this.themeService.darkMode$.subscribe(isDark => {
    console.log('Theme changed:', isDark ? 'dark' : 'light');
  });
}
   

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('👤 משתמש נוכחי עודכן:', user);
    });
  }

  // פונקציית התנתקות
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  toggleTheme(): void {
  this.themeService.toggleTheme();
}
}