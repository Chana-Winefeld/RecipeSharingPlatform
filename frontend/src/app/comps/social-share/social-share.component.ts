import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-social-share',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-share.component.html',
  styleUrls: ['./social-share.component.css']
})
export class SocialShareComponent {
  @Input() recipeTitle: string = '';
  @Input() recipeId!: number;

  showCopied: boolean = false;

  // URL של המתכון
  getRecipeUrl(): string {
    return `${window.location.origin}/recipe/${this.recipeId}`;
  }

  // שיתוף ב-WhatsApp
  shareWhatsApp(): void {
    const text = `בדקו את המתכון המדהים הזה: ${this.recipeTitle}`;
    const url = this.getRecipeUrl();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' - ' + url)}`;
    window.open(whatsappUrl, '_blank');
  }

  // שיתוף ב-Facebook
  shareFacebook(): void {
    const url = this.getRecipeUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  }

  // שיתוף ב-Twitter (X)
  shareTwitter(): void {
    const text = `בדקו את המתכון: ${this.recipeTitle}`;
    const url = this.getRecipeUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  }

  // שיתוף ב-Telegram
  shareTelegram(): void {
    const text = `בדקו את המתכון: ${this.recipeTitle}`;
    const url = this.getRecipeUrl();
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  }

  // העתקת קישור
  copyLink(): void {
    const url = this.getRecipeUrl();
    
    // שימוש ב-Clipboard API מודרני
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        this.showCopiedMessage();
      }).catch(err => {
        console.error('Failed to copy:', err);
        this.fallbackCopyLink(url);
      });
    } else {
      this.fallbackCopyLink(url);
    }
  }

  // גיבוי להעתקה (דפדפנים ישנים)
  private fallbackCopyLink(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showCopiedMessage();
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }

  // הודעת "הועתק"
  private showCopiedMessage(): void {
    this.showCopied = true;
    setTimeout(() => {
      this.showCopied = false;
    }, 2000);
  }

  // שיתוף native (אם יש תמיכה)
  async shareNative(): Promise<void> {
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.recipeTitle,
          text: `בדקו את המתכון המדהים הזה: ${this.recipeTitle}`,
          url: this.getRecipeUrl()
        });
      } catch (err) {
        console.error('Native share failed:', err);
      }
    }
  }

  // בדיקה אם יש תמיכה בשיתוף native
  canShareNative(): boolean {
    return !!navigator.share;
  }
}