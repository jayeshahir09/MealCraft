import { useState, useEffect } from 'react';
import { getMealPlan } from '../api/mealPlanApi';
import { generateShoppingList, getShoppingList, toggleItem, addManualItem } from '../api/shoppingListApi';
import toast from 'react-hot-toast';
import { ShoppingCart, Check, Plus, Printer } from 'lucide-react';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ShoppingListPage() {
  const [plan, setPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualItem, setManualItem] = useState('');

  const weekStart = getMonday(new Date()).toISOString().split('T')[0];

  useEffect(() => {
    getMealPlan(weekStart).then(r => setPlan(r.data)).catch(() => {});
  }, []);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <span className="gradient-text">Shopping</span> List
        </h1>
        <p className="text-secondary">Auto-generated from your weekly meal plan, minus your pantry.</p>
      </div>

      {/* Generate button */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem' }}>
        <div>
          <h4>This week's shopping list</h4>
          <p className="text-sm text-muted">
            {plan?.entries?.length > 0
              ? `Based on ${plan.entries.length} meals in your plan`
              : 'Add meals to your planner first'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {shoppingList && (
            <button className="btn btn-secondary" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
          )}
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
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
          {/* Progress */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p className="font-semibold text-secondary">{checkedCount} of {totalCount} items collected</p>
              <span className="badge badge-accent">{totalCount - checkedCount} remaining</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {shoppingList.items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎉</div>
                <h3>You have everything!</h3>
                <p className="text-secondary">All ingredients are already in your pantry.</p>
              </div>
            ) : (
              shoppingList.items.map(item => (
                <div key={item.id} className={`shopping-item${item.isChecked ? ' checked' : ''}`}>
                  <div
                    className={`shopping-checkbox${item.isChecked ? ' checked' : ''}`}
                    onClick={() => handleToggle(item.id)}
                    id={`item-${item.id}`}
                  >
                    {item.isChecked && <Check size={12} color="#000" />}
                  </div>
                  <span className="item-name" style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {item.ingredientName}
                  </span>
                  {(item.quantity || item.unit) && (
                    <span className="text-sm text-muted">
                      {item.quantity} {item.unit}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Manual add */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                id="manual-item-input"
                type="text"
                className="form-input"
                placeholder="Add item manually..."
                value={manualItem}
                onChange={e => setManualItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handleAddManual} disabled={!manualItem.trim()}>
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        </>
      )}

      {!shoppingList && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>No shopping list yet</h3>
          <p className="text-secondary">Click Generate List to create one from your meal plan.</p>
        </div>
      )}
    </div>
  );
}
