import { Routes } from '@angular/router';
import { authGuard, adminGuard, uploaderGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./comps/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./comps/register/register.component')
      .then(m => m.RegisterComponent)
  },
  {
    path: '',
    loadComponent: () => import('./comps/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'recipes',
    loadComponent: () => import('./comps/recipes-list/recipes-list.component')
      .then(m => m.RecipesListComponent)
  },
  {
    path: 'recipe/:id',
    loadComponent: () => import('./comps/recipe-detail/recipe-detail.component')
      .then(m => m.RecipeDetailComponent)
  },


  {
    path: 'edit-profile',
    loadComponent: () => import('./comps/edit-profile/edit-profile.component')
      .then(m => m.EditProfileComponent),
    canActivate: [authGuard]
  },

  {
    path: 'search',
    loadComponent: () => import('./comps/search-recipes/search-recipes.component')
      .then(m => m.SearchRecipesComponent)
  },
  {
    path: 'add-recipe',
    loadComponent: () => import('./comps/add-recipe/add-recipe.component')
      .then(m => m.AddRecipeComponent),
    canActivate: [authGuard, uploaderGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./comps/user-profile/user-profile.component')
      .then(m => m.UserProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./comps/admin-panel/admin-panel.component')
      .then(m => m.AdminPanelComponent),
    canActivate: [authGuard, adminGuard]
  },


  {
    path: 'my-recipes',
    loadComponent: () => import('./comps/my-recipes/my-recipes.component')
      .then(m => m.MyRecipesComponent),
    canActivate: [authGuard]
  },

  {
    path: 'my-favorites',
    loadComponent: () => import('./comps/my-favorites/my-favorites.component')
      .then(m => m.MyFavoritesComponent),
    canActivate: [authGuard]
  },

  {
  path: 'recipe/:id/edit',
  loadComponent: () => import('./comps/edit-recipe/edit-recipe.component')
    .then(m => m.EditRecipeComponent),
  canActivate: [authGuard]
},


  {
    path: 'not-found',
    loadComponent: () => import('./comps/not-found/not-found.component')
      .then(m => m.NotFoundComponent)
  },
  {
    path: '**',
    redirectTo: 'not-found'
  }
];