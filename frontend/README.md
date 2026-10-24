# 🍳 MealCraft Web Client

Modern, responsive glassmorphic web interface for MealCraft, built with **React 19**, **Vite 8**, and **Vanilla CSS Design System**.

---

## ⚡ Tech Stack & Libraries

- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8.2 with Hot Module Replacement (HMR)
- **Routing**: React Router v7 (`react-router-dom`)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **HTTP Client**: Axios with JWT request interceptors
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Linter**: Oxlint

---

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Verify `.env.development` (or create `.env`):
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### 3. Run Development Server
```bash
npm run dev
```
Access the client at `http://localhost:5173`.

---

## 📜 Available Scripts

- `npm run dev` — Starts local development server with instant HMR.
- `npm run build` — Builds the optimized production bundle to `/dist`.
- `npm run preview` — Locally preview the production build.
- `npm run lint` — Runs Oxlint for fast static code analysis.

---

## 🏛️ Application Architecture

```text
src/
├── api/                  # Modular Axios API endpoints (auth, recipes, pantry, etc.)
├── context/              # Global state providers (AuthContext, ThemeContext)
├── components/common/    # Header, Sidebar, BottomNav, Autocomplete, Modals
├── pages/                # Route views (Dashboard, RecipeStudio, MealPlanner, etc.)
├── utils/                # Canonical ingredient database, date calculations
└── index.css             # Glassmorphic CSS variables, tokens, and responsive layout
```
