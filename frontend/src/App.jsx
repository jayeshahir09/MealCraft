import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import BottomNav from './components/common/BottomNav';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RecipeSuggestionsPage from './pages/RecipeSuggestionsPage';
import SavedRecipesPage from './pages/SavedRecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import MealPlannerPage from './pages/MealPlannerPage';
import ShoppingListPage from './pages/ShoppingListPage';
import PantryPage from './pages/PantryPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';

function AppShell() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // On initial mount or screen resize, check default state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background scroll and add active class when sidebar is open on mobile
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && sidebarOpen) {
      document.body.classList.add('mobile-sidebar-open');
      document.documentElement.classList.add('mobile-sidebar-open');
    } else {
      document.body.classList.remove('mobile-sidebar-open');
      document.documentElement.classList.remove('mobile-sidebar-open');
    }
    return () => {
      document.body.classList.remove('mobile-sidebar-open');
      document.documentElement.classList.remove('mobile-sidebar-open');
    };
  }, [sidebarOpen]);

  // Auto close drawer on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div style={{ width: '100%' }}>
        <Routes location={location}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className={`page-layout ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content-wrapper">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
        <main className="main-content">
          <div style={{ width: '100%' }}>
            <Routes location={location}>
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/suggest" element={<ProtectedRoute><RecipeSuggestionsPage /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><SavedRecipesPage /></ProtectedRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><SavedRecipesPage /></ProtectedRoute>} />
              <Route path="/recipes/view" element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
              <Route path="/recipes/:id" element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
              <Route path="/planner" element={<ProtectedRoute><MealPlannerPage /></ProtectedRoute>} />
              <Route path="/mealplan" element={<Navigate to="/planner" replace />} />
              <Route path="/shopping" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
              <Route path="/shopping-list" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
              <Route path="/pantry" element={<ProtectedRoute><PantryPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: isDark ? '#0F172A' : '#FFFFFF',
          color: isDark ? '#F8FAFC' : '#1F1610',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(120, 80, 50, 0.12)',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(180, 83, 9, 0.08)',
        },
        success: { iconTheme: { primary: isDark ? '#34D399' : '#10B981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
          <ThemedToaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
