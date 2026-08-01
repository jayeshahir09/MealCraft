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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <span className="gradient-text">Analytics</span> & History
        </h1>
        <p className="text-secondary">Track your cooking habits and nutrition trends.</p>
      </div>

      {/* Stats */}
      <div className="grid-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="stat-value" style={{ fontSize: '1.5rem' }}>{value}</p>
                <p className="stat-label">{label}</p>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Top Cuisines */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={20} style={{ color: 'var(--accent-primary)' }} /> Top Cuisines
          </h3>
          {analytics?.topCuisines?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.topCuisines.map(({ cuisine, count }) => {
                const maxCount = analytics.topCuisines[0]?.count || 1;
                const pct = (count / maxCount) * 100;
                return (
                  <div key={cuisine}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{cuisine || 'Unknown'}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{count}x</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p className="text-muted">Cook some recipes to see stats!</p>
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} /> Recent History
          </h3>
          {analytics?.recentHistory?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {analytics.recentHistory.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '1.25rem' }}>🍽️</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{h.recipeTitle}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(h.cookedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p className="text-muted">No cooking history yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Log a cooked recipe */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem' }}>🍳 Log a Cooked Recipe</h3>
        <p className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>Mark a saved recipe as cooked to track your history.</p>
        {savedRecipes.length === 0 ? (
          <p className="text-muted">Save some recipes first!</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {savedRecipes.map(recipe => (
              <button
                key={recipe.id}
                className="btn btn-secondary btn-sm"
                onClick={() => handleLog(recipe.id, recipe.title)}
              >
                <ChefHat size={14} /> {recipe.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
