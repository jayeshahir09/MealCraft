import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  BookmarkCheck,
  MoreHorizontal,
  ShoppingCart,
  BarChart2,
  User,
  LogOut,
  X,
  ChevronRight,
  Archive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MAIN_TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/suggest', icon: Sparkles, label: 'Recipes' },
  { to: '/planner', icon: Calendar, label: 'Meal Plan' },
  { to: '/saved', icon: BookmarkCheck, label: 'Saved' },
];

const MORE_LINKS = [
  { to: '/pantry', icon: Archive, label: 'Pantry Inventory', desc: 'Manage in-stock ingredients' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping List', desc: 'Grocery list & ingredients' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics', desc: 'Nutrition & cooking stats' },
  { to: '/profile', icon: User, label: 'Profile', desc: 'Diet preferences & allergies' },
];

export default function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setShowMore(false);
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const isMoreActive = MORE_LINKS.some(link => location.pathname === link.to);

  return (
    <>
      {/* Bottom Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <div className="mobile-bottom-nav-inner">
          {MAIN_TABS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setShowMore(false)}
              className={({ isActive }) =>
                `mobile-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={20} className="mobile-nav-icon" />
              <span className="mobile-nav-label">{label}</span>
            </NavLink>
          ))}

          {/* More Tab */}
          <button
            type="button"
            onClick={() => setShowMore(prev => !prev)}
            className={`mobile-nav-item ${isMoreActive || showMore ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            aria-label="More options"
          >
            <MoreHorizontal size={20} className="mobile-nav-icon" />
            <span className="mobile-nav-label">More</span>
          </button>
        </div>
      </nav>

      {/* More Options Bottom Sheet */}
      {showMore && (
        <div
          className="modal-overlay animate-fade-in"
          style={{ zIndex: 10001, alignItems: 'flex-end', padding: 0 }}
          onClick={() => setShowMore(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              margin: '0 auto',
              borderTopLeftRadius: '1.5rem',
              borderTopRightRadius: '1.5rem',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              padding: '1.5rem',
              paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
              background: 'var(--surface-container-high)',
              border: '1px solid var(--border-color)',
              borderBottom: 'none',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
              animation: 'slide-up 0.25s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                    {user?.name || 'My Account'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {user?.email || 'MealCraft Member'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowMore(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Links List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {MORE_LINKS.map(({ to, icon: Icon, label, desc }) => {
                const isActive = location.pathname === to;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setShowMore(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: '0.85rem',
                      textDecoration: 'none',
                      background: isActive ? 'var(--primary-light)' : 'var(--surface-container)',
                      border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '0.65rem',
                        background: isActive ? 'var(--primary)' : 'var(--surface-container-high)',
                        color: isActive ? '#fff' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--on-background)' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </NavLink>
                );
              })}
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem',
                borderRadius: '0.85rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
