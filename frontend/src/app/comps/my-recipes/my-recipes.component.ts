import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-my-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-recipes.component.html',
  styleUrls: ['./my-recipes.component.css']
})
export class MyRecipesComponent implements OnInit {
  myRecipes: Recipe[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private recipeService: RecipeService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMyRecipes();
  }

  // טעינת המתכונים שלי
  loadMyRecipes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.errorMessage = 'לא מחובר';
      this.isLoading = false;
      this.router.navigate(['/login']);
      return;
    }

    // טעינת כל המתכונים וסינון לפי user_id
    this.recipeService.getAllRecipes().subscribe({
      next: (recipes) => {
        this.myRecipes = recipes.filter(recipe => recipe.user_id === currentUser.id);
        this.isLoading = false;
        console.log('✅ נטענו המתכונים שלי:', this.myRecipes.length);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'שגיאה בטעינת המתכונים';
        console.error('שגיאה:', error);
      }
    });
  }

  // מעבר לדף מתכון
  viewRecipe(recipeId: number): void {
    this.router.navigate(['/recipe', recipeId]);
  }

  // מעבר לעריכת מתכון
  editRecipe(event: Event, recipeId: number): void {
    event.stopPropagation();
    this.router.navigate(['/recipe', recipeId, 'edit']);
  }

  // מחיקת מתכון
  deleteRecipe(event: Event, recipeId: number): void {
    event.stopPropagation();
    
    if (!confirm('האם אתה בטוח שברצונך למחוק מתכון זה?')) {
      return;
    }

    this.recipeService.deleteRecipe(recipeId).subscribe({
      next: () => {
        console.log('✅ המתכון נמחק בהצלחה');
        this.myRecipes = this.myRecipes.filter(r => r.id !== recipeId);
      },
      error: (error) => {
        console.error('❌ שגיאה במחיקת המתכון:', error);
        alert('שגיאה במחיקת המתכון. נסה שוב.');
      }
    });
  }

  // קבלת URL של תמונה
  getImageUrl(imagePath: string | null): string {
    if (!imagePath) {
      return 'https://via.placeholder.com/400x300/667eea/ffffff?text=No+Image';
    }
    return `http://localhost:5000/${imagePath}`;
  }

  // פורמט זמן הכנה
  formatPrepTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} שעות ו-${mins} דקות` : `${hours} שעות`;
  }
}