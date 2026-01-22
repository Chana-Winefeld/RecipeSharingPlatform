// src/app/comps/recipe-rating/recipe-rating.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RatingService } from '../../services/rating.service';
import { AuthService } from '../../services/auth.service';
import { Rating, RatingResponse } from '../../models/rating.model';

@Component({
  selector: 'app-recipe-rating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recipe-rating.component.html',
  styleUrls: ['./recipe-rating.component.css']
})
export class RecipeRatingComponent implements OnInit {
  @Input() recipeId!: number;
  @Input() recipeOwnerId!: number;

  // נתוני דירוג
  averageRating: number = 0;
  totalRatings: number = 0;
  userRating: number = 0;
  userComment: string = '';

  // רשימת כל הדירוגים
  allRatings: Rating[] = [];

  // מצבי UI
  isSubmitting: boolean = false;
  isLoadingRatings: boolean = true;
  showRatingForm: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  // כוכבים hover
  hoveredStar: number = 0;

  constructor(
    public authService: AuthService,
    private ratingService: RatingService
  ) {}

  ngOnInit(): void {
    if (this.recipeId) {
      this.loadRatings();
      this.checkIfUserIsOwner();
    }
  }

  isOwner: boolean = false;

  checkIfUserIsOwner(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isOwner = false; // אפשר לעדכן אם יש גישה למידע של המתכון
  }

  // ========================================
  // טעינת כל הדירוגים מהשרת
  // ========================================
  loadRatings(): void {
    this.isLoadingRatings = true;
    console.log('🔄 טוען דירוגים למתכון:', this.recipeId);

    this.ratingService.getRecipeRatings(this.recipeId).subscribe({
      next: (response: RatingResponse) => {
        console.log('✅ דירוגים נטענו:', response);
        this.allRatings = response.ratings || [];
        this.averageRating = response.average_rating || 0;
        this.totalRatings = response.num_ratings || 0;
        this.isLoadingRatings = false;
      },
      error: (error) => {
        console.error('❌ שגיאה בטעינת דירוגים:', error);
        this.allRatings = [];
        this.averageRating = 0;
        this.totalRatings = 0;
        this.isLoadingRatings = false;
      }
    });
  }

  selectRating(stars: number): void {
    if (!this.authService.isLoggedIn()) {
      alert('יש להתחבר כדי לדרג מתכונים');
      return;
    }
    this.userRating = stars;
    this.showRatingForm = true;
  }

  hoverStar(stars: number): void {
    this.hoveredStar = stars;
  }

  leaveStar(): void {
    this.hoveredStar = 0;
  }

  submitRating(): void {
    if (!this.userRating) {
      alert('נא לבחור דירוג');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id === this.recipeOwnerId) {
      this.errorMessage = 'אינך יכול לדרג את המתכון שלך';
      return;
    }

    console.log('🚀 שולח דירוג:', {
      recipeId: this.recipeId,
      score: this.userRating,
      comment: this.userComment
    });

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.ratingService.submitRating(this.recipeId, this.userRating, this.userComment).subscribe({
      next: (response: RatingResponse) => {
        console.log('✅ תשובה מהשרת:', response);
        this.successMessage = 'הדירוג נשמר בהצלחה!';
        this.showRatingForm = false;

        this.averageRating = response.average_rating;
        this.totalRatings = response.num_ratings;

        this.userComment = '';
        this.userRating = 0;

        this.loadRatings();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);

        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('❌ שגיאה בשליחת דירוג:', error);
        this.isSubmitting = false;
        this.errorMessage = 'שגיאה בשמירת הדירוג';
      }
    });
  }

  cancelRating(): void {
    this.showRatingForm = false;
    this.userRating = 0;
    this.userComment = '';
  }

  deleteRating(): void {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הדירוג שלך?')) return;

    this.ratingService.deleteRating(this.recipeId).subscribe({
      next: (response: RatingResponse) => {
        this.successMessage = 'הדירוג נמחק בהצלחה!';
        this.averageRating = response.average_rating;
        this.totalRatings = response.num_ratings;
        this.userRating = 0;
        this.loadRatings();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = 'שגיאה במחיקת הדירוג';
        console.error('שגיאה:', error);
      }
    });
  }

  getStarsArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  isStarFilled(star: number): boolean {
    const rating = this.hoveredStar || this.userRating;
    return star <= rating;
  }

  isAverageStarFilled(star: number): boolean {
    return star <= Math.round(this.averageRating);
  }

  getRatingStars(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
