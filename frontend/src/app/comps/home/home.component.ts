import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  // נתוני הקרוסלה
  slides = [
    { image: 'assets/סופגניות.webp', title: 'כל מה שצריך לחנוכה במקום אחד', link: '/recipes' },
    { image: 'assets/פיצה.webp', title: 'מתכוני חורף מחממים', link: '/recipes' }
  ];
  currentSlide = 0;

  featuredRecipes = [
    { id: 1, name: 'טורטיות ממולאות בבשר', author: 'Admin', category: 'מנות עיקריות', image: 'http://127.0.0.1:5000/uploads/user_1/recipe_1/0535309443c6963f_original.jpg' },
    { id: 2, name: 'פסטה ברוטב אדום', author: 'חני וינפלד', category: 'בישול', image: 'http://127.0.0.1:5000/uploads/user_2/recipe_2/120bc3d4bfed9af2_original.jpg' },
    { id: 3, name: 'שייק פירות מרענן', author: 'Yossi', category: 'מנות אחרונות', image: 'http://127.0.0.1:5000/uploads/user_3/recipe_4/90c5481fe25a151e_original.jpg' }
  ];

categories = [
  { name: 'עוגות ומאפים', image: 'assets/images/עוגה.jpg' },
  { name: 'בשר ועוף', image: 'assets/images/בשר ועוף.jpg' },
  { name: 'דגים', image: 'assets/images/דג.webp' },
  { name: 'סלטים', image: 'assets/images/סלט.jpg' },
  { name: 'חלבי', image: 'assets/images/פיצה.webp' },
  { name: 'טבעוני', image: 'assets/images/טבעוני.jpg' }
];

blogPosts = [
  {
    title: 'איך להכין את הבצק המושלם?',
    excerpt: 'כל הסודות להתפחה נכונה, טמפרטורת מים מדויקת ולישה שתעשה את ההבדל בין לחם פשוט למאפה של מקצוענים...',
    image: 'assets/images/בצק.jpg',
    id: 1
  },
  {
    title: '5 טעויות נפוצות בטיגון צ׳יפס',
    excerpt: 'למה הצ׳יפס יוצא רך מדי? איזה סוג תפוח אדמה באמת מתאים לטיגון ואיך שומרים על שמן נקי לאורך זמן?',
    image: 'assets/images/ציפס.webp',
    id: 2
  }
];
  ngOnInit() {
    this.startCarousel();
  }

  // החלפה כל 5 שניות
  startCarousel() {
    setInterval(() => {
      this.nextSlide();
    }, 5000); 
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }
}