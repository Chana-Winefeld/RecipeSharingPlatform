import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-add-recipe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.css']
})
export class AddRecipeComponent implements OnInit {
  // שדות המתכון
  title: string = '';
  instructions: string = '';
  prepTime: number = 30;

  // רשימת הרכיבים
  ingredients: Ingredient[] = [];

  // רכיב חדש שמוסיפים
  newIngredient: Partial<Ingredient> = {
    product: '',
    amount: 1,
    unit: 'כוס',
    type: 'Parve'
  };

  // תמונה
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  // אופציות ליחידות מידה
  unitOptions: string[] = [
    'יחידה', 'כוס', 'כוסות', 'גרם', 'ק"ג', 'כפות', 'חבילה', 'כפית',
    'ליטר', 'מ"ל', 'כף', 'כפיות', 'קורט'
  ];

  // אופציות כשרות
  kosherOptions: Array<'Dairy' | 'Meat' | 'Parve'> = ['Parve', 'Dairy', 'Meat'];

  // מצבי UI
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // בדיקה - האם המשתמש מאושר?
    if (!this.authService.isApprovedUploader()) {
      alert('אין לך הרשאה להעלות מתכונים. פנה למנהל.');
      this.router.navigate(['/']);
    }
  }

  // הוספת רכיב לרשימה
  addIngredient(): void {
    // ולידציה
    if (!this.newIngredient.product || !this.newIngredient.product.trim()) {
      alert('נא להזין שם רכיב');
      return;
    }

    if (!this.newIngredient.amount || this.newIngredient.amount <= 0) {
      alert('נא להזין כמות תקינה');
      return;
    }

    // יצירת רכיב חדש
    const ingredient: Ingredient = {
      product: this.newIngredient.product!.trim(),
      amount: this.newIngredient.amount!,
      unit: this.newIngredient.unit!,
      type: this.newIngredient.type!
    };

    // הוספה לרשימה
    this.ingredients.push(ingredient);

    // איפוס השדות
    this.newIngredient = {
      product: '',
      amount: 1,
      unit: 'כוס',
      type: 'Parve'
    };
  }

  // הסרת רכיב מהרשימה
  removeIngredient(index: number): void {
    this.ingredients.splice(index, 1);
  }

  // בחירת תמונה
  isDragging: boolean = false;

  // תמיכה ב-Drag & Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];

      // בדיקת סוג הקובץ
      if (!file.type.startsWith('image/')) {
        alert('נא לבחור קובץ תמונה בלבד');
        return;
      }

      // בדיקת גודל (מקסימום 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('התמונה גדולה מדי. מקסימום 5MB');
        return;
      }

      // קריאה לפונקציה קיימת
      this.handleFileSelection(file);
    }
  }

  // פונקציה לטיפול בקובץ
  handleFileSelection(file: File): void {
    this.selectedFile = file;

    // יצירת תצוגה מקדימה
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // בחירה מקובץ
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }

  // הסרת תמונה
  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  // שליחת הטופס
  onSubmit(): void {
    // איפוס הודעות
    this.errorMessage = '';
    this.successMessage = '';

    // ולידציה בסיסית
    if (!this.title.trim()) {
      this.errorMessage = 'נא למלא שם מתכון';
      return;
    }

    if (!this.instructions.trim()) {
      this.errorMessage = 'נא למלא הוראות הכנה';
      return;
    }

    if (this.prepTime <= 0) {
      this.errorMessage = 'זמן הכנה חייב להיות חיובי';
      return;
    }

    if (this.ingredients.length === 0) {
      this.errorMessage = 'נא להוסיף לפחות רכיב אחד';
      return;
    }

    // הכנת הנתונים
    const recipeData = {
      title: this.title.trim(),
      instructions: this.instructions.trim(),
      prep_time: this.prepTime,
      ingredients: this.ingredients
    };

    this.isSubmitting = true;

    // שליחה לשרת
    this.recipeService.addRecipe(recipeData, this.selectedFile || undefined).subscribe({
      next: (response) => {
        console.log('המתכון נוסף בהצלחה!', response);
        this.successMessage = 'המתכון נוסף בהצלחה! מעביר לדף המתכון...';

        // מעבר לדף המתכון החדש
        setTimeout(() => {
          this.router.navigate(['/recipe', response.recipe_id]);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('שגיאה בהוספת מתכון:', error);

        if (error.status === 403) {
          this.errorMessage = 'אין לך הרשאה להעלות מתכונים';
        } else if (error.status === 400) {
          this.errorMessage = 'נתונים לא תקינים. בדוק את השדות';
        } else {
          this.errorMessage = 'שגיאה בהוספת המתכון. נסה שוב.';
        }
      }
    });
  }

  // איפוס הטופס
  resetForm(): void {
    if (confirm('האם אתה בטוח שברצונך לאפס את הטופס?')) {
      this.title = '';
      this.instructions = '';
      this.prepTime = 30;
      this.ingredients = [];
      this.selectedFile = null;
      this.imagePreview = null;
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  // קבלת אייקון לפי סוג כשרות
  getKosherIcon(type: string): string {
    const icons: any = {
      'Dairy': '🥛',
      'Meat': '🥩',
      'Parve': '🌿'
    };
    return icons[type] || '🍽️';
  }

  // קבלת צבע לפי סוג כשרות
  getKosherColor(type: string): string {
    const colors: any = {
      'Dairy': '#3b82f6',
      'Meat': '#ef4444',
      'Parve': '#10b981'
    };
    return colors[type] || '#6b7280';
  }
}