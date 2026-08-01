import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSavedRecipes } from '../api/recipeApi';
import { getAnalytics } from '../api/shoppingListApi';

import { ChefHat, BookMarked, Calendar, ShoppingCart, Flame, TrendingUp, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ saved: 0, weeklyCalories: 0, totalCooked: 0, topCuisine: '—' });
  const [recentRecipes, setRecentRecipes] = useState([]);

  useEffect(() => {
    getSavedRecipes({}).then(r => {
      setRecentRecipes(r.data.slice(0, 3));
      setStats(s => ({ ...s, saved: r.data.length }));
    }).catch(() => {});

    getAnalytics().then(r => {
      const d = r.data;
      setStats(s => ({
        ...s,
        weeklyCalories: d.weeklyCalories || 0,
        totalCooked: d.totalCookedRecipes || 0,
        topCuisine: d.topCuisines?.[0]?.cuisine || '—',
      }));
    }).catch(() => {});
  }, []);

  const QUICK_ACTIONS = [
    { to: '/suggest', icon: ChefHat, label: 'AI Recipe Suggestions', desc: 'Get recipes from your pantry', color: 'var(--accent-primary)' },
    { to: '/planner', icon: Calendar, label: 'Weekly Planner', desc: 'Plan meals for the week', color: 'var(--accent-info)' },
    { to: '/shopping', icon: ShoppingCart, label: 'Shopping List', desc: 'Generate from your plan', color: 'var(--accent-secondary)' },
    { to: '/saved', icon: BookMarked, label: 'Saved Recipes', desc: 'Browse your collection', color: '#ec4899' },
  ];

  const STAT_CARDS = [
    { label: 'Saved Recipes', value: stats.saved, icon: BookMarked, color: 'var(--accent-primary)' },
    { label: 'Recipes Cooked', value: stats.totalCooked, icon: ChefHat, color: 'var(--accent-secondary)' },
    { label: 'Weekly Calories', value: `${stats.weeklyCalories.toLocaleString()} kcal`, icon: Flame, color: '#ef4444' },
    { label: 'Top Cuisine', value: stats.topCuisine, icon: TrendingUp, color: 'var(--accent-info)' },
  ];

  const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero greeting */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(99,102,241,0.1) 100%)',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', fontSize: '6rem', opacity: 0.15 }}>
          🍽️
        </div>
        <p style={{ color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          {getTimeOfDay()},
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.75rem' }}>
          {user?.name} 👋
        </h1>
        <p className="text-secondary">What would you like to cook today? Let AI find the perfect recipe for you.</p>
        <Link to="/suggest" className="btn btn-primary" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>
          <ChefHat size={18} /> Generate Recipes
        </Link>
      </div>

      {/* Stats */}
      <div className="grid-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="stat-value">{value}</p>
                <p className="stat-label">{label}</p>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={20} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="grid-2">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, desc, color }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{label}</h4>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Recipes */}
      {recentRecipes.length > 0 && (
        <div>
          <div className="section-header">
            <h2 className="section-title">Recent Recipes</h2>
            <Link to="/saved" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentRecipes.map(recipe => (
              <div key={recipe.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '1.5rem' }}>{getCuisineEmoji(recipe.cuisine)}</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{recipe.title}</h4>
                  <div className="flex gap-3" style={{ marginTop: '0.25rem' }}>
                    {recipe.estimatedTimeMinutes && (
                      <span className="text-xs text-muted flex items-center gap-2">
                        <Clock size={12} /> {recipe.estimatedTimeMinutes} min
                      </span>
                    )}
                    {recipe.cuisine && (
                      <span className="chip chip-accent" style={{ fontSize: '0.7rem', padding: '1px 8px' }}>{recipe.cuisine}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getCuisineEmoji(cuisine) {
  const map = {
    Italian: '🍝', Mexican: '🌮', Indian: '🍛', Chinese: '🍜',
    Japanese: '🍣', Thai: '🍜', American: '🍔', Mediterranean: '🥗', Default: '🍽️'
  };
  return map[cuisine] || map.Default;
}
