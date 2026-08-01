import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, ChefHat, BookMarked, Calendar,
  ShoppingCart, User, LogOut, FlaskConical
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/suggest', icon: ChefHat, label: 'AI Recipes' },
  { to: '/saved', icon: BookMarked, label: 'Saved Recipes' },
  { to: '/planner', icon: Calendar, label: 'Meal Planner' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping List' },
  { to: '/analytics', icon: FlaskConical, label: 'Analytics' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🍽️</div>
        <span className="sidebar-logo-text">MealCraft</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} className="nav-item-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ padding: '0.5rem 0', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {user?.name}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
