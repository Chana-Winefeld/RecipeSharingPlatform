import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Recipe } from '../../models/recipe.model';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-edit-recipe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-recipe.component.html',
  styleUrls: ['./edit-recipe.component.css']
})
export class EditRecipeComponent implements OnInit {
  recipeId!: number;
  recipe: Recipe | null = null;
  
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
  currentImageUrl: string | null = null;
  
  // אופציות ליחידות מידה
  unitOptions: string[] = [
    'יחידה', 'כוס', 'כוסות', 'גרם', 'ק"ג', 
     'חבילה','כפית','ליטר', 'מ"ל', 'כף', 'כפיות', 'קורט'
  ];
  
  // מצבי UI
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // קבלת ה-ID מה-URL
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.recipeId = +id;
      this.loadRecipe();
    } else {
      this.errorMessage = 'מתכון לא נמצא';
      this.isLoading = false;
    }
  }

  // טעינת המתכון
  loadRecipe(): void {
    this.isLoading = true;
    
    this.recipeService.getRecipe(this.recipeId).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        
        // בדיקת הרשאה - רק בעל המתכון יכול לערוך
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && Number(currentUser.id) !== Number(recipe.user_id)) {
          alert('אין לך הרשאה לערוך מתכון זה');
          this.router.navigate(['/recipe', this.recipeId]);
          return;
        }
        
        // מילוי השדות
        this.title = recipe.title;
        this.instructions = recipe.instructions;
        this.prepTime = recipe.prep_time;
        this.ingredients = [...recipe.ingredients];
        
        // תמונה נוכחית
        if (recipe.image_path) {
          this.currentImageUrl = this.getImageUrl(recipe.image_path);
        }
        
        this.isLoading = false;
        console.log('✅ מתכון נטען לעריכה:', recipe);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'שגיאה בטעינת המתכון';
        console.error('שגיאה:', error);
      }
    });
  }

  // הוספת רכיב לרשימה
  addIngredient(): void {
    if (!this.newIngredient.product || !this.newIngredient.product.trim()) {
      alert('נא להזין שם רכיב');
      return;
    }
    
    if (!this.newIngredient.amount || this.newIngredient.amount <= 0) {
      alert('נא להזין כמות תקינה');
      return;
    }

    const ingredient: Ingredient = {
      product: this.newIngredient.product!.trim(),
      amount: this.newIngredient.amount!,
      unit: this.newIngredient.unit!,
      type: this.newIngredient.type!
    };

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

// שליחת התמונה לפונקצית הטיפול בקובץ
onFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    this.handleFileSelection(file);
  }
}

  // הסרת תמונה חדשה
  removeNewImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  // שליחת העדכון
  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // ולידציה
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

    const recipeData = {
      title: this.title.trim(),
      instructions: this.instructions.trim(),
      prep_time: this.prepTime,
      ingredients: this.ingredients
    };

    this.isSubmitting = true;

    this.recipeService.updateRecipe(this.recipeId, recipeData, this.selectedFile || undefined).subscribe({
      next: (response) => {
        console.log('✅ המתכון עודכן בהצלחה!', response);
        this.successMessage = 'המתכון עודכן בהצלחה! מעביר לדף המתכון...';
        
        setTimeout(() => {
          this.router.navigate(['/recipe', this.recipeId]);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ שגיאה בעדכון מתכון:', error);
        
        if (error.status === 403) {
          this.errorMessage = 'אין לך הרשאה לערוך מתכון זה';
        } else if (error.status === 400) {
          this.errorMessage = 'נתונים לא תקינים. בדוק את השדות';
        } else {
          this.errorMessage = 'שגיאה בעדכון המתכון. נסה שוב.';
        }
      }
    });
  }

  // ביטול ועדכון
  cancel(): void {
    if (confirm('האם אתה בטוח שברצונך לבטל? השינויים לא יישמרו.')) {
      this.router.navigate(['/recipe', this.recipeId]);
    }
  }

  // קבלת URL של תמונה
  getImageUrl(imagePath: string): string {
    return `http://localhost:5000/${imagePath}`;
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