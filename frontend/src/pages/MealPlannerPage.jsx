import { useEffect, useState, useCallback } from 'react';
import { getMealPlan, assignRecipe, removeFromSlot, clearWeek } from '../api/mealPlanApi';
import { getSavedRecipes } from '../api/recipeApi';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Trash2, Plus, X } from 'lucide-react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekStart(date) {
  return date.toISOString().split('T')[0];
}

export default function MealPlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plan, setPlan] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(null); // { day, meal }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <span className="gradient-text">Weekly</span> Meal Planner
        </h1>
        <p className="text-secondary">Drag recipes from your saved list into meal slots.</p>
      </div>

      {/* Week Navigation */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost btn-icon" onClick={prevWeek}><ChevronLeft size={20} /></button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{weekLabel()}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={nextWeek}><ChevronRight size={20} /></button>
          <button className="btn btn-danger btn-sm" onClick={handleClear} style={{ marginLeft: '1rem' }}>
            <Trash2 size={14} /> Clear Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ overflowX: 'auto' }}>
        <div className="meal-planner-grid">
          {/* Header row */}
          <div className="meal-planner-header" />
          {DAY_LABELS.map(d => (
            <div key={d} className="meal-planner-header">{d}</div>
          ))}

          {/* Meal rows */}
          {MEALS.map(meal => (
            <>
              <div key={`label-${meal}`} className="meal-planner-label">{meal.charAt(0) + meal.slice(1).toLowerCase()}</div>
              {DAYS.map(day => {
                const entry = getEntry(day, meal);
                return (
                  <div key={`${day}-${meal}`} className="meal-planner-cell">
                    {entry ? (
                      <div className="meal-slot-recipe">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.75rem', lineHeight: 1.3 }}>
                            {entry.recipeTitle}
                          </p>
                          <button
                            onClick={() => handleRemove(day, meal)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0', marginLeft: '4px' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {entry.estimatedCalories && (
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            🔥 {entry.estimatedCalories} kcal
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="meal-slot-empty" onClick={() => setShowPicker({ day, meal })}>
                        <Plus size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Recipe Picker Modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPicker(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Add recipe to {showPicker.day} {showPicker.meal.toLowerCase()}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPicker(null)}><X size={18} /></button>
            </div>
            {savedRecipes.length === 0 ? (
              <div className="empty-state">
                <p>No saved recipes. Save some recipes first!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                {savedRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className="card"
                    style={{ cursor: 'pointer', padding: '0.875rem 1rem' }}
                    onClick={() => handleAssign(showPicker.day, showPicker.meal, recipe.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{recipe.title}</p>
                        <p className="text-xs text-muted">
                          {recipe.cuisine && `${recipe.cuisine} · `}
                          {recipe.estimatedTimeMinutes && `${recipe.estimatedTimeMinutes} min`}
                        </p>
                      </div>
                      <Plus size={16} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
