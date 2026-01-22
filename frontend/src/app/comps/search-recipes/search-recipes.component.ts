// קובץ: src/app/comps/search-recipes/search-recipes.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { RecipeSearchResult } from '../../models/recipe.model';

@Component({
  selector: 'app-search-recipes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './search-recipes.component.html',
  styleUrls: ['./search-recipes.component.css']
})
export class SearchRecipesComponent {

  // אפשר להוסיף עוד
  commonIngredients: string[] = [
    'קמח', 'סוכר', 'ביצים', 'חלב', 'שמן', 'מים',
    'עגבניות', 'מלפפון', 'בצל', 'שום', 'פלפל',
    'תפוחי אדמה', 'גזר', 'בשר טחון', 'עוף',
    'גבינה צהובה', 'שמנת מתוקה', 'חמאה',
    'פסטה', 'אורז', 'לחם', 'שוקולד',
    'בננה', 'תפוח', 'תות', 'לימון'
  ];

  // רכיבים שנבחרו על ידי המשתמש
  selectedIngredients: string[] = [];
  
  // רכיב חדש שהמשתמש מוסיף (טקסט חופשי)
  newIngredient: string = '';

  // תוצאות החיפוש
  searchResults: RecipeSearchResult[] = [];
  
  // מצבי UI
  isSearching: boolean = false;
  hasSearched: boolean = false;
  errorMessage: string = '';

  constructor(
    private recipeService: RecipeService,
    private router: Router
  ) {}

  // ========================================
  // הוספת רכיב לרשימה (לחיצה על כפתור)
  // ========================================
  toggleIngredient(ingredient: string): void {
    const index = this.selectedIngredients.indexOf(ingredient);
    
    if (index === -1) {
      // הרכיב לא ברשימה - נוסיף אותו
      this.selectedIngredients.push(ingredient);
    } else {
      // הרכיב כבר ברשימה - נסיר אותו
      this.selectedIngredients.splice(index, 1);
    }
  }

  // ========================================
  // בדיקה אם רכיב נבחר
  // ========================================
  isSelected(ingredient: string): boolean {
    return this.selectedIngredients.includes(ingredient);
  }

  // ========================================
  // הוספת רכיב מותאם אישית (טקסט חופשי)
  // ========================================
  addCustomIngredient(): void {
    const ingredient = this.newIngredient.trim();

    if (!ingredient) {
      return;
    }

    // בדיקה אם הרכיב כבר קיים
    if (this.selectedIngredients.includes(ingredient)) {
      alert('הרכיב כבר ברשימה');
      return;
    }

    // הוספה לרשימה
    this.selectedIngredients.push(ingredient);
    this.newIngredient = '';
  }

  // ========================================
  // הסרת רכיב מהרשימה הנבחרת
  // ========================================
  removeIngredient(ingredient: string): void {
    this.selectedIngredients = this.selectedIngredients.filter(i => i !== ingredient);
  }

  // ========================================
  // איפוס הרשימה
  // ========================================
  clearAll(): void {
    this.selectedIngredients = [];
    this.searchResults = [];
    this.hasSearched = false;
    this.errorMessage = '';
  }

  // ========================================
  // חיפוש מתכונים (שליחה לשרת)
  // ========================================
  searchRecipes(): void {
    // בדיקה - האם נבחרו רכיבים?
    if (this.selectedIngredients.length === 0) {
      alert('נא לבחור לפחות רכיב אחד');
      return;
    }

    this.isSearching = true;
    this.errorMessage = '';
    this.hasSearched = true;

    console.log('מחפש מתכונים עם הרכיבים:', this.selectedIngredients);

    // שליחת בקשה לשרת
    this.recipeService.searchRecipesByIngredients(this.selectedIngredients).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
        console.log('נמצאו תוצאות:', results.length);
      },
      error: (error) => {
        this.isSearching = false;
        this.errorMessage = 'שגיאה בחיפוש מתכונים. נסה שוב.';
        console.error('שגיאה בחיפוש:', error);
      }
    });
  }

  // ========================================
  // מעבר לדף מתכון
  // ========================================
  viewRecipe(recipeId: number): void {
    this.router.navigate(['/recipe', recipeId]);
  }

  // ========================================
  // קבלת URL של תמונה
  // ========================================
  getImageUrl(imagePath: string | null): string {
    if (!imagePath) {
      return 'https://via.placeholder.com/400x300/667eea/ffffff?text=No+Image';
    }
    return `http://localhost:5000/${imagePath}`;
  }

  // ========================================
  // פורמט זמן הכנה
  // ========================================
  formatPrepTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} שעות ו-${mins} דקות` : `${hours} שעות`;
  }

  // ========================================
  // צבע לפי ציון התאמה
  // ========================================
  getScoreColor(score: number): string {
    if (score >= 80) return '#10b981'; // ירוק - התאמה מעולה
    if (score >= 50) return '#f59e0b'; // כתום - התאמה בינונית
    return '#ef4444'; // אדום - התאמה נמוכה
  }

  // ========================================
  // טקסט לפי ציון התאמה
  // ========================================
  getScoreLabel(score: number): string {
    if (score >= 80) return 'התאמה מעולה!';
    if (score >= 50) return 'התאמה טובה';
    return 'חסרים כמה רכיבים';
  }
}