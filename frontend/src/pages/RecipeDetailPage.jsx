import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, Flame, Utensils, Check, ChefHat,
  BookmarkPlus, CalendarPlus, CheckCircle2,
  Sparkles, Globe, ShoppingBag, Share2, Printer,
  Copy, RefreshCw, Layers
} from 'lucide-react';
import { getRecipe, saveRecipe } from '../api/recipeApi';
import toast from 'react-hot-toast';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. If recipe passed via navigation state (e.g. from /suggest or /saved)
    if (location.state?.recipe) {
      setRecipe(location.state.recipe);
      setIsSaved(Boolean(location.state.isSaved || location.state.recipe.id));
      sessionStorage.setItem('current_view_recipe', JSON.stringify(location.state.recipe));
      setLoading(false);
      return;
    }

    // 2. If ID in URL, fetch from API
    if (id && id !== 'view') {
      setLoading(true);
      getRecipe(id)
        .then(res => {
          setRecipe(res.data);
          setIsSaved(true);
          sessionStorage.setItem('current_view_recipe', JSON.stringify(res.data));
        })
        .catch(err => {
          console.error('Failed to load recipe', err);
          toast.error('Could not load recipe details');
        })
        .finally(() => setLoading(false));
      return;
    }

    // 3. Fallback to session storage if refreshed on /recipes/view
    const cached = sessionStorage.getItem('current_view_recipe');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setRecipe(parsed);
        setIsSaved(Boolean(parsed.id));
      } catch (e) {
        console.error(e);
      }
    }
    setLoading(false);
  }, [id, location.state]);

  const toggleStep = (idx) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleIngredient = (idx) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSave = async () => {
    if (!recipe || isSaved || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: recipe.title,
        cuisine: recipe.cuisine,
        estimatedTimeMinutes: recipe.estimatedTimeMinutes,
        estimatedCalories: recipe.estimatedCalories,
        usedIngredients: recipe.usedIngredients || [],
        missingIngredients: recipe.missingIngredients || [],
        steps: recipe.steps || []
      };
      const res = await saveRecipe(payload);
      setIsSaved(true);
      if (res.data?.id) {
        setRecipe(prev => ({ ...prev, id: res.data.id }));
      }
      toast.success(`"${recipe.title}" saved to your cookbook!`);
    } catch (err) {
      toast.error('Failed to save recipe to your collection');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyIngredients = () => {
    if (!recipe) return;
    const items = [];
    if (recipe.usedIngredients?.length) {
      items.push('--- IN-STOCK INGREDIENTS ---');
      recipe.usedIngredients.forEach(i => items.push(`• ${i}`));
    }
    if (recipe.missingIngredients?.length) {
      items.push('\n--- NEEDED INGREDIENTS ---');
      recipe.missingIngredients.forEach(i => items.push(`• ${i.quantity || ''} ${i.unit || ''} ${i.name || ''}`.trim()));
    }
    if (recipe.ingredients?.length) {
      recipe.ingredients.forEach(i => {
        const text = typeof i === 'string' ? i : `${i.quantity || ''} ${i.unit || ''} ${i.name || ''}`.trim();
        items.push(`• ${text}`);
      });
    }

    navigator.clipboard.writeText(items.join('\n'));
    setCopied(true);
    toast.success('Ingredients list copied to clipboard');
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe?.title || 'MealCraft Recipe',
        text: `Check out this recipe for ${recipe?.title} on MealCraft!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Recipe link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading recipe details...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <ChefHat size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-background)' }}>Recipe Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px' }}>
          This recipe could not be found or has not been generated yet. Try generating new recipes from your pantry!
        </p>
        <Link to="/suggest" className="btn btn-primary" style={{ borderRadius: '0.75rem', padding: '0.75rem 1.5rem' }}>
          <Sparkles size={16} /> Go to Recipe Generator
        </Link>
      </div>
    );
  }

  const stepsList = recipe.steps || [];
  const percentComplete = stepsList.length > 0
    ? Math.round((completedSteps.size / stepsList.length) * 100)
    : 0;

  const fromSaved = location.state?.from === 'saved';
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fromSaved ? '/saved' : '/suggest');
    }
  };

  return (
    <div className="recipe-detail-page-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      {/* Top Navigation & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={handleBack}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '0.75rem',
            padding: '0.55rem 1rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} />
          <span>{fromSaved ? 'Back to Saved Recipes' : 'Back to Suggestions'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={handleShare}
            className="btn btn-ghost btn-icon"
            title="Share Recipe"
            style={{ borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-ghost btn-icon"
            title="Print Recipe"
            style={{ borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}
          >
            <Printer size={16} />
          </button>
          <button
            onClick={() => navigate('/planner')}
            className="btn btn-secondary"
            style={{ borderRadius: '0.75rem', fontWeight: 600, padding: '0.55rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <CalendarPlus size={16} />
            <span className="hide-on-mobile">Plan Meal</span>
          </button>
          {isSaved ? (
            <div
              className="btn btn-secondary"
              style={{
                cursor: 'default',
                borderRadius: '0.75rem',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.15rem'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Saved</span>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{
                borderRadius: '0.75rem',
                fontWeight: 600,
                padding: '0.55rem 1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <BookmarkPlus size={16} />}
              <span>{saving ? 'Saving...' : 'Save Recipe'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Recipe Hero Card */}
      <div
        className="recipe-hero-banner"
        style={{
          borderRadius: '1.5rem',
          padding: '2rem 2.25rem',
          background: 'var(--surface-container-high)',
          border: '1.5px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '2rem',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.85rem' }}>
          {recipe.cuisine && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'var(--primary-light)',
                border: '1px solid var(--border-accent)',
                color: 'var(--primary)'
              }}
            >
              <Globe size={13} /> {recipe.cuisine}
            </span>
          )}
          {recipe.source && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'var(--surface-container)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)'
              }}
            >
              <Sparkles size={13} /> {recipe.source.replace('_', ' ')}
            </span>
          )}
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 800,
            color: 'var(--on-background)',
            lineHeight: 1.25,
            margin: '0 0 1.25rem 0'
          }}
        >
          {recipe.title}
        </h1>

        {/* Nutritional & Prep Metric Badges */}
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {recipe.estimatedTimeMinutes && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: 'var(--surface-card, var(--bg-surface))',
                border: '1px solid var(--border-color)',
                color: 'var(--on-background)'
              }}
            >
              <Clock size={16} style={{ color: 'var(--primary)' }} />
              <span><strong>{recipe.estimatedTimeMinutes}</strong> mins prep</span>
            </div>
          )}

          {recipe.estimatedCalories && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: 'var(--surface-card, var(--bg-surface))',
                border: '1px solid var(--border-color)',
                color: 'var(--on-background)'
              }}
            >
              <Flame size={16} style={{ color: 'var(--primary)' }} />
              <span><strong>{recipe.estimatedCalories}</strong> kcal</span>
            </div>
          )}

          {stepsList.length > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: 'var(--surface-card, var(--bg-surface))',
                border: '1px solid var(--border-color)',
                color: 'var(--on-background)'
              }}
            >
              <ChefHat size={16} style={{ color: 'var(--primary)' }} />
              <span><strong>{stepsList.length}</strong> cooking steps</span>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.5fr)',
          gap: '2rem',
          alignItems: 'start'
        }}
        className="recipe-detail-grid-layout"
      >
        {/* Left Column: Ingredients Checklist */}
        <div
          style={{
            borderRadius: '1.5rem',
            padding: '1.75rem',
            background: 'var(--surface-card, var(--bg-surface))',
            border: '1.5px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1.5px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Utensils size={20} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--on-background)' }}>
                Ingredients & Pantry
              </h2>
            </div>
            <button
              onClick={handleCopyIngredients}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8rem', fontWeight: 600, gap: '0.35rem', display: 'inline-flex', alignItems: 'center' }}
            >
              {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy List'}</span>
            </button>
          </div>

          {/* In-Stock Ingredients Box */}
          {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
            <div
              style={{
                borderRadius: '1rem',
                padding: '1rem 1.15rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1.5px solid rgba(16, 185, 129, 0.28)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <CheckCircle2 size={16} />
                <span>In-Stock Ingredients ({recipe.usedIngredients.length})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {recipe.usedIngredients.map(item => (
                  <span
                    key={item}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.16)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <Check size={13} /> {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Ingredients Box */}
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <div
              style={{
                borderRadius: '1rem',
                padding: '1rem 1.15rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <ShoppingBag size={16} />
                <span>Needed from Store ({recipe.missingIngredients.length})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {recipe.missingIngredients.map(item => (
                  <span
                    key={item.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#dc2626',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    {item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() + ' ' : ''}{item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Standard Ingredients List with Interactive Checklist */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Recipe Ingredients Checklist
              </div>
              {recipe.ingredients.map((ing, idx) => {
                const name = typeof ing === 'string' ? ing : ing.name;
                const qty = typeof ing === 'string' ? '' : `${ing.quantity || ''} ${ing.unit || ''}`.trim();
                const isChecked = checkedIngredients.has(idx);

                return (
                  <div
                    key={idx}
                    onClick={() => toggleIngredient(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.7rem 0.95rem',
                      borderRadius: '0.75rem',
                      background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-container-high)',
                      border: isChecked ? '1.5px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: isChecked ? 'none' : '1.5px solid var(--border-color)',
                          background: isChecked ? '#10b981' : 'transparent',
                          color: '#ffffff'
                        }}
                      >
                        {isChecked && <Check size={14} />}
                      </div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: isChecked ? 'var(--text-muted)' : 'var(--on-background)',
                          textDecoration: isChecked ? 'line-through' : 'none',
                          fontSize: '0.925rem'
                        }}
                      >
                        {name}
                      </span>
                    </div>
                    {qty && (
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)'
                        }}
                      >
                        {qty}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Step-by-Step Cooking Instructions */}
        <div
          style={{
            borderRadius: '1.5rem',
            padding: '1.75rem',
            background: 'var(--surface-card, var(--bg-surface))',
            border: '1.5px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1.5px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ChefHat size={20} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--on-background)' }}>
                Step-by-Step Method
              </h2>
            </div>
            {stepsList.length > 0 && (
              <span
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: completedSteps.size === stepsList.length ? '#10b981' : 'var(--primary)',
                  background: completedSteps.size === stepsList.length ? 'rgba(16, 185, 129, 0.15)' : 'var(--primary-light)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px'
                }}
              >
                {completedSteps.size} / {stepsList.length} completed
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {stepsList.length > 0 && (
            <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percentComplete}%`,
                  height: '100%',
                  background: percentComplete === 100 ? '#10b981' : 'var(--gradient-primary)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          )}

          {/* Interactive Steps List */}
          {stepsList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {stepsList.map((step, idx) => {
                const isDone = completedSteps.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    role="checkbox"
                    aria-checked={isDone}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && toggleStep(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1.15rem 1.25rem',
                      borderRadius: '1rem',
                      background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-container-high)',
                      border: isDone ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1.5px solid var(--border-color)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: isDone ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.03)'
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isDone ? '#10b981' : 'var(--gradient-primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '2px',
                        boxShadow: isDone ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      {isDone ? <Check size={16} /> : idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '1rem',
                          color: isDone ? 'var(--text-muted)' : 'var(--on-background)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          lineHeight: 1.65,
                          fontWeight: isDone ? 400 : 500
                        }}
                      >
                        {step}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No preparation steps recorded for this recipe.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
