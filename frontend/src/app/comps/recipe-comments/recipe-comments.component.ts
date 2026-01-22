import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommentService } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recipe-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recipe-comments.component.html',
  styleUrls: ['./recipe-comments.component.css']
})
export class RecipeCommentsComponent implements OnInit {
  @Input() recipeId!: number;

  comments: any[] = [];
  newComment: string = '';
  
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  
  editingCommentId: number | null = null;
  editingContent: string = '';
  
  // מעקב אחר תגובת המשתמש
  userHasCommented: boolean = false;
  userCommentId: number | null = null;

  constructor(
    public authService: AuthService,
    private commentService: CommentService
  ) {}

  ngOnInit(): void {
    if (this.recipeId) {
      this.loadComments();
    }
  }

  loadComments(): void {
    this.isLoading = true;
    
    this.commentService.getRecipeComments(this.recipeId).subscribe({
      next: (response) => {
        this.comments = response.comments || [];
        this.isLoading = false;
        
        // בדיקה אם המשתמש כבר הגיב
        this.checkIfUserCommented();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading comments:', error);
      }
    });
  }

  // בדיקה אם המשתמש כבר הגיב
  checkIfUserCommented(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.userHasCommented = false;
      return;
    }

    const userComment = this.comments.find(c => c.user_id === currentUser.id);
    if (userComment) {
      this.userHasCommented = true;
      this.userCommentId = userComment.id;
    } else {
      this.userHasCommented = false;
      this.userCommentId = null;
    }
  }

  addComment(): void {
    if (!this.authService.isLoggedIn()) {
      alert('יש להתחבר כדי להגיב');
      return;
    }

    // בדיקה אם כבר הגיב
    if (this.userHasCommented) {
      this.errorMessage = 'כבר הגבת על מתכון זה. ניתן לערוך את התגובה הקיימת.';
      return;
    }

    if (!this.newComment.trim()) {
      return;
    }

    if (this.newComment.length > 1000) {
      this.errorMessage = 'התגובה ארוכה מדי (מקסימום 1000 תווים)';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.commentService.addComment(this.recipeId, this.newComment).subscribe({
      next: (response) => {
        this.comments.unshift(response.comment);
        this.newComment = '';
        this.isSubmitting = false;
        this.checkIfUserCommented(); // עדכון הסטטוס
      },
      error: (error) => {
        this.isSubmitting = false;
        
        // טיפול בשגיאה של תגובה כפולה
        if (error.status === 400 && error.error.message.includes('already commented')) {
          this.errorMessage = 'כבר הגבת על מתכון זה. ניתן לערוך את התגובה הקיימת.';
          this.loadComments(); // רענון הרשימה
        } else {
          this.errorMessage = 'שגיאה בהוספת התגובה';
        }
        
        console.error('Error:', error);
      }
    });
  }

  startEdit(comment: any): void {
    this.editingCommentId = comment.id;
    this.editingContent = comment.content;
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingCommentId = null;
    this.editingContent = '';
    this.errorMessage = '';
  }

  saveEdit(commentId: number): void {
    if (!this.editingContent.trim()) {
      return;
    }

    this.commentService.updateComment(commentId, this.editingContent).subscribe({
      next: () => {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
          comment.content = this.editingContent;
        }
        this.cancelEdit();
      },
      error: (error) => {
        this.errorMessage = 'שגיאה בעדכון התגובה';
        console.error('Error updating comment:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url
        });
      }
    });
  }

  deleteComment(commentId: number): void {
    if (!confirm('למחוק תגובה זו?')) {
      return;
    }

    this.commentService.deleteComment(commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== commentId);
        this.checkIfUserCommented(); // עדכון הסטטוס
      },
      error: (error) => {
        alert('שגיאה במחיקת התגובה');
        console.error('Error deleting comment:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url
        });
      }
    });
  }

  canEditOrDelete(comment: any): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;
    return currentUser.id === comment.user_id || currentUser.role === 'Admin';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    
    return date.toLocaleDateString('he-IL');
  }

}
