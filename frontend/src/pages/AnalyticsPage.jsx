import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAnalytics, logCookedRecipe } from '../api/shoppingListApi';
import { getSavedRecipes } from '../api/recipeApi';
import { getMealPlan } from '../api/mealPlanApi';
import { getMonday, formatWeekStart, formatWeekStartUTC } from '../utils/dateUtils';
import RecipeDetailModal from '../components/common/RecipeDetailModal';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  Flame,
  ChefHat,
  BarChart2,
  Clock,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Sun,
  Sunrise,
  Moon,
  Utensils,
  Sparkles,
  ArrowRight,
  Check,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'Monday', short: 'Mon' },
  { key: 'TUE', label: 'Tuesday', short: 'Tue' },
  { key: 'WED', label: 'Wednesday', short: 'Wed' },
  { key: 'THU', label: 'Thursday', short: 'Thu' },
  { key: 'FRI', label: 'Friday', short: 'Fri' },
  { key: 'SAT', label: 'Saturday', short: 'Sat' },
  { key: 'SUN', label: 'Sunday', short: 'Sun' },
];

const BACKEND_DAY_INDEX_MAP = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const MEAL_TYPE_CONFIG = {
  BREAKFAST: { label: 'Breakfast', icon: Sunrise, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', cutoffHour: 11, cutoffLabel: '11:00 AM' },
  LUNCH: { label: 'Lunch', icon: Sun, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', cutoffHour: 16, cutoffLabel: '4:00 PM' },
  DINNER: { label: 'Dinner', icon: Moon, color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', cutoffHour: 22, cutoffLabel: '10:00 PM' },
  SNACK: { label: 'Snack', icon: Utensils, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', cutoffHour: 18, cutoffLabel: '6:00 PM' }
};

/**
 * Checks if a meal's standard schedule window has already passed.
 * - Weeks in the past: all meals are past.
 * - Weeks in the future: no meals are past.
 * - Current week:
 *   - Days earlier in the current week are automatically past.
 *   - Today's meals are past if current hour is >= standard cutoff time.
 *   - Future days are not past.
 */
function isMealPassedStandardTime(dayKey, mealType, activeWeekMonday) {
  const currentMonday = getMonday(new Date());
  const activeTime = new Date(activeWeekMonday || currentMonday).setHours(0, 0, 0, 0);
  const nowMondayTime = new Date(currentMonday).setHours(0, 0, 0, 0);

  // Past week
  if (activeTime < nowMondayTime) return true;
  // Future week
  if (activeTime > nowMondayTime) return false;

  const dayIndexMap = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  const currentWeekDayIndex = (new Date().getDay() + 6) % 7; // Mon = 0, Sun = 6
  const targetDayIndex = dayIndexMap[dayKey?.toUpperCase()];

  if (targetDayIndex === undefined) return false;

  // Past day earlier this week
  if (targetDayIndex < currentWeekDayIndex) return true;

  // Future day this week
  if (targetDayIndex > currentWeekDayIndex) return false;

  // Today: check standard meal hour
  const currentHour = new Date().getHours();
  const config = MEAL_TYPE_CONFIG[mealType?.toUpperCase()];
  if (!config) return false;

  return currentHour >= config.cutoffHour;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Day selector (defaults to current day of week)
  const todayBackendKey = BACKEND_DAY_INDEX_MAP[new Date().getDay()];
  const [selectedDayKey, setSelectedDayKey] = useState(todayBackendKey);

  // Local set of manually clicked cooked recipe keys for instant UI response
  const [manuallyCookedKeys, setManuallyCookedKeys] = useState(new Set());

  // Recipe detail modal state
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Day section reference for smooth scrolling from week chart
  const daySectionRef = useRef(null);

  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
  const weekStartDate = useMemo(() => formatWeekStart(currentWeekMonday), [currentWeekMonday]);

  const handlePrevWeek = () => {
    setCurrentWeekMonday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekMonday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleCurrentWeek = () => {
    setCurrentWeekMonday(getMonday(new Date()));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, recipesRes, planRes] = await Promise.allSettled([
        getAnalytics(),
        getSavedRecipes({}),
        getMealPlan(weekStartDate)
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data);
      }
      if (recipesRes.status === 'fulfilled') {
        setSavedRecipes(recipesRes.value.data || []);
      }

      let planData = (planRes.status === 'fulfilled' && planRes.value.data) ? planRes.value.data : null;
      if (!planData?.entries || planData.entries.length === 0) {
        const utcStart = formatWeekStartUTC(getMonday(new Date()));
        if (utcStart !== weekStartDate) {
          try {
            const fallbackRes = await getMealPlan(utcStart);
            if (fallbackRes.data?.entries && fallbackRes.data.entries.length > 0) {
              planData = fallbackRes.data;
            }
          } catch {
            // fallback error ignored
          }
        }
      }
      setMealPlan(planData);
    } catch {
      toast.error('Failed to load kitchen analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekStartDate]);

  // Helper: check if a recipe was logged in recent history
  const isRecipeCookedInHistory = (recipeId, recipeTitle) => {
    if (!analytics?.recentHistory) return false;
    return analytics.recentHistory.some(
      h => h.recipeId === recipeId || (recipeTitle && h.recipeTitle?.toLowerCase() === recipeTitle.toLowerCase())
    );
  };

  // Helper: Determine if an entry is considered cooked
  const isEntryCooked = (entry) => {
    if (!entry) return false;
    const entryKey = `${entry.dayOfWeek}_${entry.mealType}_${entry.recipeId}`;
    if (manuallyCookedKeys.has(entryKey)) return true;
    if (entry.isCooked) return true;
    if (isRecipeCookedInHistory(entry.recipeId, entry.recipeTitle)) return true;
    return false;
  };

  // Direct 1-click "Mark as Cooked" handler
  const handleDirectMarkCooked = async (entry) => {
    if (!entry?.recipeId) return;
    const entryKey = `${entry.dayOfWeek}_${entry.mealType}_${entry.recipeId}`;

    // Instant optimistic update in local state
    setManuallyCookedKeys(prev => new Set(prev).add(entryKey));
    toast.success(`"${entry.recipeTitle}" marked as cooked`);

    try {
      await logCookedRecipe(entry.recipeId, null);
      await loadData();
    } catch {
      // If error, refresh data
      loadData();
    }
  };

  // -------------------------------------------------------------
  // Data Calculations: Weekly & Daily
  // -------------------------------------------------------------
  const planEntries = mealPlan?.entries || [];

  const weeklyPlanStats = useMemo(() => {
    let totalPlannedCalories = 0;
    let totalPlannedMinutes = 0;
    const cuisineCounts = {};
    const dayStats = {};

    DAYS_OF_WEEK.forEach(day => {
      dayStats[day.key] = {
        key: day.key,
        label: day.label,
        short: day.short,
        totalCalories: 0,
        totalMinutes: 0,
        meals: { BREAKFAST: null, LUNCH: null, DINNER: null, SNACK: null },
        mealCount: 0
      };
    });

    planEntries.forEach(entry => {
      const dayKey = (entry.dayOfWeek || '').toUpperCase();
      const mealType = (entry.mealType || '').toUpperCase();

      const cals = entry.estimatedCalories || 0;
      const mins = entry.estimatedTimeMinutes || 0;
      const cuisine = entry.cuisine || 'Special';

      totalPlannedCalories += cals;
      totalPlannedMinutes += mins;

      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;

      if (dayStats[dayKey]) {
        dayStats[dayKey].totalCalories += cals;
        dayStats[dayKey].totalMinutes += mins;
        dayStats[dayKey].mealCount += 1;
        if (['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].includes(mealType)) {
          dayStats[dayKey].meals[mealType] = entry;
        }
      }
    });

    const sortedPlannedCuisines = Object.entries(cuisineCounts)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count);

    const totalPlannedMeals = planEntries.length;

    // Count all cooked meals (manually marked, in history, or past standard time)
    const plannedMealsCooked = planEntries.filter(entry => isEntryCooked(entry)).length;

    const activeDays = Object.values(dayStats).filter(d => d.mealCount > 0);
    const busiestDay = activeDays.length > 0
      ? [...activeDays].sort((a, b) => b.totalMinutes - a.totalMinutes)[0]
      : null;
    const quickestDay = activeDays.length > 0
      ? [...activeDays].sort((a, b) => a.totalMinutes - b.totalMinutes)[0]
      : null;

    const maxDayCalories = Math.max(...Object.values(dayStats).map(d => d.totalCalories), 2200);

    return {
      totalPlannedCalories,
      totalPlannedMinutes,
      totalPlannedMeals,
      plannedMealsCooked,
      adherencePct: totalPlannedMeals > 0 ? Math.round((plannedMealsCooked / totalPlannedMeals) * 100) : 0,
      sortedPlannedCuisines,
      dayStats,
      busiestDay,
      quickestDay,
      maxDayCalories
    };
  }, [planEntries, analytics, manuallyCookedKeys]);

  // Selected Day calculations
  const selectedDayData = weeklyPlanStats.dayStats[selectedDayKey] || {
    key: selectedDayKey,
    label: selectedDayKey,
    short: selectedDayKey,
    totalCalories: 0,
    totalMinutes: 0,
    meals: { BREAKFAST: null, LUNCH: null, DINNER: null },
    mealCount: 0
  };

  const selectedDayCalories = selectedDayData.totalCalories;
  const breakfastCals = selectedDayData.meals.BREAKFAST?.estimatedCalories || 0;
  const lunchCals = selectedDayData.meals.LUNCH?.estimatedCalories || 0;
  const dinnerCals = selectedDayData.meals.DINNER?.estimatedCalories || 0;

  const breakfastPct = selectedDayCalories > 0 ? Math.round((breakfastCals / selectedDayCalories) * 100) : 0;
  const lunchPct = selectedDayCalories > 0 ? Math.round((lunchCals / selectedDayCalories) * 100) : 0;
  const dinnerPct = selectedDayCalories > 0 ? Math.round((dinnerCals / selectedDayCalories) * 100) : 0;

  const handleSelectDayFromChart = (dayKey) => {
    setSelectedDayKey(dayKey);
    if (daySectionRef.current) {
      daySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="loader" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2.25rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: '3.5rem'
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-container)', padding: '2px 4px', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={handlePrevWeek}
                title="Previous Week"
                aria-label="Previous Week"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--on-background)', fontWeight: 600, padding: '0 4px' }}>
                Week of {new Date(weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={handleNextWeek}
                title="Next Week"
                aria-label="Next Week"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {formatWeekStart(currentWeekMonday) !== formatWeekStart(getMonday(new Date())) && (
              <button
                type="button"
                onClick={handleCurrentWeek}
                className="active-tag"
                style={{ fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer', border: '1px solid var(--border-accent)' }}
              >
                Return to Current Week
              </button>
            )}
          </div>
          <h1
            style={{
              fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: 'var(--on-background)',
              letterSpacing: '-0.02em',
              margin: 0
            }}
          >
            Analytics
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem', margin: 0 }}>
            Weekly overview and nutritional breakdown for your meal plan.
          </p>
        </div>

        <Link
          to="/planner"
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.25rem',
            borderRadius: '0.75rem',
            fontWeight: 600
          }}
        >
          <CalendarDays size={18} style={{ color: 'var(--primary)' }} />
          <span>Edit Weekly Plan</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUMMARY METRIC CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid-4" style={{ gap: '1.25rem' }}>
        {/* Weekly Planned Calories */}
        <div className="glass-panel stat-card" style={{ borderRadius: '1.25rem', padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Planned Calories
              </p>
              <p style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--on-background)', marginTop: '0.35rem', margin: 0 }}>
                {weeklyPlanStats.totalPlannedCalories.toLocaleString()}{' '}
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>kcal</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
                ~{Math.round(weeklyPlanStats.totalPlannedCalories / 7).toLocaleString()} kcal / day avg
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '0.85rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Flame size={22} style={{ color: '#ef4444' }} />
            </div>
          </div>
        </div>

        {/* Weekly Cook Time */}
        <div className="glass-panel stat-card" style={{ borderRadius: '1.25rem', padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Estimated Cook Time
              </p>
              <p style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--on-background)', marginTop: '0.35rem', margin: 0 }}>
                {Math.floor(weeklyPlanStats.totalPlannedMinutes / 60)}h {weeklyPlanStats.totalPlannedMinutes % 60}m
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
                Across {weeklyPlanStats.totalPlannedMeals} scheduled meals
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '0.85rem',
                background: 'var(--primary-light)',
                border: '1px solid var(--border-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Clock size={22} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
        </div>

        {/* Plan Completion */}
        <div className="glass-panel stat-card" style={{ borderRadius: '1.25rem', padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Completed Meals
              </p>
              <p style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--on-background)', marginTop: '0.35rem', margin: 0 }}>
                {weeklyPlanStats.adherencePct}%
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
                {weeklyPlanStats.plannedMealsCooked} of {weeklyPlanStats.totalPlannedMeals} meals completed
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '0.85rem',
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
            </div>
          </div>
        </div>

        {/* Total Historical Cooked Recipes */}
        <div className="glass-panel stat-card" style={{ borderRadius: '1.25rem', padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Total Cooked
              </p>
              <p style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--on-background)', marginTop: '0.35rem', margin: 0 }}>
                {analytics?.totalCookedRecipes || 0}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
                Top cuisine: {analytics?.topCuisines?.[0]?.cuisine || weeklyPlanStats.sortedPlannedCuisines[0]?.cuisine || '—'}
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '0.85rem',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ChefHat size={22} style={{ color: 'var(--accent-info)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 1: DAY ANALYSIS SECTION                               */}
      {/* ============================================================= */}
      <div
        ref={daySectionRef}
        className="glass-panel"
        style={{
          borderRadius: '1.5rem',
          padding: '1.75rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '0.65rem',
                  background: 'var(--primary-light)',
                  border: '1px solid var(--border-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Calendar size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <h2
                style={{
                  fontSize: '1.45rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--on-background)',
                  margin: 0
                }}
              >
                Day-by-Day Analysis
              </h2>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '0.25rem', margin: 0 }}>
              Meals auto-complete past standard times (Breakfast 11 AM · Lunch 4 PM · Dinner 10 PM) or tap to mark instantly.
            </p>
          </div>

          {/* Day Selector Pills */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-container)',
              padding: '4px',
              borderRadius: '0.85rem',
              border: '1px solid var(--border-color)',
              overflowX: 'auto',
              maxWidth: '100%'
            }}
          >
            {DAYS_OF_WEEK.map(day => {
              const isSelected = selectedDayKey === day.key;
              const isToday = todayBackendKey === day.key;
              const dayHasMeals = weeklyPlanStats.dayStats[day.key]?.mealCount > 0;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{day.short}</span>
                  {isToday && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: isSelected ? '#ffffff' : 'var(--primary)',
                        display: 'inline-block'
                      }}
                    />
                  )}
                  {dayHasMeals && !isSelected && (
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'var(--success)',
                        display: 'inline-block'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Overview Stats Bar */}
        <div
          style={{
            background: 'var(--surface-container-high)',
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            alignItems: 'center'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Day of Week
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--on-background)', fontFamily: 'var(--font-display)' }}>
                {selectedDayData.label}
              </span>
              {todayBackendKey === selectedDayKey && (
                <span className="active-tag" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                  Today
                </span>
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Planned Calories
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                {selectedDayCalories.toLocaleString()}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>kcal total</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Prep & Cooking Time
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--on-background)', fontFamily: 'var(--font-display)' }}>
                {selectedDayData.totalMinutes}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>minutes</span>
            </div>
          </div>

          {/* Energy Split mini progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              <span>Meal Energy Split</span>
              <span>{selectedDayData.mealCount} of 3 Meals</span>
            </div>
            {selectedDayCalories > 0 ? (
              <div
                style={{
                  height: '10px',
                  borderRadius: '9999px',
                  background: 'var(--surface-container-lowest)',
                  display: 'flex',
                  overflow: 'hidden',
                  gap: '2px'
                }}
              >
                {breakfastPct > 0 && (
                  <div
                    title={`Breakfast: ${breakfastCals} kcal (${breakfastPct}%)`}
                    style={{ width: `${breakfastPct}%`, background: '#f59e0b', transition: 'width 0.3s ease' }}
                  />
                )}
                {lunchPct > 0 && (
                  <div
                    title={`Lunch: ${lunchCals} kcal (${lunchPct}%)`}
                    style={{ width: `${lunchPct}%`, background: '#10b981', transition: 'width 0.3s ease' }}
                  />
                )}
                {dinnerPct > 0 && (
                  <div
                    title={`Dinner: ${dinnerCals} kcal (${dinnerPct}%)`}
                    style={{ width: `${dinnerPct}%`, background: '#f97316', transition: 'width 0.3s ease' }}
                  />
                )}
              </div>
            ) : (
              <div style={{ height: '10px', borderRadius: '9999px', background: 'var(--surface-container-lowest)' }} />
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} /> B: {breakfastPct}%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> L: {lunchPct}%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} /> D: {dinnerPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Day Meal Cards */}
        {(() => {
          const activeMealKeys = selectedDayData.meals?.SNACK
            ? ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']
            : ['BREAKFAST', 'LUNCH', 'DINNER'];
          const gridClass = selectedDayData.meals?.SNACK ? 'grid-4' : 'grid-3';

          return (
            <div className={gridClass} style={{ gap: '1.25rem' }}>
              {activeMealKeys.map(mealKey => {
                const config = MEAL_TYPE_CONFIG[mealKey];
                const Icon = config.icon;
                const entry = selectedDayData.meals[mealKey];
                const isCooked = isEntryCooked(entry);

            return (
              <div
                key={mealKey}
                style={{
                  background: 'var(--surface-container)',
                  borderRadius: '1.15rem',
                  padding: '1.35rem',
                  border: isCooked ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Header: Meal Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '0.5rem',
                        background: config.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon size={18} style={{ color: config.color }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-background)', display: 'block' }}>
                        {config.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Target: {config.cutoffLabel}
                      </span>
                    </div>
                  </div>

                  {entry && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        background: isCooked ? 'rgba(52, 211, 153, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                        color: isCooked ? 'var(--success)' : 'var(--primary)',
                        border: isCooked ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(249, 115, 22, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      {isCooked ? <Check size={11} /> : null}
                      {isCooked ? 'Cooked' : 'Planned'}
                    </span>
                  )}
                </div>

                {/* Body: Recipe Details or Empty Slot */}
                {entry ? (
                  <div>
                    <h3
                      onClick={() => {
                        const fullSaved = savedRecipes.find(s => s.id === entry.recipeId || s.title === entry.recipeTitle);
                        setSelectedRecipe(fullSaved || entry);
                      }}
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--on-background)',
                        margin: 0,
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        textDecoration: 'none'
                      }}
                      title="Click to view full recipe details"
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--on-background)')}
                    >
                      <span>{entry.recipeTitle}</span>
                      <Utensils size={14} style={{ opacity: 0.6 }} />
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '0.4rem',
                          background: 'var(--surface-container-high)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {entry.cuisine || 'Chef Special'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <Flame size={12} /> {entry.estimatedCalories || 0} kcal
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <Clock size={12} /> {entry.estimatedTimeMinutes || 20}m
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1.5rem 0.5rem',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '0.75rem',
                      border: '1px dashed var(--border-color)'
                    }}
                  >
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, marginBottom: '0.5rem' }}>
                      No recipe scheduled for this slot
                    </p>
                    <Link
                      to="/planner"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span>+ Assign in Meal Plan</span>
                    </Link>
                  </div>
                )}

                {/* Card Action */}
                {entry && (
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    {isCooked ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          flex: 1,
                          fontSize: '0.82rem',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '0.65rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          background: 'rgba(52, 211, 153, 0.15)',
                          color: 'var(--success)',
                          border: '1px solid rgba(52, 211, 153, 0.35)',
                          fontWeight: 700,
                          cursor: 'default'
                        }}
                      >
                        <Check size={15} />
                        <span>Cooked</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDirectMarkCooked(entry)}
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          fontSize: '0.82rem',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '0.65rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          fontWeight: 700
                        }}
                      >
                        <ChefHat size={15} />
                        <span>Mark as Cooked</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const fullSaved = savedRecipes.find(s => s.id === entry.recipeId || s.title === entry.recipeTitle);
                        setSelectedRecipe(fullSaved || entry);
                      }}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '0.65rem',
                        fontSize: '0.82rem'
                      }}
                      title="Inspect recipe instructions & ingredients"
                    >
                      <BookOpen size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
          );
        })()}
      </div>

      {/* ============================================================= */}
      {/* SECTION 2: WEEKLY ANALYSIS & NUTRITION TRENDS                  */}
      {/* ============================================================= */}
      <div className="grid-2" style={{ gap: '1.75rem' }}>
        {/* 7-Day Calorie Distribution Bar Chart */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '1.5rem',
            padding: '1.75rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '0.55rem',
                    background: 'var(--primary-light)',
                    border: '1px solid var(--border-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--on-background)',
                      margin: 0
                    }}
                  >
                    7-Day Calorie Distribution
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Click any day column to focus Day Analysis
                  </p>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--surface-container)',
                  padding: '4px 10px',
                  borderRadius: '0.5rem'
                }}
              >
                Avg: ~{Math.round(weeklyPlanStats.totalPlannedCalories / 7)} kcal/day
              </span>
            </div>

            {/* Visual Bar Chart */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '0.65rem',
                height: '210px',
                paddingTop: '20px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              {DAYS_OF_WEEK.map(day => {
                const dayData = weeklyPlanStats.dayStats[day.key];
                const cals = dayData?.totalCalories || 0;
                const maxCals = weeklyPlanStats.maxDayCalories || 2000;
                const heightPct = Math.max(12, Math.round((cals / maxCals) * 100));
                const isSelected = selectedDayKey === day.key;
                const isToday = todayBackendKey === day.key;

                return (
                  <div
                    key={day.key}
                    onClick={() => handleSelectDayFromChart(day.key)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      cursor: 'pointer'
                    }}
                    title={`${day.label}: ${cals} kcal across ${dayData?.mealCount || 0} meals (Click to view)`}
                  >
                    {/* Calorie Label above bar */}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      {cals > 0 ? cals : '—'}
                    </span>

                    {/* Bar Pillar */}
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '38px',
                        height: `${heightPct}%`,
                        borderRadius: '0.65rem 0.65rem 0.25rem 0.25rem',
                        background: isSelected
                          ? 'var(--gradient-primary)'
                          : cals > 0
                          ? 'var(--surface-container-highest)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected
                          ? '1px solid var(--primary)'
                          : isToday
                          ? '1px solid var(--border-accent)'
                          : '1px solid var(--border-subtle)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {dayData?.mealCount > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: isSelected ? '#ffffff' : 'var(--primary)'
                          }}
                        />
                      )}
                    </div>

                    {/* Day label */}
                    <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? 'var(--primary)' : isToday ? 'var(--on-background)' : 'var(--text-secondary)'
                        }}
                      >
                        {day.short}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Bar Chart Legend & Insights */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', background: 'var(--primary)' }} />
              Active Meal Days ({Object.values(weeklyPlanStats.dayStats).filter(d => d.mealCount > 0).length}/7)
            </span>

            {weeklyPlanStats.busiestDay && (
              <span>
                Peak Prep: <strong>{weeklyPlanStats.busiestDay.label}</strong> ({weeklyPlanStats.busiestDay.totalMinutes}m)
              </span>
            )}
          </div>
        </div>

        {/* Weekly Cuisine Variety & Habit Breakdown */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '1.5rem',
            padding: '1.75rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '0.55rem',
                    background: 'var(--primary-light)',
                    border: '1px solid var(--border-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--on-background)',
                      margin: 0
                    }}
                  >
                    Weekly Cuisine Variety
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Planned & cooked cuisine diversification
                  </p>
                </div>
              </div>

              {weeklyPlanStats.sortedPlannedCuisines.length > 0 && (
                <span className="active-tag" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                  {weeklyPlanStats.sortedPlannedCuisines.length} Cuisines
                </span>
              )}
            </div>

            {/* Cuisine Progress Bars */}
            {weeklyPlanStats.sortedPlannedCuisines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {weeklyPlanStats.sortedPlannedCuisines.slice(0, 5).map(({ cuisine, count }) => {
                  const maxCount = weeklyPlanStats.sortedPlannedCuisines[0]?.count || 1;
                  const pct = Math.round((count / maxCount) * 100);

                  return (
                    <div key={cuisine} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--on-background)' }}>
                          {cuisine}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {count} meals ({Math.round((count / weeklyPlanStats.totalPlannedMeals) * 100)}%)
                        </span>
                      </div>
                      <div
                        className="progress-bar"
                        style={{ height: '7px', background: 'var(--progress-track)', borderRadius: '9999px', overflow: 'hidden' }}
                      >
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'var(--gradient-primary)',
                            borderRadius: '9999px'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem'
                }}>
                  <Utensils size={22} />
                </div>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                  No planned recipes this week yet. Plan meals to generate cuisine diversity metrics!
                </p>
              </div>
            )}
          </div>

          {/* Habit Badge Callout */}
          <div
            style={{
              background: 'var(--surface-container)',
              borderRadius: '1rem',
              padding: '1rem',
              marginTop: '1.25rem',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem'
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '0.65rem',
                background: 'rgba(249, 115, 22, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                {weeklyPlanStats.sortedPlannedCuisines.length >= 4
                  ? 'High Culinary Diversity'
                  : weeklyPlanStats.sortedPlannedCuisines.length >= 2
                  ? 'Balanced Weekly Palette'
                  : 'Focused Comfort Menu'}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                {weeklyPlanStats.quickestDay
                  ? `Quickest day: ${weeklyPlanStats.quickestDay.label} (${weeklyPlanStats.quickestDay.totalMinutes}m cook time).`
                  : 'Add recipes to your meal plan for dynamic cooking cadence.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 3: RECENT COOKING HISTORY LOG                         */}
      {/* ============================================================= */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.5rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '0.55rem',
                background: 'var(--primary-light)',
                border: '1px solid var(--border-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Clock size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--on-background)',
                  margin: 0
                }}
              >
                Recent Cooking Log
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                History of dishes marked as cooked from your weekly meal plan
              </p>
            </div>
          </div>

          {analytics?.recentHistory?.length > 0 && (
            <span className="active-tag" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
              {analytics.recentHistory.length} Recorded
            </span>
          )}
        </div>

        {analytics?.recentHistory?.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {analytics.recentHistory.map(h => (
              <div
                key={h.id}
                onClick={() => {
                  const found = savedRecipes.find(s => s.id === h.recipeId || s.title === h.recipeTitle);
                  setSelectedRecipe(found || { id: h.recipeId, title: h.recipeTitle, cuisine: h.cuisine });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  background: 'var(--surface-container)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '0.65rem',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Utensils size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'var(--on-background)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {h.recipeTitle}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {new Date(h.cookedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {h.notes ? (
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--primary)',
                        margin: 0,
                        marginTop: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <MessageSquare size={12} />
                      <span style={{ fontStyle: 'italic' }}>"{h.notes}"</span>
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                      {h.cuisine || 'Cooked Dish'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem'
            }}>
              <ChefHat size={26} />
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              No cooking history recorded yet. Mark meals as cooked in your daily schedule above to build your log!
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RECIPE DETAIL MODAL                                           */}
      {/* ------------------------------------------------------------- */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
