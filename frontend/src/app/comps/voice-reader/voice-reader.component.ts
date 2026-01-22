import { Component, Input, OnDestroy, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-voice-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-reader.component.html',
  styleUrls: ['./voice-reader.component.css']
})
export class VoiceReaderComponent implements OnDestroy {
  @Input() recipe: any; 

  isPlaying = false;
  isPaused = false;
  isMenuOpen = false;

  private synthesis: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  speechRate = 0.9;

  constructor(private eRef: ElementRef, private cdr: ChangeDetectorRef) {
    this.synthesis = window.speechSynthesis;
  }

  ngOnDestroy(): void {
    this.stopReading();
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  private getIngredientsText(): string {
    if (!this.recipe?.ingredients) return '';
    return this.recipe.ingredients
      .map((i: any) => `${i.amount || ''} ${i.unit || ''} ${i.product}`)
      .join(', ');
  }

  speak(text: string) {
    this.synthesis.cancel();
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.lang = 'he-IL';
    this.utterance.rate = this.speechRate;

    this.utterance.onstart = () => { 
      this.isPlaying = true; 
      this.isPaused = false;
      this.cdr.detectChanges(); // פקודה חשובה: מעדכן את המסך מיד כשההקראה מתחילה
    };

    this.utterance.onend = () => { 
      this.isPlaying = false; 
      this.isPaused = false;
      this.cdr.detectChanges(); // מעדכן את המסך כשההקראה נגמרת
    };

    this.synthesis.speak(this.utterance);
  }

  readFullRecipe() {
    if (!this.recipe) return;
    const text = `מתכון ל${this.recipe.title}. מצרכים: ${this.getIngredientsText()}. הוראות: ${this.recipe.instructions}`;
    this.speak(text);
  }

  readIngredients() {
    this.speak("המצרכים הם: " + this.getIngredientsText());
  }

  readInstructions() {
    this.speak("הוראות ההכנה הן: " + this.recipe.instructions);
  }

  pauseReading() { 
    if (!this.isPaused) { 
      this.synthesis.pause(); 
      this.isPaused = true; 
      this.cdr.detectChanges(); // מעדכן את המסך למצב "מושהה"
    } 
  }

  resumeReading() { 
    if (this.isPaused) { 
      this.synthesis.resume(); 
      this.isPaused = false; 
      this.cdr.detectChanges(); // מעדכן את המסך למצב "מנגן"
    } 
  }

  stopReading() { 
    this.synthesis.cancel(); 
    this.isPlaying = false; 
    this.isPaused = false; 
    this.cdr.detectChanges(); // מעדכן את המסך לכיבוי
  }

  adjustSpeed(delta: number) { 
    this.speechRate = Math.max(0.5, Math.min(2, this.speechRate + delta));
    // אם כבר מקריא, נצטרך להתחיל מחדש במהירות החדשה כדי להרגיש את השינוי
    if (this.isPlaying) {
       // אופציונלי: אפשר להשאיר ככה או להפעיל את ה-speak מחדש
    }
  }
}