import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAiCredits } from '../../api/recipeApi';
import { Sun, Moon, ChefHat, Menu, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/suggest': 'Recipes',
  '/planner': 'Meal Planner',
  '/saved': 'Saved Recipes',
  '/recipes': 'Saved Recipes',
  '/shopping': 'Shopping List',
  '/shopping-list': 'Shopping List',
  '/pantry': 'Pantry Management',
  '/analytics': 'Analytics',
  '/profile': 'Profile & Settings',
};

export default function Header({ onToggleSidebar, sidebarOpen }) {
  const { toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [credits, setCredits] = useState({ remaining: 20, max: 20 });

  const currentPageLabel = ROUTE_LABELS[location.pathname] || 'Dashboard';

  useEffect(() => {
    if (!user) return;
    getAiCredits()
      .then(res => {
        if (res.data) {
          setCredits({
            remaining: res.data.remainingCallsToday !== undefined ? res.data.remainingCallsToday : 20,
            max: res.data.maxCallsPerDay || 20
          });
        }
      })
      .catch(() => { });

    function handleCreditUpdate(e) {
      if (e.detail) {
        setCredits(prev => ({
          remaining: e.detail.remainingCallsToday !== undefined ? e.detail.remainingCallsToday : prev.remaining,
          max: e.detail.maxCallsPerDay || prev.max
        }));
      }
    }

    window.addEventListener('ai-credits-updated', handleCreditUpdate);
    return () => window.removeEventListener('ai-credits-updated', handleCreditUpdate);
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const userInitial = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <header className="app-top-header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`menu-toggle-btn ${sidebarOpen ? 'active' : ''}`}
            aria-label="Toggle Sidebar Navigation"
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            <Menu size={20} className="menu-icon-transition" />
          </button>
        )}

        <div className="header-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span className="header-breadcrumb-prefix" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>MealCraft</span>
          <span className="header-breadcrumb-prefix" style={{ fontSize: '0.8rem', color: 'var(--border-color)' }}>/</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-background)', fontFamily: 'var(--font-display)' }}>
            {currentPageLabel}
          </span>
        </div>
      </div>

      <div className="header-right">
        {/* Credits Indicator Pill */}
        <Link
          to="/suggest"
          className="header-credits-pill"
          title={`${credits.remaining} of ${credits.max} recipe requests remaining today`}
        >
          <span className="credits-dot" />
          <ChefHat size={14} className="credits-icon" />
          <span>{credits.remaining}/{credits.max} credits</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <>
              <Sun size={17} className="theme-icon sun-icon" />
              <span className="theme-toggle-label">Light</span>
            </>
          ) : (
            <>
              <Moon size={17} className="theme-icon moon-icon" />
              <span className="theme-toggle-label">Dark</span>
            </>
          )}
        </button>

        {/* User Profile Avatar */}
        <Link to="/profile" className="header-avatar-link" title="My Profile">
          <div className="header-avatar">
            {userInitial}
          </div>
        </Link>

        {/* Quick Sign Out */}
        <button
          onClick={handleLogout}
          className="notification-btn"
          title="Sign out"
          aria-label="Sign out"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
