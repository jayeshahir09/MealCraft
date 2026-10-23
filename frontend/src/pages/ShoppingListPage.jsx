import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMealPlan } from '../api/mealPlanApi';
import { generateShoppingList, getShoppingListByPlan, toggleItem, addManualItem } from '../api/shoppingListApi';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Check,
  Plus,
  Printer,
  Copy,
  Sparkles,
  Calendar,
  Info
} from 'lucide-react';

import { getMonday, formatWeekStart, formatWeekStartUTC } from '../utils/dateUtils';
import { findMasterIngredient } from '../utils/ingredients';

export default function ShoppingListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldAutoGenerate = searchParams.get('autoGenerate') === 'true';

  // Strictly define This Week and Next Week
  const currentMonday = useMemo(() => getMonday(new Date()), []);
  const nextMonday = useMemo(() => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    return d;
  }, [currentMonday]);

  // Selected target: either 'THIS_WEEK' or 'NEXT_WEEK'
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const queryWeek = searchParams.get('week');
    if (queryWeek && queryWeek === formatWeekStart(nextMonday)) {
      return 'NEXT_WEEK';
    }
    return 'THIS_WEEK';
  });

  const activeMonday = selectedWeek === 'NEXT_WEEK' ? nextMonday : currentMonday;
  const weekStart = formatWeekStart(activeMonday);
  const isThisWeek = selectedWeek === 'THIS_WEEK';
  const isNextWeek = selectedWeek === 'NEXT_WEEK';

  const [plan, setPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [manualItem, setManualItem] = useState('');

  const formatShortRange = (monday) => {
    const end = new Date(monday);
    end.setDate(end.getDate() + 6);
    return `${monday.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
  };

  const loadPlanAndList = useCallback(async () => {
    setLoadingPlan(true);
    setShoppingList(null);
    try {
      let currentPlan = null;
      const res = await getMealPlan(weekStart);
      if (res.data?.entries && res.data.entries.length > 0) {
        currentPlan = res.data;
      } else {
        const utcWeek = formatWeekStartUTC(activeMonday);
        if (utcWeek !== weekStart) {
          const fallbackRes = await getMealPlan(utcWeek);
          if (fallbackRes.data?.entries && fallbackRes.data.entries.length > 0) {
            currentPlan = fallbackRes.data;
          }
        }
        if (!currentPlan) currentPlan = res.data;
      }
      setPlan(currentPlan);

      if (currentPlan?.id) {
        try {
          const listRes = await getShoppingListByPlan(currentPlan.id);
          if (listRes.data && listRes.data.items?.length > 0) {
            setShoppingList(listRes.data);
          } else if (shouldAutoGenerate && currentPlan.entries?.length > 0) {
            setLoading(true);
            const genRes = await generateShoppingList(currentPlan.id, 'smart');
            setShoppingList(genRes.data);
            toast.success(`Generated shopping list with ${genRes.data.items?.length || 0} items`);
          }
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to load meal plan for shopping list:', err);
    } finally {
      setLoadingPlan(false);
    }
  }, [weekStart, activeMonday, shouldAutoGenerate, isThisWeek]);

  useEffect(() => {
    loadPlanAndList();
  }, [loadPlanAndList]);

  const handleGenerate = async () => {
    if (!plan?.id || !plan?.entries?.length) {
      return toast.error(
        isThisWeek
          ? 'No meals scheduled for this week. Plan meals in the Weekly Planner first!'
          : 'No meals scheduled for next week. Plan meals in the Weekly Planner first!'
      );
    }
    setLoading(true);
    try {
      const res = await generateShoppingList(plan.id, 'smart');
      setShoppingList(res.data);
      toast.success(`Shopping list generated! ${res.data.items?.length || 0} items`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate shopping list');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId) => {
    try {
      const updated = await toggleItem(itemId);
      setShoppingList(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? updated.data : i),
      }));
    } catch {
      toast.error('Failed to update item');
    }
  };

  const handleAddManual = async () => {
    if (!manualItem.trim() || !shoppingList?.id) return;
    try {
      const res = await addManualItem(shoppingList.id, manualItem.trim());
      setShoppingList(res.data);
      setManualItem('');
      toast.success('Item added');
    } catch {
      toast.error('Failed to add item');
    }
  };

  const handlePrint = () => window.print();

  const handleCopyList = () => {
    if (!shoppingList?.items?.length) return;
    const text = shoppingList.items
      .map(i => `${i.isChecked ? '✓' : '☐'} ${i.ingredientName}${i.quantity ? ` (${i.quantity} ${i.unit || ''})` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(`MealCraft Shopping List (${isThisWeek ? 'This Week' : 'Next Week'} - ${formatShortRange(activeMonday)}):\n\n${text}`);
    toast.success('Shopping list copied to clipboard');
  };

  const checkedCount = shoppingList?.items?.filter(i => i.isChecked).length || 0;
  const totalCount = shoppingList?.items?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
      {/* Title Header */}
      <div>
        <h1 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--on-background)',
          marginBottom: '0.35rem',
          letterSpacing: '-0.02em'
        }}>
          Shopping List
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Generate grocery lists strictly for <strong>This Week</strong> or in advance for <strong>Next Week</strong>.
        </p>
      </div>

      {/* Two-Week Toggle Selector (This Week vs Next Week Only) */}
      <div className="glass-panel shopping-week-selector" style={{ padding: '0.85rem 1.25rem', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="shopping-week-buttons" style={{ display: 'inline-flex', padding: '4px', background: 'var(--surface-container)', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setSelectedWeek('THIS_WEEK')}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.9rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: isThisWeek ? 'var(--primary)' : 'transparent',
              color: isThisWeek ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'none'
            }}
          >
            <Calendar size={16} />
            <span>This Week ({formatShortRange(currentMonday)})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedWeek('NEXT_WEEK')}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.9rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: isNextWeek ? 'var(--primary)' : 'transparent',
              color: isNextWeek ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'none'
            }}
          >
            <Sparkles size={16} />
            <span>Next Week ({formatShortRange(nextMonday)})</span>
          </button>
        </div>

        <div>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: '9999px',
            background: isThisWeek ? 'var(--primary-light)' : 'rgba(16, 185, 129, 0.12)',
            color: isThisWeek ? 'var(--primary)' : 'var(--success)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            {isThisWeek ? <Calendar size={13} /> : <Sparkles size={13} />}
            <span>{isThisWeek ? 'Current Running Week' : 'Advance Planning (Next Week)'}</span>
          </span>
        </div>
      </div>

      {/* Generation Control Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--on-background)', marginBottom: '0.25rem' }}>
              {isThisWeek ? 'Groceries for This Week' : 'Advance Groceries for Next Week'}
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              {plan?.entries?.length > 0
                ? `${plan.entries.length} scheduled meals found in ${isThisWeek ? 'this' : 'next'} week's meal plan`
                : `No meals scheduled yet for ${isThisWeek ? 'this' : 'next'} week`}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {shoppingList && (
              <>
                <button
                  className="quick-add-pill"
                  onClick={handleCopyList}
                  title="Copy list to clipboard"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem' }}
                >
                  <Copy size={16} /> <span>Copy</span>
                </button>
                <button
                  className="quick-add-pill"
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem' }}
                >
                  <Printer size={16} /> <span>Print</span>
                </button>
              </>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={loading || !plan?.entries?.length}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '0.75rem',
                background: 'var(--primary)',
                color: '#ffffff',
                border: '1px solid var(--border-accent)',
                boxShadow: 'var(--shadow-accent)',
                opacity: (!plan?.entries?.length) ? 0.6 : 1,
                fontWeight: 700
              }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Calculating...</>
              ) : (
                <><ShoppingCart size={16} /> {shoppingList ? 'Regenerate List' : 'Generate List'}</>
              )}
            </button>
          </div>
        </div>

        {/* Mode Selector (When viewing This Week) or Explanation (When viewing Next Week) */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--border-color)'
        }}>
          {isThisWeek ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Sparkles size={16} />
              <span>Smart Window: Upcoming Remaining Meals (From Now Onward)</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Sparkles size={16} />
              <span>Advance Shopping for Next Week</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <Info size={14} style={{ flexShrink: 0, color: 'var(--primary)' }} />
            <span>
              {isNextWeek
                ? 'Accounts for this week’s remaining meals first, projecting your pantry stock before calculating next week.'
                : 'Only calculates ingredients for upcoming remaining meals from right now until Sunday, minus what is in your pantry. Past and cooked meals are automatically excluded.'
              }
            </span>
          </div>
        </div>

        {/* Dynamic Summary Note */}
        {shoppingList?.summary && (
          <div style={{
            fontSize: '0.82rem',
            padding: '0.6rem 0.9rem',
            borderRadius: '0.65rem',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            color: 'var(--on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Sparkles size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <span>{shoppingList.summary}</span>
          </div>
        )}
      </div>

      {shoppingList && (
        <>
          {/* Progress Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 700, color: 'var(--on-background)', fontSize: '0.95rem', margin: 0 }}>
                {checkedCount} of {totalCount} items collected
              </p>
              <span className="active-tag" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                {totalCount - checkedCount} remaining
              </span>
            </div>
            <div className="progress-bar" style={{ height: '8px', background: 'var(--progress-track)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
                  height: '100%',
                  background: 'var(--gradient-primary)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {shoppingList.items.length === 0 ? (
              <div className="glass-panel empty-state" style={{ borderRadius: '1.25rem', padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ShoppingCart size={36} style={{ color: 'var(--success)', marginBottom: '0.75rem' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--on-background)', marginBottom: '0.5rem' }}>
                  All Set!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  All necessary ingredients are already covered by your pantry stock.
                </p>
              </div>
            ) : (
              shoppingList.items.map(item => {
                const master = findMasterIngredient(item.ingredientName);
                return (
                  <div
                    key={item.id}
                    className={`glass-panel shopping-item${item.isChecked ? ' checked' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.9rem',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '0.875rem',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                      border: item.isChecked ? '1px dashed var(--border-color)' : '1px solid var(--border-color)',
                      opacity: item.isChecked ? 0.65 : 1
                    }}
                  >
                    <div
                      className={`shopping-checkbox${item.isChecked ? ' checked' : ''}`}
                      onClick={() => handleToggle(item.id)}
                      id={`item-${item.id}`}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: '2px solid var(--border-accent)',
                        background: item.isChecked ? 'var(--primary)' : 'var(--surface-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {item.isChecked && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--on-background)',
                        textDecoration: item.isChecked ? 'line-through' : 'none'
                      }}>
                        {item.ingredientName}
                      </span>
                    </div>

                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--primary)',
                      flexShrink: 0
                    }}>
                      {item.quantity || '1'} {item.unit || master?.defaultUnit || 'pcs'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Manual Item input */}
          <div className="glass-panel shopping-manual-row" style={{ padding: '1rem 1.25rem', borderRadius: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Add extra item to shopping list (e.g., Dish soap, Paper towels)..."
              value={manualItem}
              onChange={e => setManualItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddManual()}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-color)',
                color: 'var(--on-background)',
                fontSize: '0.9rem'
              }}
            />
            <button
              className="btn btn-secondary"
              onClick={handleAddManual}
              disabled={!manualItem.trim()}
              style={{ padding: '0.65rem 1.1rem', borderRadius: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> <span>Add</span>
            </button>
          </div>
        </>
      )}

      {!shoppingList && !loadingPlan && (
        <div className="glass-panel empty-state" style={{ borderRadius: '1.25rem', padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ShoppingCart size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.7 }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--on-background)', marginBottom: '0.5rem' }}>
            No Shopping List Generated Yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '460px', marginBottom: '1.5rem' }}>
            {plan?.entries?.length > 0
              ? `You have ${plan.entries.length} meals planned for ${isThisWeek ? 'this week' : 'next week'}. Tap below to generate your tailored grocery list.`
              : `You do not have any meals planned for ${isThisWeek ? 'this week' : 'next week'} yet. Plan meals in the Weekly Planner first!`}
          </p>
          {plan?.entries?.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                background: 'var(--primary)',
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</>
              ) : (
                <><ShoppingCart size={18} /> Generate Shopping List</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
