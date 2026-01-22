# 🍳 Taam Patuach (טעם פתוח)

### *A Community of Recipes*

<div align="center">

🍳 **Recipe Sharing Platform** | 🐍 **Python 3.9+** | 🅰️ **Angular 17+** | ⚗️ **Flask 3.0+** | 📄 **MIT License**

</div>

---

## 📖 About The Project

**Taam Patuach** is a full-stack recipe sharing platform that connects home cooks and food enthusiasts. The platform enables users to discover recipes based on ingredients they already have at home, share their own culinary creations, and build a vibrant cooking community.

### ✨ Key Highlights

- 🔍 **Smart Ingredient-Based Search** - Find recipes using ingredients you have at home
- 🖼️ **Advanced Image Gallery** - Each recipe features 4 images (original + 3 AI-generated variations)
- 👥 **Role-Based Access Control** - User roles: Reader, Content Creator, and Admin
- 🎯 **Match Score Algorithm** - Intelligent recipe matching based on available ingredients
- 🔊 **Text-to-Speech** - Listen to recipe instructions
- ⭐ **Rating System** - Rate and review recipes
- 📱 **Responsive Design** - Works seamlessly on all devices

---

## 🚀 Features

### For All Users
- Browse recipe gallery with advanced filtering
- Search recipes by ingredients with match percentage
- Filter by preparation time, rating, and kosher type (Dairy/Meat/Parve)
- Sort recipes by rating or preparation time
- View detailed recipe pages with full instructions
- Listen to recipe instructions using text-to-speech

### For Content Creators
- Upload new recipes with images
- Automatic generation of 3 image variations (B&W, rotated, special effects)
- Personal profile area
- Manage uploaded recipes

### For Administrators
- Approve content creator requests
- Moderate and delete recipes
- Manage user permissions
- View all user requests

---

## 🛠️ Technologies

### Backend
- **Python 3.9+** - Core programming language
- **Flask** - Web framework
- **SQLAlchemy** - ORM for database operations
- **SQLite** - Database
- **Pillow (PIL)** - Image processing and manipulation
- **JWT** - Authentication and authorization

### Frontend
- **Angular 17+** - Frontend framework
- **TypeScript** - Type-safe development
- **RxJS** - Reactive programming
- **Angular Material** - UI components
- **HTML5 & CSS3** - Markup and styling

### Additional Tools
- **Git** - Version control
- **REST API** - Communication between frontend and backend

---

## 🎯 Smart Recipe Matching Algorithm

The core of Taam Patuach is its intelligent recipe matching system:

1. **Set Operations** - Uses Python sets for efficient ingredient comparison
2. **Intersection Calculation** - Finds common ingredients between user input and recipes
3. **Match Score** - Calculates percentage match: `(common ingredients / required ingredients) × 100`
4. **Smart Sorting** - Prioritizes recipes requiring minimal additional purchases

**Example:**
- Recipe requires: Flour, Eggs, Sugar, Butter (4 ingredients)
- User has: Flour, Eggs (2 ingredients)
- Match Score: 50%

---

## 📂 Project Structure

```
RecipeSharingPlatform/
├── backend/
│   ├── app.py              # Flask application entry point
│   ├── models/             # Database models (User, Recipe, Ingredient)
│   ├── routes/             # API endpoints
│   ├── utils/              # Helper functions (image processing)
│   └── database.db         # SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Angular components
│   │   │   ├── services/   # API services
│   │   │   ├── models/     # TypeScript interfaces
│   │   │   └── guards/     # Route guards
│   │   └── assets/         # Static files
│   └── angular.json
│
└── README.md
```

---

## 🔐 User Roles & Permissions

| Role | Browse Recipes | Search | Rate | Upload Recipes | Delete Recipes | Approve Users |
|------|---------------|--------|------|----------------|----------------|---------------|
| **Reader** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Content Creator** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🖼️ Image Processing

When a user uploads a recipe image, the system automatically:

1. Saves the original image
2. Generates 3 variations using Pillow:
   - Black & White version
   - Rotated version
   - Special effect version (e.g., cropped, filtered)
3. Stores all 4 images with unique filenames
4. Saves file paths in database as JSON

Each recipe features a complete image gallery for better visual experience.

---

## 💾 Database Schema

### BaseModel
- `id` - Primary key (inherited by all models)
- `save()` - Method to persist data

### User
- `username` - Unique username
- `password` - Hashed password
- `role` - User role (Admin/Uploader/Reader)
- `is_approved_uploader` - Approval status

### Recipe
- `title` - Recipe name
- `description` - Recipe description
- `instructions` - Step-by-step instructions
- `prep_time` - Preparation time in minutes
- `type` - Kosher type (Dairy/Meat/Parve)
- `image_path` - Original image path
- `variation_paths` - JSON array of variation image paths
- `rating` - Average rating
- `user_id` - Foreign key to User

### IngredientEntry
- `recipe_id` - Foreign key to Recipe
- `ingredient_name` - Ingredient name
- `amount` - Quantity
- `unit` - Unit of measurement (cup, gram, etc.)

---

## 🚦 Getting Started

### Prerequisites
- Python 3.9 or higher
- Node.js 18+ and npm
- Angular CLI

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run the Angular development server
ng serve
```

The frontend will run on `http://localhost:4200`

---

## 📝 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Recipes
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get specific recipe
- `POST /api/recipes` - Create new recipe (Content Creator only)
- `DELETE /api/recipes/:id` - Delete recipe (Admin only)
- `POST /api/recipes/search` - Search by ingredients

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/request-upload` - Request content creator status
- `GET /api/admin/requests` - Get pending requests (Admin only)
- `PUT /api/admin/approve/:id` - Approve user (Admin only)

---

## 📋 API Examples

### Register New User
```json
POST /api/register
{
  "username": "johndoe",
  "password": "securePassword123",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": 123
}
```

### Search Recipes by Ingredients
```json
POST /api/recipes/search
{
  "ingredients": ["flour", "eggs", "sugar", "butter"]
}
```

**Response:**
```json
{
  "recipes": [
    {
      "id": 45,
      "title": "Classic Chocolate Cake",
      "match_score": 100,
      "prep_time": 45,
      "type": "Dairy",
      "image_path": "/uploads/recipe_45.jpg",
      "missing_ingredients": []
    },
    {
      "id": 12,
      "title": "Simple Pancakes",
      "match_score": 75,
      "prep_time": 15,
      "type": "Dairy",
      "image_path": "/uploads/recipe_12.jpg",
      "missing_ingredients": ["milk"]
    }
  ]
}
```

### Create New Recipe
```json
POST /api/recipes
Content-Type: multipart/form-data

{
  "title": "Grandma's Apple Pie",
  "description": "A traditional family recipe",
  "instructions": "1. Preheat oven to 180°C...",
  "prep_time": 60,
  "type": "Parve",
  "ingredients": [
    {
      "name": "apples",
      "amount": 6,
      "unit": "pieces"
    },
    {
      "name": "flour",
      "amount": 2,
      "unit": "cups"
    }
  ],
  "image": <file>
}
```

**Response:**
```json
{
  "success": true,
  "recipe_id": 78,
  "message": "Recipe created successfully",
  "images": {
    "original": "/uploads/recipe_78_original.jpg",
    "variations": [
      "/uploads/recipe_78_bw.jpg",
      "/uploads/recipe_78_rotated.jpg",
      "/uploads/recipe_78_cropped.jpg"
    ]
  }
}
```

---

## 🎨 Features In Development

- [ ] Social sharing integration
- [ ] Recipe collections/favorites
- [ ] Nutritional information
- [ ] Cooking timer integration
- [ ] Mobile app version
- [ ] Multi-language support

---

## 👩‍💻 Development

This project was built as part of a full-stack development course, emphasizing:
- **ORM-based approach** using SQLAlchemy
- **Role-based access control** with decorators
- **Image processing** with Pillow
- **Efficient algorithms** using Python sets
- **RESTful API design**
- **Modern frontend development** with Angular

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📧 Contact

Chana Winefeld - [@Chana-Winefeld](https://github.com/Chana-Winefeld)

Project Link: [https://github.com/Chana-Winefeld/RecipeSharingPlatform](https://github.com/Chana-Winefeld/RecipeSharingPlatform)

---

## 🙏 Acknowledgments

- Built with passion for cooking and technology
- Special thanks to the development community
- Inspired by the joy of sharing recipes

---

## 📌 Summary

**Taam Patuach** is an intelligent recipe-sharing platform that makes cooking easier by helping users discover recipes based on ingredients they already have at home. With smart matching algorithms, beautiful image galleries, and a vibrant community, Taam Patuach transforms the way people find, share, and enjoy recipes.

Whether you're looking for dinner inspiration with limited ingredients or want to share your culinary masterpieces with the world, Taam Patuach is your cooking companion.

---

<div align="center">

**Made with ❤️ and 🍳 by Chana Winefeld**

*Share your recipes, inspire the community!*

</div>