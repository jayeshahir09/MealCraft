import { useEffect, useState } from 'react';
import { getAnalytics, logCookedRecipe } from '../api/shoppingListApi';
import { getSavedRecipes } from '../api/recipeApi';
import toast from 'react-hot-toast';
import { TrendingUp, Flame, ChefHat, BarChart2, Clock, BookOpen } from 'lucide-react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, recipesRes] = await Promise.all([
        getAnalytics(),
        getSavedRecipes({}),
      ]);
      setAnalytics(analyticsRes.data);
      setSavedRecipes(recipesRes.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleLog = async (recipeId, title) => {
    try {
      await logCookedRecipe(recipeId, null);
      toast.success(`"${title}" logged! 🍳`);
      loadData();
    } catch { toast.error('Failed to log recipe'); }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  const STAT_CARDS = [
    { label: 'Total Recipes Cooked', value: analytics?.totalCookedRecipes || 0, icon: ChefHat, color: 'var(--accent-primary)' },
    { label: 'Calories This Week', value: `${(analytics?.weeklyCalories || 0).toLocaleString()} kcal`, icon: Flame, color: '#ef4444' },
    { label: 'Saved Recipes', value: savedRecipes.length, icon: BookOpen, color: 'var(--accent-secondary)' },
    { label: 'Top Cuisine', value: analytics?.topCuisines?.[0]?.cuisine || '—', icon: TrendingUp, color: 'var(--accent-info)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }} className="animate-fade-in-up">
      <div>
        <h1 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--on-background)',
          marginBottom: '0.35rem',
          letterSpacing: '-0.02em'
        }}>
          Kitchen Analytics & Habits
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Track your culinary journey, nutrition breakdown, and cuisine preferences.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid-4" style={{ gap: '1.25rem' }}>
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel stat-card" style={{ borderRadius: '1.25rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--on-background)', margin: 0 }}>
                  {value}
                </p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
                  {label}
                </p>
              </div>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '0.75rem',
                background: 'rgba(159, 64, 45, 0.12)',
                border: '1px solid rgba(159, 64, 45, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={20} style={{ color: 'var(--primary)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: '1.75rem' }}>
        {/* Top Cuisines */}
        <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '0.5rem',
                background: 'rgba(159, 64, 45, 0.12)', border: '1px solid rgba(159, 64, 45, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
              </div>
              Top Cuisines
            </h3>
            {analytics?.topCuisines?.length > 0 && (
              <span className="active-tag" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                {analytics.topCuisines.length} Cuisines
              </span>
            )}
          </div>

          {analytics?.topCuisines?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {analytics.topCuisines.map(({ cuisine, count }) => {
                const maxCount = analytics.topCuisines[0]?.count || 1;
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={cuisine} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-background)' }}>
                        {cuisine || 'Various'}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {count} cooked ({pct}%)
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px', background: 'var(--progress-track)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: '9999px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Cook some recipes to see stats!</p>
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '0.5rem',
                background: 'var(--primary-light)', border: '1px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Clock size={18} style={{ color: 'var(--primary)' }} />
              </div>
              Recent History
            </h3>
          </div>

          {analytics?.recentHistory?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.recentHistory.map(h => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    background: 'var(--surface-container)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span style={{ fontSize: '1.35rem' }}>🍽️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-background)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.recipeTitle}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px', fontWeight: 500 }}>
                      {new Date(h.cookedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍳</div>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No cooking history yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Log a cooked recipe */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', marginBottom: '0.35rem' }}>
            🍳 Log a Cooked Recipe
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', margin: 0 }}>
            Mark a saved dish as cooked to update your nutritional and cooking streak stats.
          </p>
        </div>

        {savedRecipes.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Save some recipes first from the AI Studio!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            {savedRecipes.map(recipe => (
              <button
                key={recipe.id}
                className="quick-add-pill"
                onClick={() => handleLog(recipe.id, recipe.title)}
                style={{ padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ChefHat size={14} style={{ color: 'var(--primary)' }} />
                <span>{recipe.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
