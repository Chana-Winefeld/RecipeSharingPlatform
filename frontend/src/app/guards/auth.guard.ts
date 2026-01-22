import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

// authGuard - בדיקה שהמשתמש מחובר
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    console.log('✅ משתמש מחובר - גישה מאושרת');
    return true;
  }

  console.log('❌ משתמש לא מחובר - מפנה ל-login');
  // לא מחובר - העברה לדף התחברות
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

// adminGuard - בדיקה שהמשתמש הוא מנהל
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAdmin = authService.isAdmin();
  console.log('🔍 בדיקת מנהל:', isAdmin);

  if (authService.isLoggedIn() && isAdmin) {
    console.log('✅ משתמש הוא מנהל - גישה מאושרת');
    return true;
  }

  console.log('❌ משתמש אינו מנהל - מפנה לדף הבית');
  // לא מנהל - חזרה לדף הבית
  alert('אין לך הרשאות לגשת לדף זה');
  router.navigate(['/']);
  return false;
};

// uploaderGuard - בדיקה שהמשתמש מאושר להעלאת מתכונים
export const uploaderGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApproved = authService.isApprovedUploader();
  console.log('🔍 בדיקת העלאה:', isApproved);

  if (authService.isLoggedIn() && isApproved) {
    console.log('✅ משתמש מאושר להעלאה - גישה מאושרת');
    return true;
  }

  console.log('❌ משתמש לא מאושר להעלאה - מפנה לדף הבית');
  // לא מאושר - חזרה לדף הבית
  alert('אין לך הרשאה להעלות מתכונים. פנה למנהל.');
  router.navigate(['/']);
  return false;
};