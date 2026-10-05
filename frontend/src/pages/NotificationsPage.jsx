import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, Calendar, ShoppingCart,
  Sparkles, ChefHat, AlertCircle, Info, CheckCircle2,
  Clock, ArrowRight, Settings, Filter, RefreshCw, Flame,
  ShieldCheck, Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getMealPlan } from '../api/mealPlanApi';
import { getPantry } from '../api/pantryApi';
import { getSavedRecipes } from '../api/recipeApi';
import { getMonday, formatWeekStart, formatWeekStartUTC } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

const BACKEND_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function matchDayOfWeek(entryDay, target3Letter) {
  if (!entryDay || !target3Letter) return false;
  const upper = entryDay.toUpperCase();
  const target = target3Letter.toUpperCase();
  return upper === target || upper.startsWith(target);
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'COOKING', 'PANTRY', 'PLANNER', 'SYSTEM'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('mealcraft_notif_prefs');
      return saved ? JSON.parse(saved) : {
        mealReminders: true,
        pantryAlerts: true,
        planningReminders: true,
        aiTips: true,
      };
    } catch {
      return { mealReminders: true, pantryAlerts: true, planningReminders: true, aiTips: true };
    }
  });

  const weekStart = formatWeekStart(getMonday(new Date()));
  const todayIndex = new Date().getDay();
  const todayBackendDay = BACKEND_DAYS[todayIndex];
  const todayDayLabel = FULL_DAY_NAMES[todayIndex];

  // Save notification preferences
  const togglePref = (key) => {
    setNotifPrefs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('mealcraft_notif_prefs', JSON.stringify(updated));
      toast.success('Notification preferences updated! ⚙️');
      return updated;
    });
  };

  useEffect(() => {
    async function fetchLiveContext() {
      setLoading(true);
      try {
        const [planRes, pantryRes, savedRes] = await Promise.allSettled([
          getMealPlan(weekStart),
          getPantry(),
          getSavedRecipes({})
        ]);

        let currentPlan = (planRes.status === 'fulfilled' && planRes.value.data) ? planRes.value.data : null;
        if (!currentPlan?.entries || currentPlan.entries.length === 0) {
          const utcWeek = formatWeekStartUTC(getMonday(new Date()));
          if (utcWeek !== weekStart) {
            try {
              const fallback = await getMealPlan(utcWeek);
              if (fallback.data?.entries && fallback.data.entries.length > 0) {
                currentPlan = fallback.data;
              }
            } catch {
              // ignore
            }
          }
        }

        const pantryItems = (pantryRes.status === 'fulfilled' && pantryRes.value.data) ? pantryRes.value.data : [];
        const savedRecipes = (savedRes.status === 'fulfilled' && savedRes.value.data) ? savedRes.value.data : [];

        // Generate contextual notifications
        const readIds = new Set(JSON.parse(localStorage.getItem('mealcraft_read_notifs') || '[]'));
        const dismissedIds = new Set(JSON.parse(localStorage.getItem('mealcraft_dismissed_notifs') || '[]'));

        const generated = [];

        // 1. Today's Cooking Schedule Notification
        if (notifPrefs.mealReminders && currentPlan?.entries) {
          const todayEntries = currentPlan.entries.filter(e => matchDayOfWeek(e.dayOfWeek, todayBackendDay));
          if (todayEntries.length > 0) {
            const mealNames = todayEntries.map(e => `${e.mealType}: ${e.recipeTitle || 'Dish'}`).join(' • ');
            generated.push({
              id: `today-meals-${todayBackendDay}`,
              category: 'COOKING',
              icon: '🍳',
              title: `Today's Cooking Lineup (${todayDayLabel})`,
              description: `You have ${todayEntries.length} scheduled meals today: ${mealNames}. Ready to start preparation?`,
              timestamp: 'Scheduled for Today',
              badgeColor: 'var(--primary)',
              actionLabel: 'View Schedule',
              actionLink: '/dashboard',
              priority: 'high'
            });
          } else {
            generated.push({
              id: `today-no-meals-${todayBackendDay}`,
              category: 'COOKING',
              icon: '🍽️',
              title: `No Meals Scheduled for Today (${todayDayLabel})`,
              description: "You haven't assigned any meals for today yet. Use Recipe Craft or your saved recipes to plan your lunch or dinner!",
              timestamp: 'Morning Reminder',
              badgeColor: 'var(--accent)',
              actionLabel: 'Plan Today\'s Meals',
              actionLink: '/planner',
              priority: 'medium'
            });
          }
        }

        // 2. Weekly Meal Plan Completion Notification
        if (notifPrefs.planningReminders && currentPlan) {
          const count = currentPlan.entries?.length || 0;
          if (count < 14) {
            generated.push({
              id: `weekly-plan-progress-${count}`,
              category: 'PLANNER',
              icon: '📅',
              title: 'Weekly Meal Plan Progress',
              description: `You have filled ${count} of 21 slots for this week (${Math.round((count / 21) * 100)}% complete). Complete your schedule for zero-stress cooking!`,
              timestamp: 'Weekly Sync',
              badgeColor: '#eab308',
              actionLabel: 'Open Planner',
              actionLink: '/planner',
              priority: 'medium'
            });
          } else {
            generated.push({
              id: `weekly-plan-complete-${count}`,
              category: 'PLANNER',
              icon: '🌟',
              title: 'Weekly Culinary Master Plan',
              description: `Awesome job! You have ${count} meal slots organized and ready for the week!`,
              timestamp: 'This Week',
              badgeColor: '#10b981',
              actionLabel: 'Review Schedule',
              actionLink: '/planner',
              priority: 'low'
            });
          }
        }

        // 3. Pantry & Missing Groceries Notification
        if (notifPrefs.pantryAlerts) {
          const pantryNames = new Set(pantryItems.map(p => (p.ingredientName || '').trim().toLowerCase()));
          const missingSet = new Set();

          if (currentPlan?.entries) {
            currentPlan.entries.forEach(entry => {
              const fullRecipe = savedRecipes.find(s => s.id === (entry.recipeId || entry.recipe?.id)) || entry;
              const ings = entry.ingredients || entry.recipe?.ingredients || fullRecipe?.ingredients || [];
              ings.forEach(item => {
                const name = typeof item === 'string' ? item : item?.name;
                if (name && !pantryNames.has(name.trim().toLowerCase())) {
                  missingSet.add(name);
                }
              });
            });
          }

          if (missingSet.size > 0) {
            generated.push({
              id: `missing-groceries-${missingSet.size}`,
              category: 'PANTRY',
              icon: '🛒',
              title: `${missingSet.size} Missing Ingredients for Planned Meals`,
              description: `Items like ${Array.from(missingSet).slice(0, 3).join(', ')}${missingSet.size > 3 ? '...' : ''} are required for your scheduled meals. Generate a smart shopping list!`,
              timestamp: 'Auto-detected',
              badgeColor: '#f97316',
              actionLabel: 'Generate Grocery List',
              actionLink: '/shopping',
              priority: 'high'
            });
          } else if (pantryItems.length > 0) {
            generated.push({
              id: `pantry-stocked-${pantryItems.length}`,
              category: 'PANTRY',
              icon: '🧺',
              title: `Pantry Inventory: ${pantryItems.length} Ingredients in Stock`,
              description: `You have fresh staples including ${pantryItems.slice(0, 3).map(p => p.ingredientName).join(', ')}. Use Zero-Waste Chef to cook with what's on hand.`,
              timestamp: 'Inventory Check',
              badgeColor: '#10b981',
              actionLabel: 'Zero-Waste Cook',
              actionLink: '/suggest',
              priority: 'low'
            });
          }
        }

        // 4. AI Culinary Inspiration & Cookbook Tips
        if (notifPrefs.aiTips) {
          if (savedRecipes.length > 0) {
            const recent = savedRecipes[0];
            generated.push({
              id: `cookbook-tip-${recent.id}`,
              category: 'SYSTEM',
              icon: '✨',
              title: `Cookbook Spotlight: ${recent.title}`,
              description: `Ready to try your saved ${recent.cuisine || 'gourmet'} recipe? It only takes ${recent.estimatedTimeMinutes || 25} minutes to prepare!`,
              timestamp: 'AI Recommendation',
              badgeColor: '#8b5cf6',
              actionLabel: 'View Recipe',
              actionLink: '/saved',
              priority: 'low'
            });
          } else {
            generated.push({
              id: 'ai-studio-intro',
              category: 'SYSTEM',
              icon: '🤖',
              title: 'Explore AI Recipe Craft',
              description: 'Generate customized gourmet recipes matched to your exact dietary goals and prep time preferences in seconds.',
              timestamp: 'Welcome Tip',
              badgeColor: '#8b5cf6',
              actionLabel: 'Try Recipe Craft',
              actionLink: '/suggest',
              priority: 'low'
            });
          }
        }

        // Apply read and dismissed states
        const finalNotifs = generated
          .filter(n => !dismissedIds.has(n.id))
          .map(n => ({
            ...n,
            isRead: readIds.has(n.id)
          }));

        setNotifications(finalNotifs);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveContext();
  }, [weekStart, todayBackendDay, todayDayLabel, notifPrefs]);

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('mealcraft_read_notifs', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read! ✔️');
  };

  const toggleReadStatus = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n);
      const readIds = updated.filter(n => n.isRead).map(n => n.id);
      localStorage.setItem('mealcraft_read_notifs', JSON.stringify(readIds));
      return updated;
    });
  };

  const dismissNotification = (id) => {
    const dismissedIds = new Set(JSON.parse(localStorage.getItem('mealcraft_dismissed_notifs') || '[]'));
    dismissedIds.add(id);
    localStorage.setItem('mealcraft_dismissed_notifs', JSON.stringify(Array.from(dismissedIds)));
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notification dismissed');
  };

  const clearAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('mealcraft_dismissed_notifs', JSON.stringify(allIds));
    setNotifications([]);
    toast.success('All notifications cleared! 🧹');
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ALL') return true;
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }} className="animate-fade-in-up">
      {/* 1. Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔔</span>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Notifications & Alerts
            </span>
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '9999px'
              }}>
                {unreadCount} New
              </span>
            )}
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--on-background)',
            marginBottom: '0.25rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            Kitchen Alerts Center
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>
            Stay updated with cooking timelines, pantry restock alerts, and weekly meal plan updates.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowSettings(prev => !prev)}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '0.75rem', gap: '0.4rem', padding: '0.55rem 0.95rem' }}
          >
            <Sliders size={16} /> <span>Alert Preferences</span>
          </button>
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '0.75rem', gap: '0.4rem', padding: '0.55rem 0.95rem' }}
              >
                <CheckCheck size={16} /> <span>Mark all as read</span>
              </button>
              <button
                onClick={clearAllNotifications}
                className="btn btn-ghost btn-sm"
                style={{ borderRadius: '0.75rem', gap: '0.4rem', padding: '0.55rem 0.85rem', color: 'var(--error)' }}
              >
                <Trash2 size={16} /> <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Notification Preferences Drawer/Card (Collapsible) */}
      {showSettings && (
        <div className="glass-panel animate-fade-in-up" style={{
          padding: '1.5rem',
          borderRadius: '1.25rem',
          border: '1.5px solid var(--primary-light)',
          background: 'var(--surface-container-high)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--on-background)' }}>
                Notification & Alert Preferences
              </h3>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
            >
              Close
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            {[
              { key: 'mealReminders', label: 'Meal Schedule Alerts', desc: 'Reminders for breakfast, lunch, and dinner recipes' },
              { key: 'pantryAlerts', label: 'Pantry & Grocery Alerts', desc: 'Missing ingredients and restock notices' },
              { key: 'planningReminders', label: 'Weekly Planner Sync', desc: 'Progress prompts to finish scheduling your week' },
              { key: 'aiTips', label: 'Recipe Craft & Tips', desc: 'Personalized culinary suggestions and cookbook reminders' },
            ].map(pref => (
              <label
                key={pref.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  background: 'var(--surface-container)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={notifPrefs[pref.key]}
                  onChange={() => togglePref(pref.key)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-background)' }}>
                    {pref.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {pref.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 3. Category Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        overflowX: 'auto',
        paddingBottom: '0.35rem'
      }}>
        {[
          { id: 'ALL', label: 'All Alerts', count: notifications.length },
          { id: 'COOKING', label: 'Cooking & Schedule', count: notifications.filter(n => n.category === 'COOKING').length },
          { id: 'PANTRY', label: 'Pantry & Groceries', count: notifications.filter(n => n.category === 'PANTRY').length },
          { id: 'PLANNER', label: 'Weekly Planner', count: notifications.filter(n => n.category === 'PLANNER').length },
          { id: 'SYSTEM', label: 'AI & Tips', count: notifications.filter(n => n.category === 'SYSTEM').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: activeTab === tab.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
              background: activeTab === tab.id ? 'var(--primary-light)' : 'var(--surface-container)',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--surface-container-high)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              fontWeight: 700
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Notifications List */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '3.5rem 1rem', textAlign: 'center', borderRadius: '1.25rem' }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>Syncing your latest kitchen alerts...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-panel empty-state" style={{ padding: '4rem 1.5rem', textAlign: 'center', borderRadius: '1.25rem' }}>
          <span style={{ fontSize: '3rem', marginBottom: '0.75rem', display: 'inline-block' }}>✨</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
            You're All Caught Up!
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0.5rem auto 1.5rem auto' }}>
            No unread alerts or pending kitchen reminders for this category. Everything is running smoothly!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ padding: '0.55rem 1.15rem' }}>
              Back to Dashboard
            </Link>
            <Link to="/suggest" className="btn btn-primary btn-sm" style={{ padding: '0.55rem 1.15rem' }}>
              <Sparkles size={15} /> <span>Create New Recipe</span>
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNotifications.map(item => (
            <article
              key={item.id}
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.25rem',
                padding: '1.25rem 1.5rem',
                borderRadius: '1.15rem',
                border: item.isRead ? '1px solid var(--border-color)' : '1.5px solid var(--primary)',
                background: item.isRead ? 'var(--surface-container)' : 'var(--surface-container-high)',
                boxShadow: item.isRead ? 'none' : '0 4px 16px rgba(159, 64, 45, 0.08)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {/* Left Emoji / Category Badge */}
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '1rem',
                background: item.isRead ? 'var(--surface-container-high)' : 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0
              }}>
                {item.icon}
              </div>

              {/* Main Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{
                      fontSize: '1.05rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--on-background)',
                      margin: 0
                    }}>
                      {item.title}
                    </h3>
                    {!item.isRead && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'inline-block'
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {item.timestamp}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem 0', lineHeight: 1.45 }}>
                  {item.description}
                </p>

                {/* Card Action Strip */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {item.actionLabel && item.actionLink && (
                    <Link
                      to={item.actionLink}
                      className="btn btn-primary btn-sm"
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.4rem 0.95rem',
                        borderRadius: '0.65rem',
                        gap: '0.35rem'
                      }}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button
                      onClick={() => toggleReadStatus(item.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', color: 'var(--text-secondary)' }}
                      title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                    >
                      {item.isRead ? 'Mark Unread' : 'Mark Read'}
                    </button>
                    <button
                      onClick={() => dismissNotification(item.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', color: 'var(--error)' }}
                      title="Dismiss alert"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
