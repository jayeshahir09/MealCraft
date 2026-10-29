import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { getMealPlan, assignRecipe, removeFromSlot, clearWeek, toggleSlotCooked } from '../api/mealPlanApi';
import { getSavedRecipes } from '../api/recipeApi';
import { getAnalytics, logCookedRecipe } from '../api/shoppingListApi';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  X,
  Check,
  Coffee,
  Sun,
  Moon,
  Utensils,
  Loader2,
  Clock,
  Flame,
  Calendar,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  ShoppingCart,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react';
import { getMonday, formatWeekStart } from '../utils/dateUtils';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_CONFIG = {
  BREAKFAST: { label: 'Breakfast', icon: Coffee, color: 'var(--primary)' },
  LUNCH: { label: 'Lunch', icon: Sun, color: 'var(--accent-primary, #f59e0b)' },
  DINNER: { label: 'Dinner', icon: Moon, color: 'var(--secondary, #6366f1)' },
  SNACK: { label: 'Snack', icon: Utensils, color: 'var(--success, #10b981)' }
};

const MEAL_CUTOFF_HOURS = {
  BREAKFAST: 11,
  LUNCH: 16,
  DINNER: 22,
  SNACK: 18
};

function isSlotPassedTime(dayKey, mealType, activeWeekMonday) {
  const currentMonday = getMonday(new Date());
  const activeTime = new Date(activeWeekMonday || currentMonday).setHours(0, 0, 0, 0);
  const nowMondayTime = new Date(currentMonday).setHours(0, 0, 0, 0);

  if (activeTime < nowMondayTime) return true;
  if (activeTime > nowMondayTime) return false;

  const dayIndexMap = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  const currentWeekDayIndex = (new Date().getDay() + 6) % 7; // Mon = 0, Sun = 6
  const targetDayIndex = dayIndexMap[dayKey?.toUpperCase()];

  if (targetDayIndex === undefined) return false;
  if (targetDayIndex < currentWeekDayIndex) return true;
  if (targetDayIndex > currentWeekDayIndex) return false;

  const currentHour = new Date().getHours();
  const cutoff = MEAL_CUTOFF_HOURS[mealType?.toUpperCase()] ?? 22;
  return currentHour >= cutoff;
}

export default function MealPlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plan, setPlan] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [showPicker, setShowPicker] = useState(null); // { day, meal }
  const [pickerSearch, setPickerSearch] = useState('');
  const [recentHistory, setRecentHistory] = useState([]);

  // Responsive view mode: 'day' for mobile focus, 'week' for full table
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth <= 768 ? 'day' : 'week';
  });

  // Selected day for mobile Day View (defaults to today's day key if in current week, else MON)
  const [selectedDay, setSelectedDay] = useState(() => {
    const todayIndex = (new Date().getDay() + 6) % 7;
    return DAYS[todayIndex] || 'MON';
  });

  // Manually marked as cooked slots (persisted in localStorage)
  const [cookedKeys, setCookedKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('mealcraft_cooked_slots');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Explicitly unmarked slots by user
  const [unmarkedKeys, setUnmarkedKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('mealcraft_unmarked_slots');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [moveModal, setMoveModal] = useState(null); // { fromDay, fromMeal, entry }
  const [moveTarget, setMoveTarget] = useState({ day: 'MON', meal: 'DINNER' });

  // Auto-switch view on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setViewMode(prev => (prev === 'week' ? 'day' : prev));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadPlan = useCallback(async () => {
    try {
      const res = await getMealPlan(formatWeekStart(weekStart));
      setPlan(res.data);
    } catch {
      toast.error('Failed to load meal plan');
    }
  }, [weekStart]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    setLoadingRecipes(true);
    getSavedRecipes({})
      .then(r => setSavedRecipes(Array.isArray(r.data) ? r.data : []))
      .catch(() => { })
      .finally(() => setLoadingRecipes(false));

    getAnalytics()
      .then(r => {
        if (r.data?.recentHistory) setRecentHistory(r.data.recentHistory);
      })
      .catch(() => { });
  }, []);

  const getSlotKey = (day, meal, recipeId) => `${formatWeekStart(weekStart)}_${day}_${meal}_${recipeId}`;

  // Only consider cooked if explicitly marked by user or stored in backend
  const isCooked = (day, meal, entry) => {
    if (!entry) return false;
    const key = getSlotKey(day, meal, entry.recipeId);
    if (unmarkedKeys.has(key)) return false;
    if (cookedKeys.has(key)) return true;
    if (entry.isCooked !== undefined && entry.isCooked !== null) {
      return entry.isCooked;
    }
    if (recentHistory.some(h => h.recipeId === entry.recipeId || (entry.recipeTitle && h.recipeTitle?.toLowerCase() === entry.recipeTitle.toLowerCase()))) {
      return true;
    }
    return false;
  };

  const isPastWindow = (day, meal) => isSlotPassedTime(day, meal, weekStart);

  const handleToggleCooked = async (e, day, meal, entry) => {
    e.stopPropagation();
    if (!entry?.recipeId) return;

    const key = getSlotKey(day, meal, entry.recipeId);
    const currentlyCooked = isCooked(day, meal, entry);
    const newCookedState = !currentlyCooked;

    if (!newCookedState) {
      setUnmarkedKeys(prev => {
        const next = new Set(prev).add(key);
        localStorage.setItem('mealcraft_unmarked_slots', JSON.stringify([...next]));
        return next;
      });
      setCookedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        localStorage.setItem('mealcraft_cooked_slots', JSON.stringify([...next]));
        return next;
      });
      toast.success('Meal unmarked — ingredients restored to pantry');
    } else {
      setCookedKeys(prev => {
        const next = new Set(prev).add(key);
        localStorage.setItem('mealcraft_cooked_slots', JSON.stringify([...next]));
        return next;
      });
      setUnmarkedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        localStorage.setItem('mealcraft_unmarked_slots', JSON.stringify([...next]));
        return next;
      });
      toast.success(`"${entry.recipeTitle}" marked cooked — pantry stock deducted!`);
    }

    try {
      const res = await toggleSlotCooked(formatWeekStart(weekStart), day, meal, newCookedState);
      if (res.data) {
        setPlan(res.data);
      }
    } catch {
      if (newCookedState) {
        try { await logCookedRecipe(entry.recipeId, null); } catch { }
      }
    }
  };

  const getEntry = (day, meal) => {
    return plan?.entries?.find(e => e.dayOfWeek === day && e.mealType === meal);
  };

  const handleAssign = async (day, meal, recipe) => {
    const previousPlan = plan;
    const existing = getEntry(day, meal);
    const wasCooked = existing ? isCooked(day, meal, existing) : false;

    setShowPicker(null);
    setPickerSearch('');

    const optimisticEntry = {
      id: `temp-${Date.now()}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      estimatedCalories: recipe.estimatedCalories,
      estimatedTimeMinutes: recipe.estimatedTimeMinutes,
      cuisine: recipe.cuisine,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      dayOfWeek: day,
      mealType: meal,
      isCooked: false
    };

    setPlan(prev => {
      const existingEntries = prev?.entries || [];
      const remaining = existingEntries.filter(e => !(e.dayOfWeek === day && e.mealType === meal));
      return {
        ...prev,
        entries: [...remaining, optimisticEntry]
      };
    });

    try {
      const res = await assignRecipe(formatWeekStart(weekStart), day, meal, recipe.id);
      setPlan(res.data);
      toast.success(wasCooked ? 'Recipe replaced & pantry stock adjusted' : 'Recipe scheduled');
    } catch {
      setPlan(previousPlan);
      toast.error('Failed to assign recipe');
    }
  };

  const handleRemove = async (day, meal) => {
    const previousPlan = plan;
    const entry = getEntry(day, meal);
    const wasCooked = entry ? isCooked(day, meal, entry) : false;

    setPlan(prev => ({
      ...prev,
      entries: (prev?.entries || []).filter(e => !(e.dayOfWeek === day && e.mealType === meal))
    }));

    try {
      const res = await removeFromSlot(formatWeekStart(weekStart), day, meal);
      setPlan(res.data);
      toast.success(wasCooked ? 'Recipe removed & ingredients restored to pantry' : 'Recipe removed');
    } catch {
      setPlan(previousPlan);
      toast.error('Failed to remove recipe');
    }
  };

  const handleOpenMove = (day, meal, entry) => {
    setMoveModal({ fromDay: day, fromMeal: meal, entry });
    setMoveTarget({ day, meal });
  };

  const handleConfirmMove = async () => {
    if (!moveModal) return;
    const { fromDay, fromMeal, entry } = moveModal;
    const { day: targetDay, meal: targetMeal } = moveTarget;

    if (fromDay === targetDay && fromMeal === targetMeal) {
      setMoveModal(null);
      return;
    }

    setMoveModal(null);
    try {
      await assignRecipe(formatWeekStart(weekStart), targetDay, targetMeal, entry.recipeId);
      await removeFromSlot(formatWeekStart(weekStart), fromDay, fromMeal);
      await loadPlan();
      toast.success(`Moved "${entry.recipeTitle}" to ${targetDay} ${MEAL_CONFIG[targetMeal]?.label || targetMeal}`);
    } catch {
      toast.error('Failed to move meal');
      loadPlan();
    }
  };

  const isCurrentWeek = formatWeekStart(weekStart) === formatWeekStart(getMonday(new Date()));
  const currentWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  const handleClear = async () => {
    try {
      await clearWeek(formatWeekStart(weekStart));
      setShowClearConfirm(false);
      loadPlan();
      toast.success('Week schedule cleared');
    } catch {
      toast.error('Failed to clear week');
    }
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

  // Day dates for current week
  const weekDayDates = useMemo(() => {
    return DAYS.map((d, idx) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + idx);
      const isToday = new Date().toDateString() === date.toDateString();
      const dayMealsCount = plan?.entries?.filter(e => e.dayOfWeek === d).length || 0;
      return {
        key: d,
        label: DAY_LABELS[idx],
        fullName: FULL_DAY_LABELS[idx],
        dateNum: date.getDate(),
        monthShort: date.toLocaleDateString('en', { month: 'short' }),
        isToday,
        mealsCount: dayMealsCount
      };
    });
  }, [weekStart, plan]);

  const totalMealsCount = plan?.entries?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--on-background)',
            marginBottom: '0.25rem',
            letterSpacing: '-0.02em'
          }}>
            Weekly Meal Planner
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', margin: 0 }}>
            {totalMealsCount} {totalMealsCount === 1 ? 'meal' : 'meals'} scheduled for this week.
          </p>
        </div>

        {/* View Toggle (Day / Week Grid) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container)', padding: '4px', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`pill-btn ${viewMode === 'day' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              background: viewMode === 'day' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'day' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <CalendarDays size={15} />
            <span>Day View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`pill-btn ${viewMode === 'week' ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.85rem',
              borderRadius: '0.55rem',
              border: 'none',
              background: viewMode === 'week' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'week' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <LayoutGrid size={15} />
            <span>Week Table</span>
          </button>
        </div>
      </div>

      {/* Week Navigation Bar */}
      <div className="glass-panel planner-nav-bar" style={{ padding: '1rem 1.25rem', borderRadius: '1.25rem' }}>
        <div className="planner-nav-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="quick-add-pill"
              onClick={prevWeek}
              aria-label="Previous Week"
              style={{ padding: '0.45rem 0.65rem' }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 700, color: 'var(--on-background)', fontSize: '1rem', minWidth: '170px', textAlign: 'center' }}>
              {weekLabel()}
            </span>
            <button
              className="quick-add-pill"
              onClick={nextWeek}
              aria-label="Next Week"
              style={{ padding: '0.45rem 0.65rem' }}
            >
              <ChevronRight size={18} />
            </button>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={currentWeek}
                className="active-tag"
                style={{ fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer', border: '1px solid var(--border-accent)' }}
              >
                Current Week
              </button>
            )}
          </div>

          <div className="planner-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Link
              to={`/shopping-list?week=${formatWeekStart(weekStart)}`}
              className="quick-add-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                textDecoration: 'none',
                color: 'var(--on-background)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
              title="Generate Shopping List for this week"
            >
              <ShoppingCart size={15} style={{ color: 'var(--primary)' }} />
              <span>Shopping List</span>
            </Link>

            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowClearConfirm(true)}
              style={{ borderRadius: '0.75rem', padding: '0.45rem 0.9rem' }}
            >
              <Trash2 size={15} />
              <span>Clear Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {viewMode === 'day' ? (
        /* ============================================================ */
        /* MOBILE-FIRST DAY VIEW (Optimized for Mobile Phones & Tablets) */
        /* ============================================================ */
        <div key="day-view" className="planner-view-pane" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Horizontal Scrollable Day Selector Pills */}
          <div
            style={{
              display: 'flex',
              gap: '0.6rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {weekDayDates.map((day) => {
              const isSelected = selectedDay === day.key;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDay(day.key)}
                  style={{
                    flex: '1 0 74px',
                    minWidth: '74px',
                    padding: '0.75rem 0.5rem',
                    borderRadius: '1rem',
                    border: isSelected
                      ? '2px solid var(--primary)'
                      : day.isToday
                        ? '1.5px solid var(--border-accent)'
                        : '1px solid var(--border-color)',
                    background: isSelected
                      ? 'var(--primary)'
                      : day.isToday
                        ? 'var(--primary-light)'
                        : 'var(--surface-container)',
                    color: isSelected ? '#ffffff' : 'var(--on-background)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 14px var(--shadow-accent)' : 'none'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: isSelected ? 0.9 : 0.7 }}>
                    {day.label}
                  </span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                    {day.dateNum}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                    {day.isToday && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '999px',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--primary)',
                        color: '#fff'
                      }}>
                        TODAY
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      opacity: isSelected ? 0.9 : 0.7
                    }}>
                      {day.mealsCount}/4
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Day Title Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--on-background)', margin: 0 }}>
              {weekDayDates.find(d => d.key === selectedDay)?.fullName || selectedDay}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {weekDayDates.find(d => d.key === selectedDay)?.monthShort} {weekDayDates.find(d => d.key === selectedDay)?.dateNum}
            </span>
          </div>

          {/* 4 Stacked Meal Cards for the Selected Day */}
          <div key={selectedDay} className="planner-view-pane" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {MEALS.map((meal) => {
              const entry = getEntry(selectedDay, meal);
              const config = MEAL_CONFIG[meal];
              const IconComponent = config.icon;
              const cooked = entry ? isCooked(selectedDay, meal, entry) : false;

              return (
                <div
                  key={meal}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '1.15rem',
                    border: entry
                      ? cooked
                        ? '1.5px solid rgba(16, 185, 129, 0.4)'
                        : '1.5px solid var(--border-color)'
                      : '1.5px dashed var(--border-color)',
                    background: cooked ? 'rgba(16, 185, 129, 0.04)' : 'var(--surface-container)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  {/* Meal Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '0.65rem',
                        background: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: config.color
                      }}>
                        <IconComponent size={16} />
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                        {config.label}
                      </span>
                    </div>

                    {entry && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowPicker({ day: selectedDay, meal })}
                          style={{
                            background: 'var(--primary-light)',
                            border: 'none',
                            borderRadius: '0.5rem',
                            padding: '0.35rem 0.6rem',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                          title="Change / swap recipe"
                        >
                          <RefreshCw size={12} />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenMove(selectedDay, meal, entry)}
                          style={{
                            background: 'var(--surface-container-high)',
                            border: 'none',
                            borderRadius: '0.5rem',
                            padding: '0.35rem 0.6rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                          title="Reschedule to another day or slot"
                        >
                          <ArrowRightLeft size={12} />
                          <span>Reschedule</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(selectedDay, meal);
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            borderRadius: '0.5rem',
                            padding: '0.35rem 0.6rem',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                          title="Remove recipe"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Meal Body */}
                  {entry ? (
                    <div>
                      <h3 style={{
                        fontSize: '1.15rem',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        color: 'var(--on-background)',
                        margin: '0 0 0.5rem 0'
                      }}>
                        {entry.recipeTitle}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {entry.estimatedCalories && (
                            <span className="quick-add-pill" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                              <Flame size={12} style={{ color: 'var(--primary)' }} />
                              <span>{entry.estimatedCalories} kcal</span>
                            </span>
                          )}
                          {entry.estimatedTimeMinutes && (
                            <span className="quick-add-pill" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                              <Clock size={12} style={{ color: 'var(--primary)' }} />
                              <span>{entry.estimatedTimeMinutes} min</span>
                            </span>
                          )}
                          {entry.cuisine && (
                            <span className="quick-add-pill" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                              {entry.cuisine}
                            </span>
                          )}
                        </div>

                        {(() => {
                          const isPast = isPastWindow(selectedDay, meal);
                          return (
                            <button
                              type="button"
                              onClick={(e) => handleToggleCooked(e, selectedDay, meal, entry)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                padding: '0.4rem 0.85rem',
                                borderRadius: '999px',
                                cursor: 'pointer',
                                border: cooked
                                  ? '1px solid rgba(16, 185, 129, 0.4)'
                                  : isPast
                                    ? '1px solid rgba(245, 158, 11, 0.4)'
                                    : '1px solid var(--border-accent)',
                                background: cooked
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : isPast
                                    ? 'rgba(245, 158, 11, 0.12)'
                                    : 'var(--surface-container-low)',
                                color: cooked ? '#10b981' : isPast ? '#f59e0b' : 'var(--text-muted)'
                              }}
                              title={cooked ? 'Marked as Cooked' : isPast ? 'Window elapsed — Click to mark cooked' : 'Mark as Cooked'}
                            >
                              {cooked ? (
                                <>
                                  <Check size={13} style={{ strokeWidth: 3 }} />
                                  <span>Cooked</span>
                                </>
                              ) : isPast ? (
                                <>
                                  <Clock size={13} />
                                  <span>Elapsed • Cook</span>
                                </>
                              ) : (
                                <>
                                  <Check size={13} style={{ strokeWidth: 2 }} />
                                  <span>Mark as Cooked</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* Empty Slot Prompt */
                    <button
                      type="button"
                      onClick={() => setShowPicker({ day: selectedDay, meal })}
                      style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        border: '1px dashed var(--border-color)',
                        background: 'transparent',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    >
                      <Plus size={18} />
                      <span>Add {config.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* WEEK GRID VIEW (Full 7-Day Table for Desktop & Tablet)       */
        /* ============================================================ */
        <div key="week-view" className="planner-view-pane" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <div className="meal-planner-grid glass-panel" style={{ borderRadius: '1.25rem', padding: '1.25rem' }}>
            {/* Corner header */}
            <div className="meal-planner-header" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Meal \ Day
            </div>

            {/* Day headers */}
            {DAY_LABELS.map(d => (
              <div key={d} className="meal-planner-header">
                {d}
              </div>
            ))}

            {/* Meal rows */}
            {MEALS.map(meal => {
              const config = MEAL_CONFIG[meal];
              const IconComponent = config.icon;

              return (
                <div key={`row-${meal}`} style={{ display: 'contents' }}>
                  {/* Category Label */}
                  <div key={`label-${meal}`} className="meal-planner-label">
                    <IconComponent size={20} style={{ color: config.color }} />
                    <span>{config.label}</span>
                  </div>

                  {/* 7 Days in Row */}
                  {DAYS.map(day => {
                    const entry = getEntry(day, meal);
                    const cooked = entry ? isCooked(day, meal, entry) : false;

                    return (
                      <div key={`${day}-${meal}`} className="meal-planner-cell">
                        {entry ? (
                          <div
                            className={`meal-slot-recipe ${cooked ? 'is-cooked' : ''}`}
                            title={entry.recipeTitle}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                              <p className="meal-slot-recipe-title">
                                {entry.recipeTitle}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPicker({ day, meal });
                                  }}
                                  style={{
                                    background: 'var(--primary-light)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '19px',
                                    height: '19px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--primary)',
                                    flexShrink: 0
                                  }}
                                  title="Change / swap recipe"
                                >
                                  <RefreshCw size={10} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenMove(day, meal, entry);
                                  }}
                                  style={{
                                    background: 'var(--surface-container-high)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '19px',
                                    height: '19px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    flexShrink: 0
                                  }}
                                  title="Reschedule to another day or slot"
                                >
                                  <ArrowRightLeft size={10} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(day, meal);
                                  }}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '19px',
                                    height: '19px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    flexShrink: 0
                                  }}
                                  title="Remove from slot"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '6px', gap: '4px', flexWrap: 'wrap' }}>
                              {entry.estimatedCalories ? (
                                <p style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 700, margin: 0 }}>
                                  {entry.estimatedCalories} kcal
                                </p>
                              ) : <span />}

                              {(() => {
                                const isPast = isPastWindow(day, meal);
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleCooked(e, day, meal, entry)}
                                    className={`slot-cooked-btn ${cooked ? 'active' : ''}`}
                                    title={cooked ? 'Marked as Cooked' : isPast ? 'Window elapsed — Click to mark cooked' : 'Mark as Cooked'}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '999px',
                                      cursor: 'pointer',
                                      border: cooked
                                        ? '1px solid rgba(16, 185, 129, 0.4)'
                                        : isPast
                                          ? '1px solid rgba(245, 158, 11, 0.4)'
                                          : '1px solid var(--border-accent)',
                                      background: cooked
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : isPast
                                          ? 'rgba(245, 158, 11, 0.12)'
                                          : 'var(--surface-container-low)',
                                      color: cooked ? '#10b981' : isPast ? '#f59e0b' : 'var(--text-muted)'
                                    }}
                                  >
                                    {cooked ? (
                                      <>
                                        <Check size={11} style={{ strokeWidth: 3 }} />
                                        <span>Cooked</span>
                                      </>
                                    ) : isPast ? (
                                      <>
                                        <Clock size={11} />
                                        <span>Elapsed • Cook</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check size={11} style={{ strokeWidth: 2 }} />
                                        <span>Cook</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="meal-slot-empty"
                            onClick={() => setShowPicker({ day, meal })}
                            title={`Add ${config.label.toLowerCase()} for ${day}`}
                          >
                            <Plus size={18} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECIPE PICKER MODAL (Full Loading State + Mobile Responsive) */}
      {showPicker && createPortal(
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowPicker(null)}
        >
          <div
            className="modal glass-panel"
            style={{
              borderRadius: '1.25rem',
              padding: '1.5rem',
              maxWidth: '520px',
              width: '92%',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--on-background)', margin: 0 }}>
                  Add to {showPicker.day} {MEAL_CONFIG[showPicker.meal]?.label || showPicker.meal}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Select a saved recipe
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPicker(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {/* Filter Input */}
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search saved recipes..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.875rem', borderRadius: '0.65rem' }}
                autoFocus
              />
            </div>

            {/* Recipe List / Loading / Empty States */}
            {loadingRecipes ? (
              /* Loading Spinner when fetching recipes */
              <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  Loading saved recipes...
                </p>
              </div>
            ) : savedRecipes.length === 0 ? (
              /* Empty State when no saved recipes exist */
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                  No saved recipes found.
                </p>
                <Link
                  to="/suggest"
                  onClick={() => setShowPicker(null)}
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: '0.65rem', padding: '0.5rem 1rem' }}
                >
                  <Sparkles size={14} />
                  <span>Find Recipes</span>
                </Link>
              </div>
            ) : (
              /* Recipe List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {savedRecipes
                  .filter(r => !pickerSearch || r.title.toLowerCase().includes(pickerSearch.toLowerCase()) || (r.cuisine && r.cuisine.toLowerCase().includes(pickerSearch.toLowerCase())))
                  .map(recipe => (
                    <div
                      key={recipe.id}
                      className="glass-panel"
                      style={{
                        cursor: 'pointer',
                        padding: '0.85rem 1rem',
                        borderRadius: '0.85rem',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.15s ease',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => {
                        handleAssign(showPicker.day, showPicker.meal, recipe);
                      }}
                    >
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
                  ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Clear Week Confirmation Modal */}
      {showClearConfirm && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '400px',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              background: 'var(--surface-container-high)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <Trash2 size={18} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--on-background)' }}>
                Clear This Week's Plan?
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              This will remove all scheduled meals from <strong>{weekLabel()}</strong>. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowClearConfirm(false)}
                style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleClear}
                style={{ padding: '0.55rem 1.1rem', borderRadius: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Trash2 size={15} />
                <span>Clear Week</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reschedule / Move Meal Modal */}
      {moveModal && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setMoveModal(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              borderRadius: '1.25rem',
              padding: '1.75rem',
              background: 'var(--surface-container-high)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--on-background)' }}>
                    Reschedule Meal
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {moveModal.entry?.recipeTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setMoveModal(null)}
                aria-label="Close modal"
                style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Currently scheduled for <strong>{moveModal.fromDay} ({MEAL_CONFIG[moveModal.fromMeal]?.label || moveModal.fromMeal})</strong>. Select the new day and slot to move this meal:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                  Target Day
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setMoveTarget(prev => ({ ...prev, day }))}
                      style={{
                        padding: '0.55rem 0.2rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: moveTarget.day === day ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                        background: moveTarget.day === day ? 'var(--primary-light)' : 'var(--surface-container-low)',
                        color: moveTarget.day === day ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                  Target Meal Slot
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {MEALS.map(meal => {
                    const cfg = MEAL_CONFIG[meal];
                    const isSelected = moveTarget.meal === meal;
                    return (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => setMoveTarget(prev => ({ ...prev, meal }))}
                        style={{
                          padding: '0.6rem 0.35rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--primary-light)' : 'var(--surface-container-low)',
                          color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMoveModal(null)}
                style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmMove}
                style={{ padding: '0.55rem 1.15rem', borderRadius: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ArrowRightLeft size={14} />
                <span>Move Meal</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
