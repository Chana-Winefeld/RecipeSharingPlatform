import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FavoriteService } from '../../services/favorite.sevice';

@Component({
  selector: 'app-my-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-favorites.component.html',
  styleUrls: ['./my-favorites.component.css']
})
export class MyFavoritesComponent implements OnInit {
  favorites: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private favoriteService: FavoriteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  // טעינת מועדפים
  loadFavorites(): void {
    this.isLoading = true;
    
    this.favoriteService.getUserFavorites().subscribe({
      next: (response) => {
        this.favorites = response.favorites || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'שגיאה בטעינת המועדפים';
        console.error('Error:', error);
      }
    });
  }

  viewRecipe(recipeId: number): void {
    this.router.navigate(['/recipe', recipeId]);
  }

  // הסרה מהמעודפים
  removeFavorite(event: Event, recipeId: number): void {
    event.stopPropagation();
    
    if (!confirm('להסיר מתכון זה מהמועדפים?')) {
      return;
    }

    this.favoriteService.toggleFavorite(recipeId).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(f => f.id !== recipeId);
      },
      error: (error) => {
        alert('שגיאה בהסרת המועדף');
        console.error('Error:', error);
      }
    });
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) {
      return 'https://via.placeholder.com/400x300/667eea/ffffff?text=No+Image';
    }
    return `http://localhost:5000/${imagePath}`;
  }

  // מידע בכרטיס
  formatPrepTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} שעות ו-${mins} דקות` : `${hours} שעות`;
  }
}