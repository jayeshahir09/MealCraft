import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, BookMarked, Calendar,
  ShoppingCart, BarChart2, User, Bell, X, PlusCircle
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/suggest', icon: Sparkles, label: 'Recipe Craft', badge: 'AI' },
  { to: '/planner', icon: Calendar, label: 'Planner' },
  { to: '/saved', icon: BookMarked, label: 'Saved Recipes' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Backdrop with Blur */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        aria-label="Main Navigation"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <h1 className="sidebar-title" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                MealCraft Pro
              </h1>
              <p className="sidebar-subtitle" style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Kitchen Craft
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="mobile-close-btn"
                aria-label="Close navigation sidebar"
                title="Close sidebar"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
              }}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={19} className="nav-item-icon" />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  background: 'rgba(159, 64, 45, 0.15)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(159, 64, 45, 0.3)'
                }}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom CTA */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/suggest');
              if (onClose) onClose();
            }}
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              gap: '0.5rem'
            }}
          >
            <PlusCircle size={18} />
            <span>New AI Recipe</span>
          </button>
        </div>
      </aside>
    </>
  );
}

