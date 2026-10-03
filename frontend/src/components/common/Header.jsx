import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Zap, Bell, Menu, LogOut, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Header({ onToggleSidebar, sidebarOpen }) {
  const { toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <header className="app-top-header">
      <div className="header-left">
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
      </div>

      <div className="header-right">
        {/* Credits Counter Pill */}
        <Link
          to="/suggest"
          className="header-credits-pill"
          title="AI Studio Credits Available"
        >
          <span className="credits-dot" />
          <Zap size={15} className="credits-icon" />
          <span>16/20 Credits</span>
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

        {/* Notifications */}
        <Link
          to="/notifications"
          className="notification-btn"
          title="Notifications & Kitchen Alerts"
          aria-label="Notifications"
          style={{ textDecoration: 'none' }}
        >
          <Bell size={18} />
          <span className="notification-indicator" />
        </Link>

        {/* Help / Guide */}
        <button
          className="notification-btn"
          title="Culinary Assistant Guide"
          aria-label="Help Guide"
          onClick={() => toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--on-background)' }}>
                🍳 MealCraft Workflow Guide
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                1. Add staples to your <strong>Kitchen Pantry</strong>.<br />
                2. Use <strong>AI Studio</strong> to generate customized dishes.<br />
                3. Assign meals to your <strong>Weekly Planner</strong> & generate grocery lists!
              </div>
            </div>
          ), { duration: 6000, icon: '💡' })}
        >
          <HelpCircle size={18} />
        </button>

        {/* User Profile Avatar */}
        <Link to="/profile" className="header-avatar-link" title="My Profile">
          <div className="header-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
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

