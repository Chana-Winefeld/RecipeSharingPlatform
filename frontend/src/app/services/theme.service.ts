import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkMode.asObservable();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.loadTheme();
    }
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    // זיהוי העדפות מערכת
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    this.setTheme(isDark);
  }

  // החלפת מצב
  toggleTheme(): void {
    this.setTheme(!this.darkMode.value);
  }

  // הגדרת מצב
  setTheme(isDark: boolean): void {
    this.darkMode.next(isDark);
    if (this.isBrowser) {
      document.body.classList.toggle('dark-mode', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
  }

  // בדיקת מצב נוכחי
  isDarkMode(): boolean {
    return this.darkMode.value;
  }
}
