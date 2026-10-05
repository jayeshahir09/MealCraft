import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { suggestRecipes, saveRecipe, getSavedRecipes, getAiCredits } from '../api/recipeApi';
import { getPantry } from '../api/pantryApi';
import { getPreferences } from '../api/shoppingListApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import RecipeDetailModal from '../components/common/RecipeDetailModal';
import PrepTimeSlider from '../components/common/PrepTimeSlider';
import CustomDropdown from '../components/common/CustomDropdown';
import { POPULAR_CUISINES, ALL_DIETS } from '../utils/cuisines';
import IngredientAutocomplete from '../components/common/IngredientAutocomplete';
import { findMasterIngredient, normalizeIngredientName, POPULAR_STAPLES, MASTER_INGREDIENTS } from '../utils/ingredients';
import {
  Sparkles, Clock, Flame, ChefHat, BookmarkPlus, RefreshCw,
  X, Plus, Zap, Utensils, CheckCircle2, Check, Globe, Bookmark
} from 'lucide-react';

export default function RecipeSuggestionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [ingredients, setIngredients] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [diet, setDiet] = useState('NONE');
  const [allergies, setAllergies] = useState([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [maxTime, setMaxTime] = useState(30);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [savedRecipeTitles, setSavedRecipeTitles] = useState(new Set());
  const [savingRecipeTitle, setSavingRecipeTitle] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);

  // Fetch real pantry items, user preferences, and existing saved recipes on mount
  useEffect(() => {
    getPantry()
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const names = res.data.map(item => item.ingredientName || item.name).filter(Boolean);
          setPantryItems(names);
        }
      })
      .catch(() => {});

    getSavedRecipes({})
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          const titles = new Set(res.data.map(r => r.title?.trim().toLowerCase()).filter(Boolean));
          setSavedRecipeTitles(titles);
        }
      })
      .catch(() => {});

    getPreferences()
      .then(res => {
        if (res.data) {
          if (res.data.dietType && !searchParams.get('diet')) setDiet(res.data.dietType);
          if (res.data.allergies && res.data.allergies.length > 0) setAllergies(res.data.allergies);
          if (res.data.preferredCuisine && !searchParams.get('cuisine')) setCuisine(res.data.preferredCuisine);
          if (res.data.maxCookTimeMinutes && !searchParams.get('maxTime')) setMaxTime(res.data.maxCookTimeMinutes);
        }
      })
      .catch(() => {});

    getAiCredits()
      .then(res => {
        if (res.data?.remainingCallsToday !== undefined) {
          setRemaining(res.data.remainingCallsToday);
        }
      })
      .catch(() => {});
  }, []);

  // Parse URL search params from Quick AI Shortcuts or Pantry actions
  useEffect(() => {
    const dietParam = searchParams.get('diet');
    const maxTimeParam = searchParams.get('maxTime');
    const cuisineParam = searchParams.get('cuisine');
    const ingredientsParam = searchParams.get('ingredients');

    if (dietParam) {
      setDiet(dietParam.toUpperCase());
    }
    if (maxTimeParam) {
      const parsedTime = parseInt(maxTimeParam, 10);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        setMaxTime(parsedTime);
      }
    }
    if (cuisineParam) {
      setCuisine(cuisineParam);
    }
    if (ingredientsParam) {
      const ings = ingredientsParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (ings.length > 0) {
        setIngredients(prev => Array.from(new Set([...prev, ...ings])));
      }
    }
  }, [searchParams]);

  const handleAddCanonicalIngredient = (itemOrName) => {
    const rawName = typeof itemOrName === 'string' ? itemOrName : itemOrName.name;
    if (!rawName || !rawName.trim()) return;
    const canonical = normalizeIngredientName(rawName);
    if (!ingredients.some(i => i.toLowerCase() === canonical.toLowerCase())) {
      setIngredients(prev => [...prev, canonical]);
    }
    setInputVal('');
  };

  const removeIngredient = (ing) => {
    setIngredients(prev => prev.filter(i => i.toLowerCase() !== ing.toLowerCase()));
  };

  const togglePantryIngredient = (item) => {
    const canonical = normalizeIngredientName(item);
    if (ingredients.some(i => i.toLowerCase() === canonical.toLowerCase())) {
      setIngredients(prev => prev.filter(i => i.toLowerCase() !== canonical.toLowerCase()));
    } else {
      setIngredients(prev => [...prev, canonical]);
    }
  };

  const addAllergy = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && allergyInput.trim()) {
      e.preventDefault();
      const val = allergyInput.trim().toLowerCase();
      if (!allergies.includes(val)) {
        setAllergies(prev => [...prev, val]);
      }
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergy) => {
    setAllergies(prev => prev.filter(a => a !== allergy));
  };

  const handleSuggest = async () => {
    if (ingredients.length === 0) return toast.error('Please add at least one ingredient');
    setLoading(true);
    try {
      const res = await suggestRecipes({
        ingredients,
        dietType: diet === 'NONE' ? null : diet,
        allergies,
        cuisine: cuisine || null,
        maxTimeMinutes: maxTime ? parseInt(maxTime) : null,
      });
      if (res.data?.recipes?.length > 0) {
        setRecipes(res.data.recipes);
      }
      if (res.data.remainingCallsToday !== undefined) {
        setRemaining(res.data.remainingCallsToday);
      }
      toast.success(`Generated ${res.data.recipes?.length || 3} gourmet recipes! ✨`);
      setTimeout(() => {
        document.getElementById('curated-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI service error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (recipe) => {
    const key = recipe.title?.trim().toLowerCase();
    if (savedRecipeTitles.has(key)) {
      toast('Recipe is already in your saved cookbook! 📖', { icon: '✨' });
      return;
    }
    setSavingRecipeTitle(recipe.title);
    try {
      await saveRecipe(recipe);
      setSavedRecipeTitles(prev => new Set([...prev, key]));
      toast.success(`"${recipe.title}" saved to your cookbook! 📖`);
    } catch {
      toast.error('Failed to save recipe');
    } finally {
      setSavingRecipeTitle(null);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
      {/* Header Title Section */}
      <div style={{ marginBottom: searchParams.toString() ? '1.5rem' : '2.5rem' }} className="animate-fade-in-up">
        <h2 style={{
          fontSize: 'clamp(2rem, 3.5vw, 3rem)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--on-background)',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em'
        }}>
          AI Recipe Craft
        </h2>
        <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Curate your ingredients and set parameters. Our culinary AI will handle the rest.
        </p>
      </div>

      {searchParams.toString() && (
        <div
          className="animate-fade-in-up"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderRadius: '1rem',
            background: 'rgba(238, 108, 77, 0.1)',
            border: '1px solid rgba(238, 108, 77, 0.25)',
            marginBottom: '2rem',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>⚡ Preset Applied:</span>
            {searchParams.get('diet') && (
              <span className="quick-add-pill" style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.78rem' }}>
                Diet: {searchParams.get('diet').replace('_', ' ')}
              </span>
            )}
            {searchParams.get('maxTime') && (
              <span className="quick-add-pill" style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.78rem' }}>
                Max Time: ≤ {searchParams.get('maxTime')} min
              </span>
            )}
            {searchParams.get('cuisine') && (
              <span className="quick-add-pill" style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.78rem' }}>
                Cuisine: {searchParams.get('cuisine')}
              </span>
            )}
            {searchParams.get('ingredients') && (
              <span className="quick-add-pill" style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.78rem' }}>
                Pantry Ingredients Loaded ({searchParams.get('ingredients').split(',').length})
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Step 1: Ingredients Section */}
        <section
          className="glass-panel animate-fade-in-up delay-100"
          style={{
            borderRadius: '1.25rem',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Vertical Left Accent Ribbon */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '6px',
            height: '100%',
            background: 'var(--primary)',
            borderRadius: '4px 0 0 4px'
          }} />

          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div className="step-badge-1">1</div>
            <h3 style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--on-background)',
              margin: 0
            }}>
              Curate Ingredients
            </h3>
          </div>

          {/* 1. Input Field with Autocomplete & Add Button */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <IngredientAutocomplete
                  value={inputVal}
                  onChange={setInputVal}
                  onSelect={(item) => handleAddCanonicalIngredient(item)}
                  placeholder="Search ingredient (e.g. Salmon, Garlic, Spinach)..."
                  showStaples={false}
                />
              </div>
              <button
                onClick={() => handleAddCanonicalIngredient(inputVal)}
                type="button"
                className="btn btn-primary"
                style={{
                  height: '42px',
                  padding: '0 1.25rem',
                  borderRadius: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700
                }}
                title="Add Ingredient"
              >
                <Plus size={16} /> <span>Add</span>
              </button>
            </div>
          </div>

          {/* 2. Active Canvas Tags Container - Directly Under Input Field */}
          <div style={{
            marginBottom: '1.5rem',
            background: 'var(--surface-container)',
            border: '1.5px dashed var(--border-color)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <p style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0
              }}>
                Active Ingredients ({ingredients.length} item{ingredients.length !== 1 ? 's' : ''})
              </p>
              {ingredients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIngredients([])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {ingredients.map((ing) => {
                const master = findMasterIngredient(ing);
                return (
                  <span key={ing} className="active-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.85rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{master?.emoji || '🥕'}</span>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{ing}</span>
                    <button
                      onClick={() => removeIngredient(ing)}
                      className="stitch-tag-remove"
                      aria-label={`Remove ${ing}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
              {ingredients.length === 0 && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                  No ingredients added yet. Type an ingredient above or tap quick staples below to add.
                </span>
              )}
            </div>
          </div>

          {/* 3. Quick Master Staples Section */}
          <div style={{ marginBottom: pantryItems.length > 0 ? '1.25rem' : 0 }}>
            <p style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.55rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              <span>Quick Master Staples</span>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {POPULAR_STAPLES.map((stapleName) => {
                const master = MASTER_INGREDIENTS.find(i => i.name === stapleName);
                const isAdded = ingredients.includes(stapleName.toLowerCase());
                return (
                  <button
                    key={stapleName}
                    type="button"
                    onClick={() => handleAddCanonicalIngredient(master || stapleName)}
                    className={`quick-add-pill ${isAdded ? 'active-pantry-pill' : ''}`}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      borderRadius: '2rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      border: isAdded ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      color: isAdded ? 'var(--primary)' : 'var(--text-primary)',
                      background: isAdded ? 'var(--primary-light)' : 'var(--surface-container)',
                      fontWeight: isAdded ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    <span>{master?.emoji || '🥕'}</span>
                    <span>{stapleName}</span>
                    {isAdded && <Check size={12} style={{ color: 'var(--primary)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Quick Add from Pantry (Only when user has pantry stock) */}
          {pantryItems.length > 0 && (
            <div>
              <p style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.55rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}>
                <Utensils size={14} style={{ color: 'var(--primary)' }} />
                <span>My Kitchen Pantry ({pantryItems.length})</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {pantryItems.map((item) => {
                  const isAdded = ingredients.includes(item.toLowerCase());
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePantryIngredient(item)}
                      className={`quick-add-pill ${isAdded ? 'active-pantry-pill' : ''}`}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        borderRadius: '2rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: isAdded ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                        color: isAdded ? 'var(--primary)' : 'var(--text-primary)',
                        background: isAdded ? 'var(--primary-light)' : 'var(--surface-container)',
                        fontWeight: isAdded ? 700 : 500
                      }}
                    >
                      {isAdded && <Check size={12} style={{ color: 'var(--primary)' }} />}
                      <span style={{ textTransform: 'capitalize' }}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Refinements & Constraints */}
        <section
          className="glass-panel animate-fade-in-up delay-200"
          style={{
            borderRadius: '1.25rem',
            padding: '2rem',
            position: 'relative'
          }}
        >
          {/* Vertical Left Accent Ribbon */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '6px',
            height: '100%',
            background: 'var(--secondary)',
            borderRadius: '4px 0 0 4px'
          }} />

          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2rem' }}>
            <div className="step-badge-2">2</div>
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--on-background)',
                margin: 0
              }}>
                Refinements & Constraints
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
                Select dietary patterns, regional inspirations, and cooking time bounds.
              </p>
            </div>
          </div>

          {/* Dietary Profile & Cuisine Inspiration 50/50 Full-Width Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: '1.75rem',
            width: '100%',
            marginBottom: '1.75rem'
          }}>
            {/* Dietary Profile Refined Structure (Takes 50% full left width) */}
            <div style={{
              background: 'var(--surface-container)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              width: '100%'
            }}>
              {/* Card Header with Icon & Custom Dropdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '0.75rem',
                    background: 'rgba(52, 211, 153, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', flexShrink: 0
                  }}>
                    🥗
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                      Dietary Profile
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      {ALL_DIETS.find(d => d.id === diet)?.label || 'Select restriction'}
                    </span>
                  </div>
                </div>

                {/* Refined Glassmorphic Selection Menu */}
                <CustomDropdown
                  options={ALL_DIETS}
                  value={diet}
                  onChange={(newDiet) => setDiet(newDiet)}
                  placeholder="More Diets..."
                  minWidth="155px"
                />
              </div>

              {/* Full-Width 4-Option Grid + Dynamic Selected Pill */}
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                  Quick Selection:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '0.6rem',
                  width: '100%'
                }}>
                  {ALL_DIETS.slice(0, 4).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiet(d.id)}
                      className={`stitch-pill-btn${diet === d.id ? ' active' : ''}`}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '0.65rem 0.5rem',
                        border: diet === d.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      }}
                    >
                      <span className="pill-emoji">{d.emoji}</span>
                      <span className="pill-label">{d.label}</span>
                    </button>
                  ))}
                </div>

                {/* If selected diet is outside top 4, show prominent active badge */}
                {diet && !ALL_DIETS.slice(0, 4).some(d => d.id === diet) && (
                  <div style={{ marginTop: '0.6rem', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setDiet('NONE')}
                      className="stitch-pill-btn active"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '0.55rem 1rem',
                        border: '1.5px solid var(--primary)',
                      }}
                      title="Click to reset to Any Diet"
                    >
                      <span className="pill-emoji">{ALL_DIETS.find(d => d.id === diet)?.emoji || '✨'}</span>
                      <span className="pill-label">Selected: {ALL_DIETS.find(d => d.id === diet)?.label || diet}</span>
                      <X size={14} style={{ flexShrink: 0, marginLeft: '0.35rem' }} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cuisine Inspiration Refined Structure (Takes 50% full right width) */}
            <div style={{
              background: 'var(--surface-container)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              width: '100%'
            }}>
              {/* Card Header with Icon & Custom Dropdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '0.75rem',
                    background: 'rgba(238, 108, 77, 0.15)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    flexShrink: 0
                  }}>
                    🌎
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: 0, lineHeight: 1.2 }}>
                      Cuisine Inspiration
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      {POPULAR_CUISINES.find(c => c.id === cuisine)?.label || cuisine || 'All Cuisines'}
                    </span>
                  </div>
                </div>

                {/* Refined Glassmorphic Selection Menu */}
                <CustomDropdown
                  options={POPULAR_CUISINES}
                  value={cuisine}
                  onChange={(newCuisine) => setCuisine(newCuisine)}
                  placeholder="All Cuisines..."
                  minWidth="160px"
                />
              </div>

              {/* Full-Width 4-Option Grid + Dynamic Selected Pill */}
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                  Quick Selection:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '0.6rem',
                  width: '100%'
                }}>
                  {POPULAR_CUISINES.filter(c => c.id !== '').slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCuisine(c.id)}
                      className={`stitch-pill-btn${cuisine === c.id ? ' active' : ''}`}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '0.65rem 0.5rem',
                        border: cuisine === c.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      }}
                    >
                      <span className="pill-emoji">{c.emoji}</span>
                      <span className="pill-label">{c.label}</span>
                    </button>
                  ))}
                </div>

                {/* If selected cuisine is outside top 4, show prominent active badge */}
                {cuisine && !POPULAR_CUISINES.filter(c => c.id !== '').slice(0, 4).some(c => c.id === cuisine) && (
                  <div style={{ marginTop: '0.6rem', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setCuisine('')}
                      className="stitch-pill-btn active"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '0.55rem 1rem',
                        border: '1.5px solid var(--primary)',
                      }}
                      title="Click to reset to All Cuisines"
                    >
                      <span className="pill-emoji">{POPULAR_CUISINES.find(c => c.id === cuisine)?.emoji || '🍽️'}</span>
                      <span className="pill-label">Selected: {POPULAR_CUISINES.find(c => c.id === cuisine)?.label || cuisine}</span>
                      <X size={14} style={{ flexShrink: 0, marginLeft: '0.35rem' }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Max Prep Time Slider with Highly Visible Marker & Milestone Ticks */}
          <div style={{
            borderTop: '1.5px solid rgba(159, 64, 45, 0.18)',
            paddingTop: '1.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '2.25rem',
            width: '100%'
          }}>
            <div>
              <PrepTimeSlider
                value={maxTime}
                onChange={setMaxTime}
              />
            </div>

            {/* Exclude Allergens */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Exclude Allergens
              </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {allergies.map((allergy) => (
                    <span
                      key={allergy}
                      className="chip chip-red"
                      style={{
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <span style={{ textTransform: 'capitalize' }}>{allergy}</span>
                      <button
                        onClick={() => removeAllergy(allergy)}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={addAllergy}
                    placeholder="Add allergen and press Enter..."
                    className="form-input"
                    style={{
                      padding: '0.65rem 1rem',
                      fontSize: '0.9rem',
                      borderRadius: '0.75rem'
                    }}
                  />
                </div>
              </div>
            </div>
        </section>

        {/* Primary Generate Action CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }} className="animate-fade-in-up delay-300">
          <button
            onClick={handleSuggest}
            disabled={loading || ingredients.length === 0}
            className="stitch-btn-generate"
            style={{ width: 'auto' }}
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                <span>Crafting Gourmet Dishes...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Generate 3 Gourmet Recipes</span>
              </>
            )}
          </button>
        </div>

        {/* Step 3: Curated Results */}
        {recipes.length > 0 && (
          <div id="curated-results" style={{ marginTop: '2.5rem' }} className="animate-fade-in-up delay-400">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div className="step-badge-3">3</div>
                <h3 style={{
                  fontSize: '1.35rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--on-background)',
                  margin: 0
                }}>
                  Curated Results
                </h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Instant AI Recommendation
              </span>
            </div>

            {/* 3-Column Glass Recipe Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem'
            }}>
              {recipes.map((recipe, idx) => {
                const isFullMatch = !recipe.missingIngredients || recipe.missingIngredients.length === 0;
                const matchBadge = isFullMatch ? '100% Match' : `${Math.max(60, 100 - (recipe.missingIngredients.length * 15))}% Match`;

                return (
                  <div
                    key={idx}
                    className="stitch-recipe-card animate-fade-in-scale"
                    style={{ animationDelay: `${(idx + 3) * 100}ms` }}
                  >
                    {/* Header Badge Row */}
                    <div style={{
                      padding: '1.25rem 1.5rem 0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div className="stitch-card-badge" style={{ position: 'static' }}>
                        <CheckCircle2 size={13} style={{ color: 'var(--primary)' }} />
                        <span>{matchBadge}</span>
                      </div>
                      {recipe.cuisine && (
                        <span className="recipe-badge-cuisine" style={{ fontSize: '0.8rem' }}>
                          <Globe size={13} /> {recipe.cuisine}
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h4 style={{
                        fontSize: '1.25rem',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        color: 'var(--on-background)',
                        marginBottom: '0.5rem',
                        lineHeight: 1.3
                      }}>
                        {recipe.title}
                      </h4>

                      {/* Meta stats: prep time & calories */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        {recipe.estimatedTimeMinutes && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={15} style={{ color: 'var(--primary)' }} />
                            <span>{recipe.estimatedTimeMinutes} mins</span>
                          </span>
                        )}
                        {recipe.estimatedCalories && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Flame size={15} style={{ color: 'var(--primary)' }} />
                            <span>{recipe.estimatedCalories} kcal</span>
                          </span>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                        <button
                          className="btn btn-secondary"
                          style={{
                            flex: 1,
                            borderRadius: '0.75rem',
                            fontWeight: 600,
                            justifyContent: 'center',
                            padding: '0.65rem 0.85rem'
                          }}
                          onClick={() => setSelectedRecipe(recipe)}
                        >
                          <ChefHat size={16} />
                          <span>View Steps</span>
                        </button>

                        {(() => {
                          const isAlreadySaved = savedRecipeTitles.has(recipe.title?.trim().toLowerCase());
                          const isSavingThis = savingRecipeTitle === recipe.title;

                          return (
                            <button
                              className={isAlreadySaved ? "btn btn-secondary" : "btn btn-primary"}
                              style={{
                                flex: 1.15,
                                borderRadius: '0.75rem',
                                background: isAlreadySaved ? 'rgba(52, 211, 153, 0.15)' : 'var(--primary)',
                                color: isAlreadySaved ? '#10b981' : '#ffffff',
                                border: isAlreadySaved ? '1.5px solid rgba(52, 211, 153, 0.45)' : '1px solid rgba(159, 64, 45, 0.5)',
                                fontWeight: 600,
                                justifyContent: 'center',
                                padding: '0.65rem 0.85rem',
                                boxShadow: isAlreadySaved ? 'none' : '0 4px 12px rgba(159, 64, 45, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              disabled={isSavingThis}
                              onClick={() => handleSave(recipe)}
                              title={isAlreadySaved ? "Saved to your unique cookbook" : "Save recipe to your collection"}
                            >
                              {isSavingThis ? (
                                <>
                                  <RefreshCw size={15} className="animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : isAlreadySaved ? (
                                <>
                                  <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                                  <span>Saved</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus size={15} />
                                  <span>Save Recipe</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recipe Detail Glass Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          isSaved={savedRecipeTitles.has(selectedRecipe.title?.trim().toLowerCase())}
          onClose={() => setSelectedRecipe(null)}
          onSave={() => handleSave(selectedRecipe)}
        />
      )}
    </div>
  );
}
