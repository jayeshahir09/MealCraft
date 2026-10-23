import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPreferences, updatePreferences } from '../api/shoppingListApi';
import { getPantry } from '../api/pantryApi';
import toast from 'react-hot-toast';
import { User, Plus, X, Save, LogOut, Utensils, Globe, ShieldAlert, Archive } from 'lucide-react';
import PrepTimeSlider from '../components/common/PrepTimeSlider';
import CustomDropdown from '../components/common/CustomDropdown';
import { POPULAR_CUISINES, ALL_DIETS } from '../utils/cuisines';
import { formatDisplayName } from '../utils/textUtils';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState({ dietType: 'NONE', allergies: [], preferredCuisine: '', maxCookTimeMinutes: '' });
  const [pantryItems, setPantryItems] = useState([]);
  const [allergyInput, setAllergyInput] = useState('');

  useEffect(() => {
    getPreferences().then(r => setPrefs(r.data)).catch(() => { });
    getPantry().then(r => setPantryItems(r.data)).catch(() => { });
  }, []);

  const handleSavePrefs = async () => {
    try {
      await updatePreferences(prefs);
      toast.success('Preferences saved successfully');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem', maxWidth: 880, margin: '0 auto', width: '100%' }}>
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
          Manage your dietary preferences, allergens, and pantry stock.
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
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-background)', margin: 0 }}>
                {formatDisplayName(user?.name)}
              </h3>
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
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.35rem', color: 'var(--on-background)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Utensils size={22} style={{ color: 'var(--primary)' }} />
            <span>Dietary Preferences</span>
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, marginTop: '4px' }}>
            Set your diet, preferred cuisine, and allergens.
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
                  color: '#059669', flexShrink: 0
                }}>
                  <Utensils size={18} />
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
                    className={`pill-btn${prefs.dietType === d.id ? ' active' : ''}`}
                    onClick={() => setPrefs(p => ({ ...p, dietType: d.id }))}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.6rem 0.5rem',
                      border: prefs.dietType === d.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    }}
                  >
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
                    className="pill-btn active"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.55rem 1rem',
                      border: '1.5px solid var(--primary)',
                    }}
                    title="Click to reset to None"
                  >
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
                  color: 'var(--primary)', flexShrink: 0
                }}>
                  <Globe size={18} />
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
                      className={`pill-btn${isSelected ? ' active' : ''}`}
                      onClick={() => setPrefs(p => ({ ...p, preferredCuisine: isSelected ? '' : c.id }))}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '0.6rem 0.5rem',
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      }}
                    >
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
                    className="pill-btn active"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.55rem 1rem',
                      border: '1.5px solid var(--primary)',
                    }}
                    title="Click to reset cuisine"
                  >
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
                color: '#dc2626', flexShrink: 0
              }}>
                <ShieldAlert size={18} />
              </div>
              <div>
                <label style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-background)', margin: 0, display: 'block' }}>
                  Household Allergens
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Automatically excluded from all recommended recipes
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

      {/* Dedicated Pantry Section Link Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '0.85rem',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            flexShrink: 0
          }}>
            <Archive size={24} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--on-background)', margin: '0 0 0.25rem 0' }}>
              Kitchen Pantry
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              {pantryItems.length > 0
                ? `${pantryItems.length} ${pantryItems.length === 1 ? 'item' : 'items'} currently in stock.`
                : 'Pantry is currently empty. Add your in-stock groceries and ingredients.'}
            </p>
          </div>
        </div>

        <Link
          to="/pantry"
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.92rem'
          }}
        >
          <Archive size={16} />
          <span>Manage Pantry Stock →</span>
        </Link>
      </div>
    </div>
  );
}

