// קובץ: src/app/comps/recipe-detail/recipe-detail.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { FavoriteService } from '../../services/favorite.sevice'; 
import { Recipe } from '../../models/recipe.model';
import { RecipeRatingComponent } from '../recipe-rating/recipe-rating.component';
import { RecipeCommentsComponent } from '../recipe-comments/recipe-comments.component';  
import { SocialShareComponent } from '../social-share/social-share.component'; 
import { VoiceReaderComponent } from '../voice-reader/voice-reader.component';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    RecipeRatingComponent,
    RecipeCommentsComponent,      
    SocialShareComponent,
     VoiceReaderComponent          
  ],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.css']
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  selectedImageIndex: number = 0;
  allImages: string[] = [];
  isFavorite: boolean = false;
  favoritesCount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    public authService: AuthService,
    private favoriteService: FavoriteService  
  ) { }

  ngOnInit(): void {
    const recipeId = this.route.snapshot.paramMap.get('id');

    if (recipeId) {
      this.loadRecipe(+recipeId);
      this.checkIfFavorite(+recipeId);  // 🔥 חדש!
    } else {
      this.errorMessage = 'מתכון לא נמצא';
      this.isLoading = false;
    }
  }

  loadRecipe(id: number): void {
    this.isLoading = true;

    this.recipeService.getRecipe(id).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        this.prepareImages();
        this.isLoading = false;
        console.log('מתכון נטען:', recipe);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'שגיאה בטעינת המתכון';
        console.error('שגיאה:', error);
      }
    });
  }

  prepareImages(): void {
    if (!this.recipe) return;

    this.allImages = [];

    // תמונה מקורית
    if (this.recipe.image_path) {
      this.allImages.push(this.getImageUrl(this.recipe.image_path));
    }

    // תמונות וריאציות
    if (this.recipe.variation_paths && this.recipe.variation_paths.length > 0) {
      this.recipe.variation_paths.forEach(path => {
        this.allImages.push(this.getImageUrl(path));
      });
    }

    // אם אין תמונות בכלל
    if (this.allImages.length === 0) {
      this.allImages.push('https://via.placeholder.com/800x600/667eea/ffffff?text=No+Image');
    }
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) {
      return 'https://via.placeholder.com/800x600/667eea/ffffff?text=No+Image';
    }
    return `http://localhost:5000/${imagePath}`;
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  // 🔥 חדש! בדיקה אם המתכון במועדפים
  checkIfFavorite(recipeId: number): void {
    if (!this.authService.isLoggedIn()) return;
    
    this.favoriteService.checkFavorite(recipeId).subscribe({
      next: (response) => {
        this.isFavorite = response.is_favorite;
        this.favoritesCount = response.favorites_count;
        console.log('✅ בדיקת מועדפים:', response);
      },
      error: (error) => {
        console.error('❌ שגיאה בבדיקת מועדפים:', error);
      }
    });
  }

  // 🔥 חדש! הוספה/הסרה ממועדפים
  toggleFavorite(): void {
    if (!this.authService.isLoggedIn()) {
      alert('יש להתחבר כדי לשמור מועדפים');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.recipe) return;

    this.favoriteService.toggleFavorite(this.recipe.id).subscribe({
      next: (response) => {
        this.isFavorite = response.is_favorite;
        this.favoritesCount = response.favorites_count;
        
        const message = response.is_favorite 
          ? '💖 המתכון נשמר במועדפים!' 
          : '🤍 המתכון הוסר מהמועדפים';
        
        console.log(message);
      },
      error: (error) => {
        alert('שגיאה בשמירת המועדף');
        console.error('Error:', error);
      }
    });
  }

  // בדיקה אם המשתמש הנוכחי הוא בעל המתכון
  isOwner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser !== null && 
           this.recipe !== null && 
           Number(currentUser.id) === Number(this.recipe.user_id);
  }

  // מעבר לעריכת מתכון
  editRecipe(): void {
    if (this.recipe) {
      this.router.navigate(['/recipe', this.recipe.id, 'edit']);
    }
  }

  // האם יכול למחוק (מנהל או בעל המתכון)
  canDeleteRecipe(): boolean {
    return this.authService.isAdmin() || this.isOwner();
  }

  deleteRecipe(): void {
    if (!this.recipe) return;

    if (!confirm(`האם אתה בטוח שברצונך למחוק את המתכון "${this.recipe.title}"?`)) {
      return;
    }

    this.recipeService.deleteRecipe(this.recipe.id).subscribe({
      next: () => {
        alert('המתכון נמחק בהצלחה!');
        this.router.navigate(['/recipes']);
      },
      error: (error) => {
        console.error('שגיאה במחיקה:', error);
        alert('שגיאה במחיקת המתכון');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/recipes']);
  }

  formatPrepTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} שעות ו-${mins} דקות` : `${hours} שעות`;
  }

  getKosherEmoji(type: string): string {
    const emojiMap: any = {
      'Dairy': '🥛',
      'Meat': '🥩',
      'Parve': '🌿'
    };
    return emojiMap[type] || '🍽️';
  }
}