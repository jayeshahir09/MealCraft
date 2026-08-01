import { useEffect, useState } from 'react';
import { getSavedRecipes, deleteRecipe } from '../api/recipeApi';
import toast from 'react-hot-toast';
import { Search, Trash2, Clock, Flame, BookMarked } from 'lucide-react';

const CUISINES = ['', 'Italian', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'Thai', 'Mediterranean', 'American'];

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('');

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const res = await getSavedRecipes({ query: query || undefined, cuisine: cuisine || undefined });
      setRecipes(res.data);
    } catch { toast.error('Failed to load recipes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecipes(); }, [query, cuisine]);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await deleteRecipe(id);
      setRecipes(p => p.filter(r => r.id !== id));
      toast.success('Recipe deleted');
    } catch { toast.error('Failed to delete recipe'); }
  };

  const cuisineEmojis = { Italian: '🍝', Mexican: '🌮', Indian: '🍛', Chinese: '🍜', Japanese: '🍣', Default: '🍽️' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <span className="gradient-text">Saved</span> Recipes
        </h1>
        <p className="text-secondary">Your personal recipe collection.</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="recipe-search"
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search recipes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: 180 }} value={cuisine} onChange={e => setCuisine(e.target.value)}>
            {CUISINES.map(c => <option key={c} value={c}>{c || 'All cuisines'}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <h3>No saved recipes yet</h3>
          <p className="text-secondary">Go to AI Recipe Suggestions and save some recipes!</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</p>
          <div className="grid-3">
            {recipes.map(recipe => (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-card-image">
                  {cuisineEmojis[recipe.cuisine] || cuisineEmojis.Default}
                  {recipe.cuisine && (
                    <span className="badge badge-accent" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                      {recipe.cuisine}
                    </span>
                  )}
                </div>
                <div className="recipe-card-body">
                  <h3 className="recipe-card-title">{recipe.title}</h3>
                  <div className="recipe-card-meta">
                    {recipe.estimatedTimeMinutes && (
                      <span className="recipe-card-meta-item"><Clock size={13} /> {recipe.estimatedTimeMinutes} min</span>
                    )}
                    {recipe.estimatedCalories && (
                      <span className="recipe-card-meta-item"><Flame size={13} /> {recipe.estimatedCalories} kcal</span>
                    )}
                  </div>
                  {recipe.ingredients?.length > 0 && (
                    <p className="text-xs text-muted">
                      {recipe.ingredients.slice(0, 4).map(i => i.name).join(', ')}
                      {recipe.ingredients.length > 4 ? '...' : ''}
                    </p>
                  )}
                  <div className="recipe-card-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(recipe.id, recipe.title)}
                      style={{ flex: 1 }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
