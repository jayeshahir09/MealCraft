import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPreferences, updatePreferences } from '../api/shoppingListApi';
import { getPantry, addPantryItem, deletePantryItem } from '../api/pantryApi';
import toast from 'react-hot-toast';
import { User, Plus, X, Save, LogOut } from 'lucide-react';
import PrepTimeSlider from '../components/common/PrepTimeSlider';
import CustomDropdown from '../components/common/CustomDropdown';
import IngredientAutocomplete from '../components/common/IngredientAutocomplete';
import { POPULAR_CUISINES, ALL_DIETS } from '../utils/cuisines';
import { getUnitsForIngredient, findMasterIngredient, normalizeIngredientName } from '../utils/ingredients';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState({ dietType: 'NONE', allergies: [], preferredCuisine: '', maxCookTimeMinutes: '' });
  const [pantryItems, setPantryItems] = useState([]);
  const [newItem, setNewItem] = useState({ ingredientName: '', quantity: '', unit: '' });
  const [allergyInput, setAllergyInput] = useState('');

  useEffect(() => {
    getPreferences().then(r => setPrefs(r.data)).catch(() => {});
    getPantry().then(r => setPantryItems(r.data)).catch(() => {});
  }, []);

  const handleSavePrefs = async () => {
    try {
      await updatePreferences(prefs);
      toast.success('Preferences saved! ✅');
    } catch { toast.error('Failed to save preferences'); }
  };

  const addAllergy = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && allergyInput.trim()) {
      e.preventDefault();
      const val = allergyInput.trim().toLowerCase();
      if (!prefs.allergies?.includes(val)) {
        setPrefs(p => ({ ...p, allergies: [...(p.allergies || []), val] }));
      }
      setAllergyInput('');
    }
  };

  const removeAllergy = (a) => setPrefs(p => ({ ...p, allergies: p.allergies.filter(x => x !== a) }));

  const handleSelectPantryIngredient = (item) => {
    const name = typeof item === 'string' ? item : item.name;
    const unitsInfo = getUnitsForIngredient(name);
    setNewItem(p => ({
      ...p,
      ingredientName: name,
      unit: unitsInfo.defaultUnit || p.unit || ''
    }));
  };

  const handleAddPantryItem = async (overrideItem) => {
    const itemToAdd = overrideItem || newItem;
    if (!itemToAdd.ingredientName || !itemToAdd.ingredientName.trim()) {
      return toast.error('Enter ingredient name');
    }
    const normalizedName = normalizeIngredientName(itemToAdd.ingredientName);
    try {
      const res = await addPantryItem({
        ingredientName: normalizedName,
        quantity: itemToAdd.quantity || '',
        unit: itemToAdd.unit || ''
      });
      setPantryItems(p => {
        const filtered = p.filter(i => i.ingredientName.toLowerCase() !== normalizedName.toLowerCase());
        return [...filtered, res.data];
      });
      setNewItem({ ingredientName: '', quantity: '', unit: '' });
      toast.success(`Added ${normalizedName} to pantry!`);
    } catch { toast.error('Failed to add item'); }
  };

  const handleDeletePantryItem = async (id) => {
    try {
      await deletePantryItem(id);
      setPantryItems(p => p.filter(i => i.id !== id));
      toast.success('Removed from pantry');
    } catch { toast.error('Failed to delete item'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem', maxWidth: 880, margin: '0 auto', width: '100%' }} className="animate-fade-in-up">
      <div>
        <h1 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--on-background)',
          marginBottom: '0.35rem',
          letterSpacing: '-0.02em'
        }}>
          Profile & Preferences
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Manage your dietary profile, household allergens, and kitchen pantry stock.
        </p>
      </div>

      {/* User Info Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 58, height: 58, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.35rem', fontWeight: 700, color: '#ffffff',
              boxShadow: '0 4px 14px rgba(255, 120, 84, 0.35)',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>{user?.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) {
                logout();
              }
            }}
            className="btn btn-danger btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '0.75rem', padding: '0.5rem 1rem' }}
          >
            <LogOut size={15} /> <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Dietary Preferences Section */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.35rem', color: 'var(--on-background)', margin: 0 }}>
            🥗 Dietary Preferences
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, marginTop: '4px' }}>
            Set your default dietary framework, preferred culinary traditions, and allergen restrictions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.5rem', width: '100%' }}>
          {/* Diet Type Refined Card */}
          <div style={{
            background: 'var(--surface-container)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '0.75rem',
                  background: 'rgba(52, 211, 153, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem', flexShrink: 0
                }}>
                  🥗
                </div>
                <div>
                  <label style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: 0, display: 'block' }}>
                    Diet Type
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    {ALL_DIETS.find(d => d.id === prefs.dietType)?.label || 'None / Any'}
                  </span>
                </div>
              </div>

              {/* Refined Custom Dropdown */}
              <CustomDropdown
                options={ALL_DIETS}
                value={prefs.dietType || 'NONE'}
                onChange={(val) => setPrefs(p => ({ ...p, dietType: val }))}
                placeholder="All Diets Menu..."
                minWidth="155px"
              />
            </div>

            {/* Full-Width 4-Option Grid */}
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                Quick Selection:
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                gap: '0.6rem',
                width: '100%'
              }}>
                {ALL_DIETS.slice(0, 4).map(d => (
                  <button
                    key={d.id}
                    type="button"
                    className={`stitch-pill-btn${prefs.dietType === d.id ? ' active' : ''}`}
                    onClick={() => setPrefs(p => ({ ...p, dietType: d.id }))}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.6rem 0.5rem',
                      border: prefs.dietType === d.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    }}
                  >
                    <span className="pill-emoji">{d.emoji}</span>
                    <span className="pill-label">{d.label}</span>
                  </button>
                ))}
              </div>

              {/* If selected diet is outside top 4, show prominent active badge */}
              {prefs.dietType && !ALL_DIETS.slice(0, 4).some(d => d.id === prefs.dietType) && (
                <div style={{ marginTop: '0.6rem', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setPrefs(p => ({ ...p, dietType: 'NONE' }))}
                    className="stitch-pill-btn active"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.55rem 1rem',
                      border: '1.5px solid var(--primary)',
                    }}
                    title="Click to reset to None"
                  >
                    <span className="pill-emoji">{ALL_DIETS.find(d => d.id === prefs.dietType)?.emoji || '🍽️'}</span>
                    <span className="pill-label">Selected: {ALL_DIETS.find(d => d.id === prefs.dietType)?.label || prefs.dietType}</span>
                    <X size={14} style={{ flexShrink: 0, marginLeft: '0.35rem' }} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preferred Cuisine Refined Card */}
          <div style={{
            background: 'var(--surface-container)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '0.75rem',
                  background: 'rgba(238, 108, 77, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem', flexShrink: 0
                }}>
                  🌎
                </div>
                <div>
                  <label style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: 0, display: 'block' }}>
                    Preferred Cuisine
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    {POPULAR_CUISINES.find(c => c.id.toLowerCase() === (prefs.preferredCuisine || '').toLowerCase())?.label || prefs.preferredCuisine || 'Any Cuisine'}
                  </span>
                </div>
              </div>

              {/* Refined Custom Dropdown */}
              <CustomDropdown
                options={POPULAR_CUISINES}
                value={prefs.preferredCuisine || ''}
                onChange={(val) => setPrefs(p => ({ ...p, preferredCuisine: val }))}
                placeholder="All Cuisines Menu..."
                minWidth="160px"
              />
            </div>

            {/* Full-Width 4-Option Grid */}
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                Quick Selection:
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                gap: '0.6rem',
                width: '100%'
              }}>
                {POPULAR_CUISINES.filter(c => c.id !== '').slice(0, 4).map(c => {
                  const isSelected = (prefs.preferredCuisine || '').toLowerCase() === c.id.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`stitch-pill-btn${isSelected ? ' active' : ''}`}
                      onClick={() => setPrefs(p => ({ ...p, preferredCuisine: isSelected ? '' : c.id }))}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '0.6rem 0.5rem',
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      }}
                    >
                      <span className="pill-emoji">{c.emoji}</span>
                      <span className="pill-label">{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* If selected cuisine is outside top 4, show prominent active badge */}
              {prefs.preferredCuisine && !POPULAR_CUISINES.filter(c => c.id !== '').slice(0, 4).some(c => c.id.toLowerCase() === prefs.preferredCuisine.toLowerCase()) && (
                <div style={{ marginTop: '0.6rem', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setPrefs(p => ({ ...p, preferredCuisine: '' }))}
                    className="stitch-pill-btn active"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.55rem 1rem',
                      border: '1.5px solid var(--primary)',
                    }}
                    title="Click to reset cuisine"
                  >
                    <span className="pill-emoji">{POPULAR_CUISINES.find(c => c.id.toLowerCase() === prefs.preferredCuisine.toLowerCase())?.emoji || '🍽️'}</span>
                    <span className="pill-label">Selected: {prefs.preferredCuisine}</span>
                    <X size={14} style={{ flexShrink: 0, marginLeft: '0.35rem' }} />
                  </button>
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Or enter custom regional cuisine (e.g. Lebanese, Peruvian)..."
              value={prefs.preferredCuisine || ''}
              onChange={e => setPrefs(p => ({ ...p, preferredCuisine: e.target.value }))}
              className="form-input"
              style={{
                borderRadius: '0.75rem',
                padding: '0.65rem 1rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Household Allergens Card */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'var(--surface-container)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '0.75rem',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', flexShrink: 0
              }}>
                🛡️
              </div>
              <div>
                <label style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: 0, display: 'block' }}>
                  Household Allergens
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Always strictly excluded by AI recipe generator
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {prefs.allergies?.map(a => (
                <span
                  key={a}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(254, 226, 226, 0.8)',
                    color: '#991b1b',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    border: '1px solid rgba(252, 165, 165, 0.6)'
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>{a}</span>
                  <button
                    onClick={() => removeAllergy(a)}
                    style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    aria-label={`Remove allergen ${a}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>

            <input
              type="text"
              placeholder="Type allergen and press Enter (e.g. peanuts, dairy, shellfish)..."
              value={allergyInput}
              onChange={e => setAllergyInput(e.target.value)}
              onKeyDown={addAllergy}
              className="form-input"
              style={{
                borderRadius: '0.75rem',
                padding: '0.7rem 1rem',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Max Cook / Prep Time Dynamic Progress Bar Slider */}
          <div style={{
            background: 'var(--surface-container)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '1.1rem',
            padding: '1.5rem'
          }}>
            <PrepTimeSlider
              value={prefs.maxCookTimeMinutes || 30}
              label="Default Max Cooking Time"
              onChange={(val) => setPrefs(p => ({ ...p, maxCookTimeMinutes: val }))}
            />
          </div>

          <button
            id="save-prefs-btn"
            className="btn btn-primary"
            onClick={handleSavePrefs}
            style={{
              alignSelf: 'flex-start',
              padding: '0.75rem 1.75rem',
              borderRadius: '0.75rem',
              fontWeight: 700,
              fontSize: '0.95rem'
            }}
          >
            <Save size={16} /> <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* Pantry Card */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.35rem', color: 'var(--on-background)', marginBottom: '0.35rem' }}>
          🧺 My Pantry
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Standardized ingredients stored here are auto-subtracted with exact units when generating shopping lists.
        </p>

        {/* Add new item */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 240px' }}>
            <IngredientAutocomplete
              id="pantry-name-input"
              value={newItem.ingredientName}
              onChange={(val) => setNewItem(p => ({ ...p, ingredientName: val }))}
              onSelect={handleSelectPantryIngredient}
              placeholder="Search master ingredient (e.g. Garlic, Whole Milk)..."
              showStaples={true}
              onStapleClick={(staple) => {
                handleSelectPantryIngredient(staple);
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Qty (e.g. 500, 2)"
            value={newItem.quantity}
            onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
            className="form-input"
            style={{
              flex: '1 1 80px',
              borderRadius: '0.75rem',
              padding: '0.65rem 1rem',
              fontSize: '0.9rem',
              height: '42px'
            }}
          />
          <div style={{ flex: '1 1 160px' }}>
            <CustomDropdown
              options={getUnitsForIngredient(newItem.ingredientName).options}
              value={newItem.unit}
              onChange={(u) => setNewItem(p => ({ ...p, unit: u }))}
              placeholder="Unit"
              minWidth="100%"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleAddPantryItem()}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              height: '42px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Plus size={16} /> <span>Add</span>
          </button>
        </div>

        {/* Pantry list */}
        {pantryItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Your pantry is currently empty. Add staple ingredients above!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            {pantryItems.map(item => {
              const master = findMasterIngredient(item.ingredientName);
              return (
                <span
                  key={item.id}
                  className="active-tag"
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.4rem 0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{master?.emoji || '🥕'}</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                    {item.ingredientName}
                    {item.quantity && (
                      <span style={{ fontWeight: 400, opacity: 0.85, marginLeft: '0.25rem' }}>
                        ({item.quantity}{item.unit ? ' ' + item.unit : ''})
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDeletePantryItem(item.id)}
                    className="stitch-tag-remove"
                    aria-label={`Remove ${item.ingredientName}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

