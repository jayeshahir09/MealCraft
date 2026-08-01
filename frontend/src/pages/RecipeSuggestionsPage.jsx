import { useState } from 'react';
import { suggestRecipes, saveRecipe } from '../api/recipeApi';
import toast from 'react-hot-toast';
import { Sparkles, Clock, Flame, ChefHat, BookmarkPlus, RefreshCw, X, Plus } from 'lucide-react';

const DIETS = ['NONE', 'VEGETARIAN', 'VEGAN', 'KETO', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_CARB'];
const CUISINES = ['', 'Italian', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'Thai', 'Mediterranean', 'American', 'French'];

export default function RecipeSuggestionsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [diet, setDiet] = useState('NONE');
  const [allergies, setAllergies] = useState([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [remaining, setRemaining] = useState(null);

  const addIngredient = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault();
      const val = inputVal.trim().toLowerCase();
      if (!ingredients.includes(val)) setIngredients(prev => [...prev, val]);
      setInputVal('');
    }
  };

  const addAllergy = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && allergyInput.trim()) {
      e.preventDefault();
      const val = allergyInput.trim().toLowerCase();
      if (!allergies.includes(val)) setAllergies(prev => [...prev, val]);
      setAllergyInput('');
    }
  };

  const handleSuggest = async () => {
    if (ingredients.length === 0) return toast.error('Add at least one ingredient');
    setLoading(true);
    try {
      const res = await suggestRecipes({
        ingredients,
        dietType: diet,
        allergies,
        cuisine: cuisine || null,
        maxTimeMinutes: maxTime ? parseInt(maxTime) : null,
      });
      setRecipes(res.data.recipes);
      setRemaining(res.data.remainingCallsToday);
      if (res.data.recipes.length === 0) toast('No recipes found. Try different ingredients.');
      else toast.success(`Found ${res.data.recipes.length} recipes! ✨`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI service error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (recipe) => {
    try {
      await saveRecipe(recipe);
      toast.success(`"${recipe.title}" saved! 📖`);
    } catch {
      toast.error('Failed to save recipe');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <span className="gradient-text">AI Recipe</span> Suggestions
        </h1>
        <p className="text-secondary">Enter your ingredients and get personalized recipe ideas.</p>
      </div>

      {/* Input Panel */}
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Ingredients */}
          <div className="form-group">
            <label className="form-label">🥦 Your Ingredients</label>
            <div className="chips-input-container" onClick={() => document.getElementById('ing-input').focus()}>
              {ingredients.map(ing => (
                <span key={ing} className="chip chip-accent">
                  {ing}
                  <button className="chip-remove" onClick={() => setIngredients(p => p.filter(i => i !== ing))}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                id="ing-input"
                className="chips-input-field"
                placeholder={ingredients.length === 0 ? "Type ingredient, press Enter..." : "Add more..."}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={addIngredient}
              />
            </div>
            <p className="text-xs text-muted">Press Enter or comma to add an ingredient</p>
          </div>

          <div className="grid-2">
            {/* Diet */}
            <div className="form-group">
              <label className="form-label">🥗 Diet Type</label>
              <div className="toggle-group">
                {DIETS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`toggle-option${diet === d ? ' active' : ''}`}
                    onClick={() => setDiet(d)}
                  >
                    {d === 'NONE' ? 'No Restriction' : d.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="form-group">
              <label className="form-label">⚠️ Allergies (strictly excluded)</label>
              <div className="chips-input-container">
                {allergies.map(a => (
                  <span key={a} className="chip chip-red">
                    {a}
                    <button className="chip-remove" onClick={() => setAllergies(p => p.filter(x => x !== a))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  className="chips-input-field"
                  placeholder="e.g., peanuts, shellfish..."
                  value={allergyInput}
                  onChange={e => setAllergyInput(e.target.value)}
                  onKeyDown={addAllergy}
                />
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">🌍 Cuisine Preference</label>
              <select className="form-select" value={cuisine} onChange={e => setCuisine(e.target.value)}>
                {CUISINES.map(c => <option key={c} value={c}>{c || 'Any cuisine'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">⏱️ Max Cooking Time (minutes)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g., 30"
                value={maxTime}
                onChange={e => setMaxTime(e.target.value)}
                min="5"
                max="300"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              id="suggest-btn"
              className="btn btn-primary btn-lg"
              onClick={handleSuggest}
              disabled={loading || ingredients.length === 0}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Asking AI...</>
              ) : (
                <><Sparkles size={18} /> Suggest Recipes</>
              )}
            </button>
            {remaining !== null && (
              <p className="text-xs text-muted">{remaining} AI calls remaining today</p>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto', width: 48, height: 48 }} />
          <p className="text-secondary" style={{ marginTop: '1rem' }}>AI is crafting your recipes... ✨</p>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div>
          <div className="section-header">
            <h2 className="section-title">Suggested Recipes ({recipes.length})</h2>
            <button className="btn btn-secondary btn-sm" onClick={handleSuggest}>
              <RefreshCw size={14} /> Regenerate
            </button>
          </div>
          <div className="grid-3">
            {recipes.map((recipe, i) => (
              <RecipeCard
                key={i}
                recipe={recipe}
                onSave={() => handleSave(recipe)}
                onView={() => setSelectedRecipe(recipe)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} onSave={() => handleSave(selectedRecipe)} />
      )}
    </div>
  );
}

function RecipeCard({ recipe, onSave, onView }) {
  const cuisineEmojis = { Italian: '🍝', Mexican: '🌮', Indian: '🍛', Chinese: '🍜', Japanese: '🍣', Default: '🍽️' };
  const emoji = cuisineEmojis[recipe.cuisine] || cuisineEmojis.Default;

  return (
    <div className="recipe-card">
      <div className="recipe-card-image">
        {emoji}
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
        {recipe.usedIngredients?.length > 0 && (
          <p className="text-xs text-muted">
            Uses: {recipe.usedIngredients.slice(0, 4).join(', ')}{recipe.usedIngredients.length > 4 ? '...' : ''}
          </p>
        )}
        {recipe.missingIngredients?.length > 0 && (
          <p className="text-xs" style={{ color: '#fb923c' }}>
            Missing: {recipe.missingIngredients.map(m => m.name).slice(0, 3).join(', ')}
          </p>
        )}
        <div className="recipe-card-actions">
          <button className="btn btn-secondary btn-sm" onClick={onView} style={{ flex: 1 }}>
            <ChefHat size={14} /> View
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSave} style={{ flex: 1 }}>
            <BookmarkPlus size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function RecipeDetailModal({ recipe, onClose, onSave }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>{recipe.title}</h2>
            <div className="flex gap-3">
              {recipe.cuisine && <span className="chip chip-accent">{recipe.cuisine}</span>}
              {recipe.estimatedTimeMinutes && <span className="chip"><Clock size={12} /> {recipe.estimatedTimeMinutes} min</span>}
              {recipe.estimatedCalories && <span className="chip"><Flame size={12} /> {recipe.estimatedCalories} kcal</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {recipe.usedIngredients?.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>✅ Ingredients You Have</h4>
              <div className="flex flex-wrap gap-2">
                {recipe.usedIngredients.map(i => <span key={i} className="chip chip-green">{i}</span>)}
              </div>
            </div>
          )}

          {recipe.missingIngredients?.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>🛒 Missing Ingredients</h4>
              <div className="flex flex-wrap gap-2">
                {recipe.missingIngredients.map(m => (
                  <span key={m.name} className="chip chip-red">{m.quantity} {m.unit} {m.name}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>📋 Instructions</h4>
            <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recipe.steps?.map((step, i) => (
                <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="flex gap-3" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-primary" onClick={() => { onSave(); onClose(); }} style={{ flex: 1 }}>
              <BookmarkPlus size={16} /> Save Recipe
            </button>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
