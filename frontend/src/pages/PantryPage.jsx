import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPantry, addPantryItem, deletePantryItem, clearPantry } from '../api/pantryApi';
import toast from 'react-hot-toast';
import {
  Archive,
  Plus,
  X,
  Search,
  Trash2,
  Sparkles,
  CheckCircle2,
  Calendar,
  ShoppingCart
} from 'lucide-react';
import CustomDropdown from '../components/common/CustomDropdown';
import IngredientAutocomplete from '../components/common/IngredientAutocomplete';
import { getUnitsForIngredient, normalizeIngredientName, POPULAR_STAPLES } from '../utils/ingredients';

export default function PantryPage() {
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItem, setNewItem] = useState({ ingredientName: '', quantity: '', unit: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchPantry();
  }, []);

  const fetchPantry = async () => {
    setLoading(true);
    try {
      const res = await getPantry();
      setPantryItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load pantry items');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPantryIngredient = (item) => {
    const name = typeof item === 'string' ? item : item.name;
    setNewItem(p => ({
      ...p,
      ingredientName: name
    }));
  };

  const handleAddPantryItem = async (overrideItem) => {
    const itemToAdd = overrideItem || newItem;
    if (!itemToAdd.ingredientName || !itemToAdd.ingredientName.trim()) {
      return toast.error('Enter an ingredient name');
    }
    const normalizedName = normalizeIngredientName(itemToAdd.ingredientName);
    try {
      const res = await addPantryItem({
        ingredientName: normalizedName,
        quantity: itemToAdd.quantity ? itemToAdd.quantity.trim() : '',
        unit: itemToAdd.unit ? itemToAdd.unit.trim() : ''
      });
      setPantryItems(prev => {
        const filtered = prev.filter(i => i.ingredientName.toLowerCase() !== normalizedName.toLowerCase());
        return [...filtered, res.data];
      });
      setNewItem({ ingredientName: '', quantity: '', unit: '' });
      toast.success(`Added ${normalizedName} to pantry`);
    } catch {
      toast.error('Failed to add pantry item');
    }
  };

  const handleDeletePantryItem = async (id, name) => {
    try {
      await deletePantryItem(id);
      setPantryItems(prev => prev.filter(i => i.id !== id));
      toast.success(`Removed ${name || 'item'} from pantry`);
    } catch {
      toast.error('Failed to delete item');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearPantry();
      setPantryItems([]);
      setShowClearConfirm(false);
      toast.success('Pantry cleared');
    } catch {
      toast.error('Failed to clear pantry');
    }
  };

  const filteredItems = useMemo(() => {
    return pantryItems.filter(item => {
      return !searchQuery.trim() ||
        item.ingredientName.toLowerCase().includes(searchQuery.toLowerCase().trim());
    });
  }, [pantryItems, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--on-background)',
            marginBottom: '0.35rem',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Archive size={34} style={{ color: 'var(--primary)' }} />
            <span>Pantry Management</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--on-surface-variant)', margin: 0, maxWidth: '700px' }}>
            Keep track of ingredients currently in your kitchen. Stock is automatically deducted when meals are cooked and subtracted from shopping lists.
          </p>
        </div>

        {/* Quick navigation shortcuts */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <Link
            to="/planner"
            className="quick-add-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.95rem',
              textDecoration: 'none',
              color: 'var(--on-background)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <Calendar size={15} style={{ color: 'var(--primary)' }} />
            <span>Meal Planner</span>
          </Link>
          <Link
            to="/shopping"
            className="quick-add-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.95rem',
              textDecoration: 'none',
              color: 'var(--on-background)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <ShoppingCart size={15} style={{ color: 'var(--primary)' }} />
            <span>Shopping List</span>
          </Link>
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '0.65rem',
            background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--on-background)' }}>
              Auto-Deduction on Cook
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              When you click "Cooked" in the Meal Planner, recipe ingredients are subtracted here and deleted if depleted.
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '0.65rem',
            background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--on-background)' }}>
              Smart Shopping List
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Shopping lists compare meal plan requirements against this pantry stock, so you never buy duplicates.
            </p>
          </div>
        </div>
      </div>

      {/* Add New Ingredient Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem', position: 'relative', zIndex: 30 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'var(--on-background)',
          marginBottom: '0.35rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Plus size={20} style={{ color: 'var(--primary)' }} />
          <span>Add Ingredient to Pantry</span>
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Search any ingredient name and specify remaining quantity and unit.
        </p>

        {/* Input Row */}
        <div className="pantry-add-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start', position: 'relative', zIndex: 35 }}>
          <div style={{ flex: '3 1 260px' }}>
            <IngredientAutocomplete
              id="pantry-name-input"
              value={newItem.ingredientName}
              onChange={(val) => setNewItem(p => ({ ...p, ingredientName: val }))}
              onSelect={handleSelectPantryIngredient}
              placeholder="Search ingredient (e.g. Basmati Rice, Olive Oil, Eggs)..."
              showStaples={false}
            />
          </div>
          <input
            type="text"
            placeholder="Quantity (e.g. 500, 2)"
            value={newItem.quantity}
            onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
            className="form-input"
            style={{
              flex: '1 1 110px',
              borderRadius: '0.75rem',
              padding: '0.65rem 1rem',
              fontSize: '0.9rem',
              height: '42px'
            }}
          />
          <div style={{ flex: '1 1 140px' }}>
            <CustomDropdown
              options={getUnitsForIngredient(newItem.ingredientName).options}
              value={newItem.unit}
              onChange={(u) => setNewItem(p => ({ ...p, unit: u }))}
              placeholder="Unit"
              minWidth="100%"
            />
          </div>
          <button
            className="btn btn-primary pantry-add-btn"
            onClick={() => handleAddPantryItem()}
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '0.75rem',
              height: '42px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700
            }}
          >
            <Plus size={16} /> <span>Add to Stock</span>
          </button>
        </div>

        {/* Quick Add Staples */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Quick Add Common Staples:
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {POPULAR_STAPLES.slice(0, 10).map(stapleName => {
              const alreadyInPantry = pantryItems.some(
                i => i.ingredientName.toLowerCase() === stapleName.toLowerCase()
              );
              return (
                <button
                  key={stapleName}
                  type="button"
                  onClick={() => {
                    handleSelectPantryIngredient(stapleName);
                  }}
                  className={`quick-add-pill ${alreadyInPantry ? 'in-pantry' : ''}`}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    opacity: alreadyInPantry ? 0.6 : 1
                  }}
                  title={alreadyInPantry ? `${stapleName} is already in pantry` : `Add ${stapleName}`}
                >
                  <Plus size={12} />
                  <span>{stapleName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pantry Inventory List Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem', position: 'relative', zIndex: 1 }}>
        {/* Header & Controls */}
        <div className="pantry-controls-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: 'var(--on-background)',
              margin: 0
            }}>
              Current Inventory ({pantryItems.length})
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} displayed
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  color: 'var(--on-background)',
                  fontSize: '0.85rem'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Clear All Button */}
            {pantryItems.length > 0 && (
              showClearConfirm ? (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleClearAll}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                  >
                    Confirm Clear
                  </button>
                  <button
                    className="quick-add-pill"
                    onClick={() => setShowClearConfirm(false)}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="quick-add-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#ef4444',
                    padding: '0.45rem 0.8rem',
                    fontSize: '0.8rem'
                  }}
                  title="Clear all pantry items"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              )
            )}
          </div>
        </div>



        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '3.5rem 1rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: '1rem' }}>
            <Archive size={40} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '0.75rem' }} />
            <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--on-background)', fontSize: '1.1rem', fontWeight: 700 }}>
              {searchQuery ? 'No matching ingredients' : 'Pantry is currently empty'}
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              {searchQuery ? 'Try clearing your search query above.' : 'Add your in-stock groceries and ingredients above to get started.'}
            </p>
          </div>
        ) : (
          /* Grid of Pantry Items */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.75rem'
          }}>
            {filteredItems.map(item => {
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.85rem',
                    background: 'var(--surface-container)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: 'var(--on-background)',
                      textTransform: 'capitalize',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.ingredientName}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {item.quantity ? (
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '0.5rem',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.quantity}{item.unit ? ' ' + item.unit : ''}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--success)'
                      }}>
                        In Stock
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeletePantryItem(item.id, item.ingredientName)}
                      className="tag-remove-btn"
                      aria-label={`Remove ${item.ingredientName}`}
                      title={`Remove ${item.ingredientName}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
