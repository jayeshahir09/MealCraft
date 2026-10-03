import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Clock, Flame, Utensils, Check, ChefHat,
  BookmarkPlus, CalendarPlus, CheckCircle2,
  Sparkles, Globe, ShoppingBag, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecipeDetailModal({
  recipe,
  onClose,
  onSave,
  onAssign,
  isSaved = false
}) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [copiedIngredients, setCopiedIngredients] = useState(false);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (!recipe) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [recipe, onClose]);

  if (!recipe) return null;

  const toggleStep = (index) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Normalize ingredients list
  const ingredientsList = (() => {
    if (Array.isArray(recipe.ingredients)) {
      return recipe.ingredients.map(ing => {
        if (typeof ing === 'string') return { name: ing, quantity: '', unit: '' };
        return {
          name: ing.name || '',
          quantity: ing.quantity || '',
          unit: ing.unit || ''
        };
      });
    }
    return [];
  })();

  const handleCopyIngredients = () => {
    const text = ingredientsList.length > 0
      ? ingredientsList.map(i => `${i.quantity} ${i.unit} ${i.name}`.trim()).join('\n')
      : (recipe.usedIngredients || []).join('\n');
    
    navigator.clipboard.writeText(text);
    setCopiedIngredients(true);
    toast.success('Ingredients copied to clipboard! 📋');
    setTimeout(() => setCopiedIngredients(false), 2500);
  };

  return createPortal(
    <div
      className="modal-overlay recipe-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-modal-title"
    >
      <div
        className="recipe-modal-card glass-panel animate-fade-in-scale"
        style={{
          maxWidth: '980px',
          width: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '1.25rem',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)'
        }}
      >
        {/* Clean Modal Header without Photos */}
        <div style={{
          padding: '1.5rem 1.75rem 1.25rem',
          borderBottom: '1.5px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.25rem',
          background: 'var(--surface-container-high)',
          borderRadius: '1.25rem 1.25rem 0 0',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {recipe.cuisine && (
                <span className="recipe-badge-cuisine" style={{ fontSize: '0.78rem' }}>
                  <Globe size={13} /> {recipe.cuisine}
                </span>
              )}
              {recipe.source && (
                <span className="recipe-badge-source" style={{ fontSize: '0.78rem' }}>
                  <Sparkles size={13} /> {recipe.source.replace('_', ' ')}
                </span>
              )}
            </div>

            <h2 id="recipe-modal-title" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
              fontWeight: 700,
              color: 'var(--on-background)',
              margin: 0,
              lineHeight: 1.3
            }}>
              {recipe.title}
            </h2>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {recipe.estimatedTimeMinutes && (
                <span className="recipe-metric-pill" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Clock size={14} className="metric-icon" />
                  <span><strong>{recipe.estimatedTimeMinutes}</strong> mins prep</span>
                </span>
              )}
              {recipe.estimatedCalories && (
                <span className="recipe-metric-pill" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Flame size={14} className="metric-icon" />
                  <span><strong>{recipe.estimatedCalories}</strong> kcal</span>
                </span>
              )}
              {recipe.steps && (
                <span className="recipe-metric-pill" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <ChefHat size={14} className="metric-icon" />
                  <span><strong>{recipe.steps.length}</strong> steps</span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close recipe details"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body - 2-Column Wide Layout */}
        <div className="recipe-modal-body">
          {/* Left Column: Ingredients & Pantry */}
          <div className="recipe-modal-col-ingredients" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="recipe-section-header">
              <div className="section-title-group">
                <Utensils size={18} className="section-icon" />
                <h3>Ingredients & Pantry</h3>
              </div>
              <button
                onClick={handleCopyIngredients}
                className="btn btn-ghost btn-sm copy-ingredients-btn"
                title="Copy ingredients list"
              >
                {copiedIngredients ? <Check size={14} /> : <Share2 size={14} />}
                <span>{copiedIngredients ? 'Copied' : 'Copy List'}</span>
              </button>
            </div>

            {/* AI Suggestion Used / Missing Ingredients Breakdown */}
            {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
              <div className="ingredients-stock-group in-stock-group">
                <div className="stock-label in-stock-label">
                  <CheckCircle2 size={15} />
                  <span>In-Stock Ingredients ({recipe.usedIngredients.length})</span>
                </div>
                <div className="stock-chips-container">
                  {recipe.usedIngredients.map(item => (
                    <span key={item} className="chip chip-green in-stock-chip">
                      <Check size={12} /> {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
              <div className="ingredients-stock-group missing-group">
                <div className="stock-label missing-label">
                  <ShoppingBag size={15} />
                  <span>Missing Ingredients ({recipe.missingIngredients.length})</span>
                </div>
                <div className="stock-chips-container">
                  {recipe.missingIngredients.map(item => (
                    <span key={item.name} className="chip chip-accent missing-chip">
                      {item.quantity} {item.unit} {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Saved Ingredients List */}
            {ingredientsList.length > 0 && (
              <div className="recipe-ingredients-grid">
                {ingredientsList.map((item, idx) => (
                  <div key={idx} className="recipe-ingredient-row">
                    <span className="ingredient-bullet" />
                    <span className="ingredient-name">{item.name}</span>
                    {(item.quantity || item.unit) && (
                      <span className="ingredient-qty">
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Step-by-Step Cooking Method */}
          <div className="recipe-modal-col-steps" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="recipe-section-header">
              <div className="section-title-group">
                <ChefHat size={18} className="section-icon" />
                <h3>Step-by-Step Method</h3>
              </div>
              {recipe.steps?.length > 0 && (
                <span className="steps-progress-counter">
                  {completedSteps.size} / {recipe.steps.length} done
                </span>
              )}
            </div>

            {recipe.steps && recipe.steps.length > 0 ? (
              <div className="recipe-steps-list">
                {recipe.steps.map((step, idx) => {
                  const isDone = completedSteps.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`recipe-step-card ${isDone ? 'step-completed' : ''}`}
                      role="checkbox"
                      aria-checked={isDone}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === ' ' && toggleStep(idx)}
                    >
                      <div className={`step-number-badge ${isDone ? 'step-badge-done' : ''}`}>
                        {isDone ? <Check size={14} /> : idx + 1}
                      </div>
                      <div className="step-content">
                        <p className="step-text">{step}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-steps-notice">
                <p>No specific preparation steps recorded for this recipe.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="recipe-modal-footer">
          {onSave && !isSaved && (
            <button
              onClick={onSave}
              className="btn btn-primary recipe-footer-btn"
            >
              <BookmarkPlus size={18} />
              <span>Save to Collection</span>
            </button>
          )}

          {isSaved && (
            <div
              className="btn btn-secondary recipe-footer-btn"
              style={{
                cursor: 'default',
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#10b981',
                borderColor: 'rgba(52, 211, 153, 0.45)',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={18} />
              <span>Saved in Collection</span>
            </div>
          )}

          {onAssign && (
            <button
              onClick={onAssign}
              className="btn btn-secondary recipe-footer-btn"
            >
              <CalendarPlus size={18} />
              <span>Assign to Planner</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="btn btn-ghost recipe-footer-btn close-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
