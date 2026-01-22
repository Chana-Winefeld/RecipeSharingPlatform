import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recipes-list.component.html',
  styleUrls: ['./recipes-list.component.css']
})
export class RecipesListComponent implements OnInit {
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // פילטרים
  selectedKosherType: string = 'all';
  maxPrepTime: number = 0;
  minRating: number = 0;  

  // מיון
  sortBy: string = 'created_at';
  sortOrder: string = 'desc';

  constructor(
    private recipeService: RecipeService,
    private router: Router,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadRecipes();

    // בדיקה - האם המשתמש מנהל?
    console.log('האם מנהל?', this.authService.isAdmin());
    console.log('האם מחובר?', this.authService.isLoggedIn());
  }

  // טעינת מתכונים מהשרת
  loadRecipes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.recipeService.getAllRecipes().subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.filteredRecipes = recipes;
        this.isLoading = false;
        console.log('נטענו מתכונים:', recipes.length);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'שגיאה בטעינת המתכונים. נסה שוב מאוחר יותר.';
        console.error('שגיאה בטעינת מתכונים:', error);
      }
    });
  }

  // איפוס פילטרים
  resetFilters(): void {

    this.selectedKosherType = 'all';
    this.maxPrepTime = 0;
    this.minRating = 0;  
    this.sortBy = 'created_at';
    this.sortOrder = 'desc';
    this.loadRecipes();
  }

  // מעבר לדף המתכון המלא
  viewRecipe(recipeId: number): void {
    this.router.navigate(['/recipe', recipeId]);
  }

  // קבלת URL של תמונה
  getImageUrl(imagePath: string | null): string {
    if (!imagePath) {
      // תמונת ברירת מחדל מהאינטרנט
      return 'https://via.placeholder.com/400x300/667eea/ffffff?text=No+Image';
    }
    return `http://localhost:5000/${imagePath}`;
  }

  // פורמט זמן הכנה (למשל: 30 → "30 דקות")
  formatPrepTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} שעות ו-${mins} דקות` : `${hours} שעות`;
  }

  // מחיקת מתכון (למנהל בלבד)
  deleteRecipe(event: Event, recipeId: number): void {
    event.stopPropagation(); // מונע מעבר לדף המתכון

    if (!confirm('האם אתה בטוח שברצונך למחוק מתכון זה?')) {
      return;
    }

    this.recipeService.deleteRecipe(recipeId).subscribe({
      next: () => {
        console.log('המתכון נמחק בהצלחה');
        // מסיר את המתכון מהרשימה
        this.filteredRecipes = this.filteredRecipes.filter(r => r.id !== recipeId);
        this.recipes = this.recipes.filter(r => r.id !== recipeId);
      },
      error: (error) => {
        console.error('שגיאה במחיקת המתכון:', error);
        alert('שגיאה במחיקת המתכון. נסה שוב.');
      }
    });
  }

  // פונקציית עזר לחישוב כשרות המתכון לפי כל רכיביו
  getRecipeKosherType(recipe: Recipe): string {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 'Parve';
    if (recipe.ingredients.some(ing => ing.type === 'Meat')) return 'Meat';
    if (recipe.ingredients.some(ing => ing.type === 'Dairy')) return 'Dairy';
    return 'Parve';
  }

  // פונקציה לסינון ומיון
  applyFilters(): void {
    // 1. מתחילים מהרשימה המלאה שנטענה מהשרת ב-loadRecipes
    let filtered = [...this.recipes];

    // 2. פילטר כשרות
    if (this.selectedKosherType !== 'all') {
      filtered = filtered.filter(r => this.getRecipeKosherType(r) === this.selectedKosherType);
    }

    // 3. פילטר זמן הכנה
    if (this.maxPrepTime > 0) {
      filtered = filtered.filter(r => r.prep_time <= this.maxPrepTime);
    }

    // 4. פילטר דירוג מינימלי
    const minRatingNum = Number(this.minRating);
    if (!isNaN(minRatingNum) && minRatingNum > 0) {
      filtered = filtered.filter(r => (r.average_rating || 0) >= minRatingNum);
    }

    // 5. לוגיקת המיון
    filtered.sort((a, b) => {
      if (this.sortBy === 'average_rating') {
        // מהגבוה לנמוך
        return (b.average_rating || 0) - (a.average_rating || 0);
      } else if (this.sortBy === 'prep_time') {
        // מהקצר לארוך
        return a.prep_time - b.prep_time;
      } else {
        // חדש ביותר (לפי תאריך)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // 6. עדכון התצוגה
    this.filteredRecipes = filtered;
    console.log('סינון הסתיים. נמצאו:', this.filteredRecipes.length, 'מתכונים');
  }
}