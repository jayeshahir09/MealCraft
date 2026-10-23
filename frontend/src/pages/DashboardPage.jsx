import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSavedRecipes } from '../api/recipeApi';
import { getMealPlan } from '../api/mealPlanApi';
import { getPantry } from '../api/pantryApi';
import { getAnalytics, generateShoppingList } from '../api/shoppingListApi';
import RecipeDetailModal from '../components/common/RecipeDetailModal';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
  Utensils,
  ChevronRight,
  ChefHat,
  CheckCircle2,
  RefreshCw,
  Check,
  Zap,
  CalendarDays,
  BookOpen,
  ShoppingCart,
  BookMarked,
  Package,
  Coffee,
  Sun,
  Moon,
  Search,
  Compass
} from 'lucide-react';

import { getMonday, formatWeekStart, formatWeekStartUTC } from '../utils/dateUtils';
import { formatDisplayName, getTimeOfDayGreeting } from '../utils/textUtils';

const BACKEND_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function matchDayOfWeek(entryDay, target3Letter) {
  if (!entryDay || !target3Letter) return false;
  const upper = entryDay.toUpperCase();
  const target = target3Letter.toUpperCase();
  return upper === target || upper.startsWith(target);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [mealPlan, setMealPlan] = useState(null);
  const [todayMeals, setTodayMeals] = useState({ BREAKFAST: null, LUNCH: null, DINNER: null });
  const [selectedPantryIngs, setSelectedPantryIngs] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayIndex = new Date().getDay();
  const todayBackendDay = BACKEND_DAYS[todayIndex];
  const todayDayLabel = FULL_DAY_NAMES[todayIndex];
  const weekStart = formatWeekStart(getMonday(new Date()));

  const handleGenerateShoppingList = () => {
    navigate('/shopping?autoGenerate=true');
  };

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [planRes, pantryRes, savedRes] = await Promise.allSettled([
          getMealPlan(weekStart),
          getPantry(),
          getSavedRecipes({})
        ]);

        // Meal plan entries for today and full week
        let currentPlan = (planRes.status === 'fulfilled' && planRes.value.data) ? planRes.value.data : null;

        // If primary plan is empty, check UTC-shifted date fallback for existing plans
        if (!currentPlan?.entries || currentPlan.entries.length === 0) {
          const utcWeekStart = formatWeekStartUTC(getMonday(new Date()));
          if (utcWeekStart !== weekStart) {
            try {
              const fallbackRes = await getMealPlan(utcWeekStart);
              if (fallbackRes.data?.entries && fallbackRes.data.entries.length > 0) {
                currentPlan = fallbackRes.data;
              }
            } catch {
              // ignore fallback error
            }
          }
        }

        // Saved recipes
        let savedList = [];
        if (savedRes.status === 'fulfilled' && savedRes.value.data) {
          savedList = savedRes.value.data;
          setSavedRecipes(savedList);
        }

        if (currentPlan) {
          setMealPlan(currentPlan);
          const entries = currentPlan.entries || [];
          const todays = entries.filter(e => matchDayOfWeek(e.dayOfWeek, todayBackendDay));
          const mapped = { BREAKFAST: null, LUNCH: null, DINNER: null };
          todays.forEach(e => {
            const foundSaved = savedList.find(s => s.id === (e.recipeId || e.recipe?.id) || s.title === (e.recipeTitle || e.recipe?.title));
            const recipeObj = {
              id: e.recipeId || e.recipe?.id || foundSaved?.id,
              title: e.recipeTitle || e.recipe?.title || foundSaved?.title || 'Planned Dish',
              estimatedCalories: e.estimatedCalories || e.recipe?.estimatedCalories || foundSaved?.estimatedCalories,
              estimatedTimeMinutes: e.estimatedTimeMinutes || e.recipe?.estimatedTimeMinutes || foundSaved?.estimatedTimeMinutes || 25,
              cuisine: e.cuisine || e.recipe?.cuisine || foundSaved?.cuisine || 'Chef Special',
              ingredients: e.ingredients || e.recipe?.ingredients || foundSaved?.ingredients || [],
              steps: e.steps || e.recipe?.steps || foundSaved?.steps || []
            };
            if (mapped[e.mealType] !== undefined) {
              mapped[e.mealType] = recipeObj;
            }
          });
          setTodayMeals(mapped);
        }

        // Pantry items
        if (pantryRes.status === 'fulfilled' && pantryRes.value.data) {
          const items = pantryRes.value.data;
          setPantryItems(items);
          if (items.length > 0) {
            // Pre-select top 3 pantry items for zero-waste chef
            setSelectedPantryIngs(items.slice(0, 3).map(i => i.ingredientName));
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [todayBackendDay, weekStart]);

  const togglePantrySelect = (ingName) => {
    setSelectedPantryIngs(prev =>
      prev.includes(ingName) ? prev.filter(i => i !== ingName) : [...prev, ingName]
    );
  };

  const handleZeroWasteCook = () => {
    if (selectedPantryIngs.length > 0) {
      navigate(`/suggest?ingredients=${encodeURIComponent(selectedPantryIngs.join(','))}`);
    } else {
      navigate('/suggest');
    }
  };

  // Calculated Stats
  const plannedCount = mealPlan?.entries?.length || 0;
  const plannedProgressPercent = Math.min(Math.round((plannedCount / 21) * 100), 100);
  
  // Extract real missing ingredients across the current week's planned recipes
  // by aggregating ingredients from planned recipes and checking against user's pantry
  const pantryNamesSet = new Set(
    (pantryItems || []).map(p => (p.ingredientName || p.name || '').trim().toLowerCase()).filter(Boolean)
  );

  const missingItemsSet = new Map();
  if (mealPlan?.entries) {
    mealPlan.entries.forEach(entry => {
      const foundSaved = savedRecipes.find(s => s.id === (entry.recipeId || entry.recipe?.id) || s.title === (entry.recipeTitle || entry.recipe?.title));
      const ings = entry.ingredients || entry.recipe?.ingredients || foundSaved?.ingredients || [];
      ings.forEach(m => {
        const rawName = typeof m === 'string' ? m : m?.name;
        if (!rawName) return;
        const normalized = rawName.trim().toLowerCase();
        
        // If ingredient is NOT in pantry, add to missing items
        if (!pantryNamesSet.has(normalized) && !missingItemsSet.has(normalized)) {
          missingItemsSet.set(normalized, {
            name: rawName,
            quantity: typeof m === 'object' ? (m.quantity || '') : '',
            unit: typeof m === 'object' ? (m.unit || '') : ''
          });
        }
      });
    });
  }
  const missingItemsList = Array.from(missingItemsSet.values());

  // Week days array starting from Monday
  const weekDays = [
    { id: 'MON', label: 'Monday', short: 'Mon' },
    { id: 'TUE', label: 'Tuesday', short: 'Tue' },
    { id: 'WED', label: 'Wednesday', short: 'Wed' },
    { id: 'THU', label: 'Thursday', short: 'Thu' },
    { id: 'FRI', label: 'Friday', short: 'Fri' },
    { id: 'SAT', label: 'Saturday', short: 'Sat' },
    { id: 'SUN', label: 'Sunday', short: 'Sun' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
      {/* 1. Header Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(1.85rem, 3.5vw, 2.75rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--on-background)',
            marginBottom: '0.35rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            {getTimeOfDayGreeting()}, {formatDisplayName(user?.name)}!
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', margin: 0 }}>
            You have <strong style={{ color: 'var(--primary)' }}>{plannedCount} meals scheduled</strong> this week and <strong style={{ color: 'var(--on-background)' }}>{pantryItems.length} pantry items</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <Link
            to="/suggest"
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: 700,
              gap: '0.45rem'
            }}
          >
            <ChefHat size={16} /> <span>Find Recipes</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="dashboard-metrics-grid">
        {/* Metric 1: Saved Recipes */}
        <Link
          to="/recipes"
          className="glass-panel stat-card"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '1.25rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Saved Recipes
            </span>
            <div className="stat-val" style={{ fontSize: '1.85rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', marginTop: '0.2rem' }}>
              {savedRecipes.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              View all <ChevronRight size={13} />
            </span>
          </div>
          <div className="stat-icon-box" style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookMarked size={22} />
          </div>
        </Link>

        {/* Metric 2: Weekly Plan Progress */}
        <Link
          to="/planner"
          className="glass-panel stat-card"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '1.25rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Weekly Plan
            </span>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="stat-val" style={{ fontSize: '1.85rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)' }}>
                {plannedCount}<span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/21</span>
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                {plannedProgressPercent}% filled
              </span>
            </div>
            <div className="progress-bar" style={{ height: '6px', background: 'var(--progress-track)', borderRadius: '9999px', overflow: 'hidden', marginTop: '4px' }}>
              <div style={{ width: `${plannedProgressPercent}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </Link>

        {/* Metric 3: Pantry In-Stock */}
        <Link
          to="/pantry"
          className="glass-panel stat-card"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '1.25rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Pantry Items
            </span>
            <div className="stat-val" style={{ fontSize: '1.85rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', marginTop: '0.2rem' }}>
              {pantryItems.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              Manage pantry <ChevronRight size={13} />
            </span>
          </div>
          <div className="stat-icon-box" style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(52, 211, 153, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} />
          </div>
        </Link>

        {/* Metric 4: Missing Groceries Checklist */}
        <Link
          to="/shopping"
          className="glass-panel stat-card"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '1.25rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Shopping Needed
            </span>
            <div className="stat-val" style={{ fontSize: '1.85rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', marginTop: '0.2rem' }}>
              {missingItemsList.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              View list <ChevronRight size={13} />
            </span>
          </div>
          <div className="stat-icon-box" style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(238, 108, 77, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={22} />
          </div>
        </Link>
      </div>

      {/* 3. Main Center Grid: Today's Schedule & Cook from Pantry */}
      <div className="bento-grid">
        {/* Left Column (8 cols): Today's Real Cooking Schedule */}
        <section className="bento-main" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                Today's Schedule ({todayDayLabel})
              </h2>
            </div>
            <Link
              to="/planner"
              className="quick-add-pill"
              style={{ fontSize: '0.825rem', padding: '0.4rem 0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>Weekly Planner</span> <ChevronRight size={14} />
            </Link>
          </div>

          {/* Meals List: Breakfast, Lunch, Dinner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['BREAKFAST', 'LUNCH', 'DINNER'].map((slot) => {
              const recipe = todayMeals[slot];
              const slotTimeLabel = slot === 'BREAKFAST' ? '8:00 AM' : slot === 'LUNCH' ? '1:00 PM' : '7:30 PM';
              const SlotIcon = slot === 'BREAKFAST' ? Coffee : slot === 'LUNCH' ? Sun : Moon;

              if (recipe) {
                return (
                  <article
                    key={slot}
                    className="glass-panel today-meal-card planned"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '1.15rem',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <SlotIcon size={14} /> {slot} • {slotTimeLabel}
                      </span>
                      <span className="card-match-badge" style={{ position: 'static', padding: '2px 8px', fontSize: '0.72rem' }}>
                        Planned
                      </span>
                    </div>

                    <h3
                      onClick={() => setSelectedRecipe(recipe)}
                      style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', marginBottom: '0.65rem', cursor: 'pointer', lineHeight: 1.25 }}
                    >
                      {recipe.title}
                    </h3>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                      {recipe.cuisine && (
                        <span className="quick-add-pill" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                          {recipe.cuisine}
                        </span>
                      )}

                      <button
                        onClick={() => setSelectedRecipe(recipe)}
                        className="btn btn-primary btn-sm"
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '0.6rem',
                          marginLeft: 'auto',
                          gap: '0.3rem'
                        }}
                      >
                        <ChefHat size={13} /> <span>View Recipe</span>
                      </button>
                    </div>
                  </article>
                );
              }

              // Unassigned slot card
              return (
                <div
                  key={slot}
                  className="glass-panel today-meal-card unassigned"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '1.15rem',
                    border: '1.5px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    background: 'var(--surface-container)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '0.8rem', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <SlotIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {slot} • {slotTimeLabel}
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: '2px 0 0 0' }}>
                        No {slot.toLowerCase()} scheduled
                      </h4>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/suggest')}
                      className="quick-add-pill"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', gap: '0.35rem', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 700 }}
                    >
                      <Search size={13} /> <span>Find Recipe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/planner')}
                      className="pill-btn"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
                    >
                      <span>Choose Recipe</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Cook from Pantry */}
        <aside className="bento-aside" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Cook from Pantry Card */}
          <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '0.65rem', background: 'rgba(238, 108, 77, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Package size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                  Cook from Pantry
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', margin: 0 }}>
              Select items from your pantry to find matching recipes:
            </p>

            {/* Pantry Selectable Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', maxHeight: '170px', overflowY: 'auto' }}>
              {pantryItems.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Your pantry is empty. <Link to="/profile" style={{ color: 'var(--primary)' }}>Add ingredients</Link> to use this feature.
                </span>
              ) : (
                pantryItems.map(item => {
                  const isSelected = selectedPantryIngs.includes(item.ingredientName);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePantrySelect(item.ingredientName)}
                      className={`quick-add-pill ${isSelected ? 'active-pantry-pill' : ''}`}
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.8rem',
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--primary-light)' : 'var(--surface-container)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 500
                      }}
                    >
                      {isSelected && <Check size={12} />}
                      <span style={{ textTransform: 'capitalize' }}>{item.ingredientName}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleZeroWasteCook}
              disabled={selectedPantryIngs.length === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                justifyContent: 'center',
                gap: '0.45rem'
              }}
            >
              <Utensils size={16} /> <span>Find Recipes ({selectedPantryIngs.length} items)</span>
            </button>
          </div>

          {/* Quick Filters Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
              Quick Filters
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => navigate('/suggest?diet=HIGH_PROTEIN')}
                className="dropdown-item-btn"
                style={{ padding: '0.55rem 0.75rem', borderRadius: '0.65rem', background: 'var(--surface-container)' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>High-Protein Meals</span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/suggest?maxTime=20')}
                className="dropdown-item-btn"
                style={{ padding: '0.55rem 0.75rem', borderRadius: '0.65rem', background: 'var(--surface-container)' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Under 20 Minutes</span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/suggest?diet=VEGETARIAN')}
                className="dropdown-item-btn"
                style={{ padding: '0.55rem 0.75rem', borderRadius: '0.65rem', background: 'var(--surface-container)' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Vegetarian Dishes</span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. Weekly Schedule Overview */}
      <section className="glass-panel" style={{ padding: '1.75rem 2rem', borderRadius: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
              Weekly Schedule
            </h3>
          </div>
          <Link to="/planner" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            View Planner →
          </Link>
        </div>

        {/* 7 Day Strip Grid */}
        <div className="week-glance-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.85rem'
        }}>
          {weekDays.map(day => {
            const isToday = day.id === todayBackendDay;
            const entries = mealPlan?.entries?.filter(e => matchDayOfWeek(e.dayOfWeek, day.id)) || [];
            const dayCount = entries.length;

            return (
              <div
                key={day.id}
                onClick={() => navigate('/planner')}
                style={{
                  background: isToday ? 'var(--primary-light)' : 'var(--surface-container)',
                  border: isToday ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: '1rem',
                  padding: '1rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isToday ? '0 4px 14px var(--shadow-accent)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--on-background)' }}>
                    {day.short}
                  </span>
                  {isToday && (
                    <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: '#fff', padding: '1px 5px', borderRadius: '9999px', fontWeight: 800 }}>
                      TODAY
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: dayCount > 0 ? 'var(--on-background)' : 'var(--text-muted)' }}>
                  {dayCount}/3
                </div>

                {/* Slot Dots Indicator (Breakfast, Lunch, Dinner) */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['BREAKFAST', 'LUNCH', 'DINNER'].map(slot => {
                    const hasSlot = entries.some(e => e.mealType === slot);
                    return (
                      <div
                        key={slot}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: hasSlot ? 'var(--primary)' : 'var(--primary-light)'
                        }}
                        title={`${slot}: ${hasSlot ? 'Planned' : 'Empty'}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Bottom Section: Recent Cookbook Creations & Quick Grocery Checklist */}
      <div className="bento-grid">
        {/* Left: Saved Recipes */}
        <section className="bento-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                Saved Recipes
              </h3>
            </div>
            <Link to="/recipes" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all ({savedRecipes.length}) →
            </Link>
          </div>

          {savedRecipes.length === 0 ? (
            <div className="glass-panel empty-state" style={{ borderRadius: '1.15rem', padding: '2.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <BookMarked size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600, color: 'var(--on-background)', margin: 0 }}>No saved recipes yet</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 1rem 0' }}>
                Save recipes to access them quickly here.
              </p>
              <Link to="/suggest" className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }}>
                <Sparkles size={14} /> <span>Find Recipes</span>
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem'
            }}>
              {savedRecipes.slice(0, 3).map((recipe) => {
                return (
                  <div
                    key={recipe.id}
                    className="recipe-card"
                    style={{ borderRadius: '1.15rem' }}
                  >
                    <div style={{
                      padding: '1rem 1.15rem 0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span className="card-match-badge" style={{ position: 'static', fontSize: '0.72rem', padding: '2px 8px' }}>
                        {recipe.cuisine || 'Gourmet'}
                      </span>
                      <ChefHat size={15} style={{ color: 'var(--primary)' }} />
                    </div>

                    <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h4 style={{
                        fontSize: '1.1rem',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        color: 'var(--on-background)',
                        marginBottom: '0.4rem',
                        lineHeight: 1.25
                      }}>
                        {recipe.title}
                      </h4>

                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {recipe.estimatedTimeMinutes && (
                          <span className="quick-add-pill" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                            <Clock size={11} style={{ color: 'var(--primary)' }} /> {recipe.estimatedTimeMinutes} min
                          </span>
                        )}
                        {recipe.estimatedCalories && (
                          <span className="quick-add-pill" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                            <Flame size={11} style={{ color: 'var(--primary)' }} /> {recipe.estimatedCalories} kcal
                          </span>
                        )}
                      </div>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedRecipe(recipe)}
                        style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', borderRadius: '0.65rem', fontWeight: 600 }}
                      >
                        <ChefHat size={14} /> <span>View Recipe</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Grocery List */}
        <aside className="bento-aside" style={{ alignSelf: 'start' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShoppingCart size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                  Grocery List
                </h3>
              </div>
              <Link to="/shopping" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Open List →
              </Link>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
              Missing items for this week's meals:
            </p>

            {/* Missing items checklist preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {missingItemsList.length === 0 ? (
                <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} />
                  <span>All ingredients in stock for planned meals</span>
                </div>
              ) : (
                missingItemsList.slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '0.65rem',
                      background: 'var(--surface-container)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--on-background)', textTransform: 'capitalize' }}>
                      {item.name}
                    </span>
                    {(item.quantity || item.unit) && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </div>
                ))
              )}
              {missingItemsList.length > 4 && (
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, padding: '2px 0' }}>
                  + {missingItemsList.length - 4} more missing items
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerateShoppingList}
              className="btn btn-primary btn-sm"
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                justifyContent: 'center',
                gap: '0.4rem',
                marginTop: '0.25rem',
                cursor: 'pointer'
              }}
            >
              <ShoppingCart size={15} />
              <span>Generate Shopping List</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 6. Recipe Detail Steps Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          isSaved={savedRecipes.some(r => r.id === selectedRecipe.id)}
          onClose={() => setSelectedRecipe(null)}
          onAssign={() => {
            setSelectedRecipe(null);
            navigate('/planner');
          }}
        />
      )}
    </div>
  );
}
