export interface Rating {
  id: number;
  score: number;          // דירוג בין 1-5
  comment?: string;       // תגובה של המשתמש
  user_id: number;        // מזהה המשתמש שפרסם את הדירוג
  recipe_id: number;      // מזהה המתכון
  username?: string;      // שם המשתמש (לצורך הצגה)
  profile_image?: string; // תמונת פרופיל של המשתמש (אופציונלי)
  created_at?: string;    // תאריך יצירת הדירוג (אופציונלי)
}

export interface RatingResponse {
  message: string;
  recipe_id: number;
  average_rating: number;
  num_ratings: number;
  ratings?: Rating[]; // רשימת כל הדירוגים, כדי להתאים לקומפוננטה
}
