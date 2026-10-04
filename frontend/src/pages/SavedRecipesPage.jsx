import { useEffect, useState } from 'react';
import { getSavedRecipes, deleteRecipe } from '../api/recipeApi';
import toast from 'react-hot-toast';
import { Search, Trash2, Clock, Flame, ChefHat, X, Utensils, Check, Globe } from 'lucide-react';
import RecipeDetailModal from '../components/common/RecipeDetailModal';
import CustomDropdown from '../components/common/CustomDropdown';
import { POPULAR_CUISINES } from '../utils/cuisines';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const res = await getSavedRecipes({ query: query || undefined, cuisine: cuisine || undefined });
      const raw = Array.isArray(res.data) ? res.data : [];
      // Guarantee unique collection by title
      const unique = Array.from(new Map(raw.map(r => [r.title?.trim().toLowerCase(), r])).values());
      setRecipes(unique);
    } catch { toast.error('Failed to load recipes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecipes(); }, [query, cuisine]);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await deleteRecipe(id);
      setRecipes(p => p.filter(r => r.id !== id));
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
      toast.success('Recipe deleted');
    } catch { toast.error('Failed to delete recipe'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }} className="animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--on-background)',
          marginBottom: '0.35rem',
          letterSpacing: '-0.02em'
        }}>
          Saved Recipes
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Your curated cookbook of chef-crafted recipes with full cooking steps.
        </p>
      </div>

      {/* Search & Cuisine Filter Toolbar */}
      <div className="glass-panel" style={{
        padding: '1.5rem 1.75rem',
        borderRadius: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        border: '1.5px solid rgba(159, 64, 45, 0.22)',
        position: 'relative',
        zIndex: 50
      }}>
        {/* Search Bar Row */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={19} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
          <input
            type="text"
            className="form-input"
            style={{
              padding: '0.9rem 2.75rem 0.9rem 3rem',
              fontSize: '0.95rem',
              borderRadius: '0.875rem'
            }}
            placeholder="Search saved recipes by title, ingredients..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '1.1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Cuisine Selection Row: Top 4 Pills + Refined Custom Dropdown */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', marginRight: '0.25rem' }}>
              Cuisines:
            </span>
            {POPULAR_CUISINES.slice(0, 4).map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCuisine(c.id)}
                className={`stitch-pill-btn${cuisine === c.id ? ' active' : ''}`}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.825rem',
                  padding: '0.45rem 0.95rem',
                  border: cuisine === c.id ? '1.5px solid var(--primary)' : '1.5px solid rgba(159, 64, 45, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', lineHeight: 1 }}>{c.emoji}</span>
                <span style={{ lineHeight: 1.2 }}>{c.label}</span>
              </button>
            ))}

            {/* If selected cuisine is outside top 4, show it as an active pill */}
            {cuisine && !POPULAR_CUISINES.slice(0, 4).some(c => c.id === cuisine) && (
              <button
                type="button"
                onClick={() => setCuisine('')}
                className="stitch-pill-btn active"
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.825rem',
                  padding: '0.45rem 0.95rem',
                  border: '1.5px solid var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', lineHeight: 1 }}>{POPULAR_CUISINES.find(c => c.id === cuisine)?.emoji || '🍽️'}</span>
                <span style={{ lineHeight: 1.2 }}>{POPULAR_CUISINES.find(c => c.id === cuisine)?.label || cuisine}</span>
                <X size={13} style={{ flexShrink: 0 }} />
              </button>
            )}
          </div>

          <CustomDropdown
            options={POPULAR_CUISINES}
            value={cuisine}
            onChange={(newCuisine) => setCuisine(newCuisine)}
            placeholder="All Cuisines..."
            minWidth="170px"
          />
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : recipes.length === 0 ? (
        <div className="glass-panel empty-state" style={{ borderRadius: '1.25rem', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--on-background)', marginBottom: '0.5rem' }}>
            {query || cuisine ? 'No recipes match your filter' : 'No saved recipes yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {query || cuisine ? 'Try clearing your search query or selecting a different cuisine.' : 'Head over to the AI Recipe Studio to create and save delicious custom dishes!'}
          </p>
          {(query || cuisine) && (
            <button
              className="quick-add-pill"
              onClick={() => { setQuery(''); setCuisine(''); }}
              style={{ marginTop: '1rem', padding: '0.5rem 1.25rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Showing {recipes.length} curated recipe{recipes.length !== 1 ? 's' : ''}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem'
          }}>
            {recipes.map((recipe, idx) => {
              return (
                <div
                  key={recipe.id}
                  className="stitch-recipe-card animate-fade-in-scale"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div style={{
                    padding: '1.25rem 1.5rem 0.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    {recipe.cuisine ? (
                      <span className="recipe-badge-cuisine" style={{ fontSize: '0.8rem' }}>
                        <Globe size={13} /> {recipe.cuisine}
                      </span>
                    ) : (
                      <span className="recipe-badge-cuisine" style={{ fontSize: '0.8rem' }}>
                        <ChefHat size={13} /> Gourmet
                      </span>
                    )}
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '0.65rem',
                      background: 'rgba(159, 64, 45, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)'
                    }}>
                      <ChefHat size={17} />
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--on-background)',
                      marginBottom: '0.5rem',
                      lineHeight: 1.3
                    }}>
                      {recipe.title}
                    </h3>

                    <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {recipe.estimatedTimeMinutes && (
                        <span className="quick-add-pill" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                          <Clock size={12} style={{ color: 'var(--primary)' }} /> {recipe.estimatedTimeMinutes} min
                        </span>
                      )}
                      {recipe.estimatedCalories && (
                        <span className="quick-add-pill" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                          <Flame size={12} style={{ color: 'var(--primary)' }} /> {recipe.estimatedCalories} kcal
                        </span>
                      )}
                    </div>

                    {recipe.ingredients?.length > 0 && (
                      <p style={{ fontSize: '0.825rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem', flex: 1, lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--on-background)' }}>Ingredients: </strong>
                        {recipe.ingredients.slice(0, 4).map(i => i.name || i).join(', ')}
                        {recipe.ingredients.length > 4 ? '...' : ''}
                      </p>
                    )}

                    {/* Action Buttons: View Steps & Delete */}
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedRecipe(recipe)}
                        style={{
                          flex: 1.5,
                          borderRadius: '0.75rem',
                          background: 'var(--primary)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.6rem 1rem'
                        }}
                      >
                        <ChefHat size={15} /> <span>View Steps</span>
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(recipe.id, recipe.title)}
                        style={{
                          flex: 1,
                          borderRadius: '0.75rem',
                          justifyContent: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                        title="Delete recipe"
                      >
                        <Trash2 size={14} /> <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Recipe Steps Detail Modal with background scroll locked */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          isSaved={true}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
