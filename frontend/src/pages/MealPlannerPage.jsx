import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getMealPlan, assignRecipe, removeFromSlot, clearWeek } from '../api/mealPlanApi';
import { getSavedRecipes } from '../api/recipeApi';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Trash2, Plus, X } from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_ICONS = {
  BREAKFAST: '🍳',
  LUNCH: '🥗',
  DINNER: '🍲',
  SNACK: '🍎'
};

import { getMonday, formatWeekStart } from '../utils/dateUtils';

export default function MealPlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plan, setPlan] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(null); // { day, meal }
  const [pickerSearch, setPickerSearch] = useState('');

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMealPlan(formatWeekStart(weekStart));
      setPlan(res.data);
    } catch { toast.error('Failed to load meal plan'); }
    finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  useEffect(() => {
    getSavedRecipes({}).then(r => setSavedRecipes(r.data)).catch(() => {});
  }, []);

  const getEntry = (day, meal) => {
    return plan?.entries?.find(e => e.dayOfWeek === day && e.mealType === meal);
  };

  const handleAssign = async (day, meal, recipeId) => {
    try {
      const res = await assignRecipe(formatWeekStart(weekStart), day, meal, recipeId);
      setPlan(res.data);
      setShowPicker(null);
      toast.success('Recipe added to plan! 🗓️');
    } catch { toast.error('Failed to assign recipe'); }
  };

  const handleRemove = async (day, meal) => {
    try {
      const res = await removeFromSlot(formatWeekStart(weekStart), day, meal);
      setPlan(res.data);
    } catch { toast.error('Failed to remove recipe'); }
  };

  const handleClear = async () => {
    if (!confirm('Clear all recipes from this week?')) return;
    try {
      await clearWeek(formatWeekStart(weekStart));
      loadPlan();
      toast.success('Week cleared!');
    } catch { toast.error('Failed to clear week'); }
  };

  const prevWeek = () => {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  };
  const nextWeek = () => {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  };

  const weekLabel = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

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
          Weekly Meal Planner
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Organize your culinary week, manage slots, and balance nutrition effortlessly.
        </p>
      </div>

      {/* Week Navigation */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', borderRadius: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="quick-add-pill"
              onClick={prevWeek}
              aria-label="Previous Week"
              style={{ padding: '0.4rem 0.6rem' }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 700, color: 'var(--on-background)', fontSize: '1.05rem', minWidth: '180px', textAlign: 'center' }}>
              {weekLabel()}
            </span>
            <button
              className="quick-add-pill"
              onClick={nextWeek}
              aria-label="Next Week"
              style={{ padding: '0.4rem 0.6rem' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            className="btn btn-danger btn-sm"
            onClick={handleClear}
            style={{ borderRadius: '0.75rem', padding: '0.5rem 1rem' }}
          >
            <Trash2 size={15} />
            <span>Clear Week</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div className="meal-planner-grid glass-panel" style={{ borderRadius: '1.25rem', padding: '1.5rem' }}>
          {/* Top-left corner header */}
          <div className="meal-planner-header" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Meal \ Day
          </div>

          {/* Day column headers */}
          {DAY_LABELS.map(d => (
            <div key={d} className="meal-planner-header">
              {d}
            </div>
          ))}

          {/* Meal rows with icons and uniform heights */}
          {MEALS.map(meal => (
            <>
              {/* Category Label with Icon */}
              <div key={`label-${meal}`} className="meal-planner-label">
                <span style={{ fontSize: '1.4rem' }}>{MEAL_ICONS[meal]}</span>
                <span>{meal.charAt(0) + meal.slice(1).toLowerCase()}</span>
              </div>

              {/* 7 Days in Row */}
              {DAYS.map(day => {
                const entry = getEntry(day, meal);
                return (
                  <div key={`${day}-${meal}`} className="meal-planner-cell">
                    {entry ? (
                      <div
                        className="meal-slot-recipe"
                        title={entry.recipeTitle}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                          <p className="meal-slot-recipe-title">
                            {entry.recipeTitle}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(day, meal);
                            }}
                            style={{
                              background: 'rgba(159, 64, 45, 0.1)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'var(--primary)',
                              flexShrink: 0
                            }}
                            title="Remove from slot"
                          >
                            <X size={11} />
                          </button>
                        </div>
                        {entry.estimatedCalories && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, margin: 0, marginTop: 'auto', paddingTop: '4px' }}>
                            🔥 {entry.estimatedCalories} kcal
                          </p>
                        )}
                      </div>
                    ) : (
                      <div
                        className="meal-slot-empty"
                        onClick={() => setShowPicker({ day, meal })}
                        title={`Add ${meal.toLowerCase()} for ${day}`}
                      >
                        <Plus size={18} />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Recipe Picker Modal rendered via createPortal so entire viewport is blurred */}
      {showPicker && createPortal(
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowPicker(null)}
        >
          <div
            className="modal glass-panel"
            style={{
              borderRadius: '1.25rem',
              padding: '2rem',
              maxWidth: '520px',
              width: '90%',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.35rem', color: 'var(--on-background)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{MEAL_ICONS[showPicker.meal]}</span>
                <span>Add to {showPicker.day} {showPicker.meal.toLowerCase()}</span>
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPicker(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {savedRecipes.length > 5 && (
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Filter recipes..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.875rem', borderRadius: '0.65rem' }}
                />
              </div>
            )}

            {savedRecipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📖</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                  No saved recipes found. Save dishes in Recipe Craft first!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                {savedRecipes
                  .filter(r => !pickerSearch || r.title.toLowerCase().includes(pickerSearch.toLowerCase()) || (r.cuisine && r.cuisine.toLowerCase().includes(pickerSearch.toLowerCase())))
                  .map(recipe => (
                  <div
                    key={recipe.id}
                    className="glass-panel"
                    style={{
                      cursor: 'pointer',
                      padding: '0.9rem 1.15rem',
                      borderRadius: '0.875rem',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid var(--border-color)'
                    }}
                    onClick={() => {
                      handleAssign(showPicker.day, showPicker.meal, recipe.id);
                      setPickerSearch('');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '0.75rem' }}>
                        <p style={{ fontWeight: 700, color: 'var(--on-background)', fontSize: '0.95rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {recipe.title}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                          {recipe.cuisine && `${recipe.cuisine} · `}
                          {recipe.estimatedTimeMinutes && `${recipe.estimatedTimeMinutes} min · `}
                          {recipe.estimatedCalories && `${recipe.estimatedCalories} kcal`}
                        </p>
                      </div>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        flexShrink: 0
                      }}>
                        <Plus size={16} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
