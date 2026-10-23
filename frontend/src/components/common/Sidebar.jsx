import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ChefHat, BookMarked, Calendar,
  ShoppingCart, BarChart2, User, X, PlusCircle, Archive
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/suggest', icon: ChefHat, label: 'Recipes' },
  { to: '/planner', icon: Calendar, label: 'Meal Planner' },
  { to: '/pantry', icon: Archive, label: 'Pantry' },
  { to: '/saved', icon: BookMarked, label: 'Saved Recipes' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping List' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
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
        {/* Header with Title and Universal Close Button */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <h1 className="sidebar-title" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>
                MealCraft
              </h1>
              <p className="sidebar-subtitle" style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em', margin: 0, marginTop: '2px' }}>
                Meal Planner & Recipes
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="sidebar-close-btn"
                aria-label="Close navigation sidebar"
                title="Close sidebar"
              >
                <X size={18} />
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
                // Close sidebar on mobile upon navigation
                if (window.innerWidth <= 768 && onClose) {
                  onClose();
                }
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
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  border: '1px solid var(--border-accent)'
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
              if (window.innerWidth <= 768 && onClose) {
                onClose();
              }
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
            <span>New Recipe</span>
          </button>
        </div>
      </aside>
    </>
  );
}
