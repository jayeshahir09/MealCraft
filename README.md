# MealCraft — AI Recipe & Meal Planner

A full-stack web app for AI-powered recipe suggestions, weekly meal planning, and smart shopping lists.

## Stack
- **Backend**: Spring Boot 3.3 (Java 21), PostgreSQL, Flyway, JWT Security, Caffeine Cache
- **Frontend**: React 18, Vite, React Router v6, @dnd-kit, Lucide icons
- **AI**: OpenRouter API (mistral-7b-instruct)

## Project Structure
```
├── backend/          # Spring Boot Maven project
└── frontend/         # React + Vite project
```

## Setup

### Prerequisites
- Java 21+
- Maven 3.8+
- Node.js 18+
- PostgreSQL running locally

### 1. Create the Database
```sql
CREATE DATABASE mealplanner;
```

### 2. Configure Backend
Edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.username=YOUR_POSTGRES_USER
spring.datasource.password=YOUR_POSTGRES_PASSWORD
openrouter.api.key=YOUR_OPENROUTER_API_KEY
jwt.secret=YOUR_256_BIT_SECRET_KEY_HERE
```

> **Get your OpenRouter API key at**: https://openrouter.ai/keys

### 3. Run Backend
```bash
cd backend
mvn spring-boot:run
```
Flyway will auto-run all 8 migration scripts. Backend starts on **http://localhost:8080**

### 4. Install & Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend starts on **http://localhost:5173**

## Key Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Recipes | Enter ingredients → AI returns 3-5 structured recipes |
| 🗓️ Meal Planner | 7-day calendar grid with click-to-assign from saved recipes |
| 🛒 Shopping List | Auto-generated from plan, pantry subtracted |
| 🔐 Auth | JWT-based register/login |
| 🧺 Pantry | Save staple ingredients — auto-subtracted from shopping list |
| ⚡ Rate Limiting | 20 AI calls/day per user (DB counter) |
| 💾 Caching | Identical ingredient+pref combos cached 1 hour (Caffeine) |
| 📊 Analytics | Cooking history, top cuisines, weekly calorie estimate |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET/PUT | `/api/preferences` | Dietary preferences |
| GET/POST/DELETE | `/api/pantry` | Manage pantry |
| POST | `/api/recipes/suggest` | AI recipe suggestions |
| GET/POST/DELETE | `/api/recipes` | Saved recipes CRUD |
| GET | `/api/mealplans/{weekStart}` | Get weekly plan |
| POST | `/api/mealplans/{weekStart}/assign` | Assign recipe to slot |
| POST | `/api/shopping-list/generate/{planId}` | Generate shopping list |
| GET | `/api/analytics` | Cooking stats |

## Security Notes
- The OpenRouter API key is **never** exposed to the frontend
- All AI calls go through Spring Boot
- Ingredients are sanitized server-side before being sent to LLM
- JWT tokens expire after 24 hours
