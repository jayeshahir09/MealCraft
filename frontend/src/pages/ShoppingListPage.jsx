import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMealPlan } from '../api/mealPlanApi';
import { generateShoppingList, getShoppingList, getShoppingListByPlan, toggleItem, addManualItem } from '../api/shoppingListApi';
import toast from 'react-hot-toast';
import { ShoppingCart, Check, Plus, Printer, RefreshCw } from 'lucide-react';

import { getMonday, formatWeekStart, formatWeekStartUTC } from '../utils/dateUtils';
import { findMasterIngredient } from '../utils/ingredients';

export default function ShoppingListPage() {
  const [searchParams] = useSearchParams();
  const shouldAutoGenerate = searchParams.get('autoGenerate') === 'true';

  const [plan, setPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualItem, setManualItem] = useState('');

  const weekStart = formatWeekStart(getMonday(new Date()));

  useEffect(() => {
    async function loadPlan() {
      try {
        let currentPlan = null;
        const res = await getMealPlan(weekStart);
        if (res.data?.entries && res.data.entries.length > 0) {
          currentPlan = res.data;
        } else {
          // Fallback to UTC-shifted weekStart for any existing meal plans
          const utcWeek = formatWeekStartUTC(getMonday(new Date()));
          if (utcWeek !== weekStart) {
            const fallbackRes = await getMealPlan(utcWeek);
            if (fallbackRes.data?.entries && fallbackRes.data.entries.length > 0) {
              currentPlan = fallbackRes.data;
            }
          }
          if (!currentPlan) currentPlan = res.data;
        }
        setPlan(currentPlan);

        // Fetch or auto-generate shopping list if plan exists
        if (currentPlan?.id) {
          try {
            const listRes = await getShoppingListByPlan(currentPlan.id);
            if (listRes.data && listRes.data.items?.length > 0) {
              setShoppingList(listRes.data);
            } else if (shouldAutoGenerate && currentPlan.entries?.length > 0) {
              setLoading(true);
              const genRes = await generateShoppingList(currentPlan.id);
              setShoppingList(genRes.data);
              toast.success(`Generated shopping list with ${genRes.data.items?.length || 0} items! 🛒`);
            }
          } catch {
            // ignore
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load meal plan for shopping list:', err);
      }
    }
    loadPlan();
  }, [weekStart, shouldAutoGenerate]);

  const handleGenerate = async () => {
    if (!plan?.id) return toast.error('No meal plan for this week. Set up your meal plan first!');
    setLoading(true);
    try {
      const res = await generateShoppingList(plan.id);
      setShoppingList(res.data);
      toast.success(`Shopping list generated! ${res.data.items.length} items 🛒`);
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
    } catch { toast.error('Failed to update item'); }
  };

  const handleAddManual = async () => {
    if (!manualItem.trim() || !shoppingList?.id) return;
    try {
      const res = await addManualItem(shoppingList.id, manualItem.trim());
      setShoppingList(res.data);
      setManualItem('');
      toast.success('Item added!');
    } catch { toast.error('Failed to add item'); }
  };

  const handlePrint = () => window.print();

  const checkedCount = shoppingList?.items.filter(i => i.isChecked).length || 0;
  const totalCount = shoppingList?.items.length || 0;

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
          Smart Shopping List
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Auto-generated from your weekly meal plan, adjusted for what you already have in stock.
        </p>
      </div>

      {/* Generate Card Header */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderRadius: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--on-background)', marginBottom: '0.25rem' }}>
            This Week's Grocery List
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            {plan?.entries?.length > 0
              ? `Calculated from ${plan.entries.length} scheduled meals`
              : 'Add meals to your planner first'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {shoppingList && (
            <button
              className="quick-add-pill"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
            >
              <Printer size={16} /> <span>Print</span>
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'var(--primary)',
              color: '#ffffff',
              border: '1px solid rgba(159, 64, 45, 0.5)',
              boxShadow: '0 4px 12px rgba(159, 64, 45, 0.3)'
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</>
            ) : (
              <><ShoppingCart size={16} /> Generate List</>
            )}
          </button>
        </div>
      </div>

      {shoppingList && (
        <>
          {/* Progress Bar */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1.25rem' }}>
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
              <div className="glass-panel empty-state" style={{ borderRadius: '1.25rem', padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--on-background)', marginBottom: '0.5rem' }}>
                  You have everything!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  All ingredients required for this week's meals are in your pantry.
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
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
                        borderRadius: '7px',
                        border: '1.5px solid var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: item.isChecked ? 'var(--primary)' : 'var(--surface-container)',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {item.isChecked && <Check size={14} color="#ffffff" />}
                    </div>

                    <div style={{
                      fontSize: '1.25rem',
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--surface-container)',
                      flexShrink: 0
                    }}>
                      {master?.emoji || '🛒'}
                    </div>

                    <span
                      className="item-name"
                      style={{
                        flex: 1,
                        color: item.isChecked ? 'var(--text-muted)' : 'var(--on-background)',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        textDecoration: item.isChecked ? 'line-through' : 'none'
                      }}
                    >
                      {item.ingredientName}
                    </span>
                    {(item.quantity || item.unit) && (
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '1rem',
                        background: 'var(--primary-light)',
                        border: '1px solid rgba(159, 64, 45, 0.15)'
                      }}>
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Manual Add Input */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                id="manual-item-input"
                type="text"
                placeholder="Add grocery item manually..."
                value={manualItem}
                onChange={e => setManualItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                className="form-input"
                style={{
                  flex: 1,
                  borderRadius: '0.75rem',
                  padding: '0.65rem 1rem',
                  fontSize: '0.9rem'
                }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddManual}
                disabled={!manualItem.trim()}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem'
                }}
              >
                <Plus size={16} /> <span>Add</span>
              </button>
            </div>
          </div>
        </>
      )}

      {!shoppingList && !loading && (
        <div className="glass-panel empty-state" style={{ borderRadius: '1.25rem', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--on-background)', marginBottom: '0.5rem' }}>
            No shopping list generated
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Click <strong>Generate List</strong> to auto-assemble all needed ingredients from your meal planner.
          </p>
        </div>
      )}
    </div>
  );
}
