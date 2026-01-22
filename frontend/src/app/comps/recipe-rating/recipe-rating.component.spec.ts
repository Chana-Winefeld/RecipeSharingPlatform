import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeRatingComponent } from './recipe-rating.component';

describe('RecipeRatingComponent', () => {
  let component: RecipeRatingComponent;
  let fixture: ComponentFixture<RecipeRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeRatingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RecipeRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
