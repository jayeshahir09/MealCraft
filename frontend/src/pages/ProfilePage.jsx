import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPreferences, updatePreferences } from '../api/shoppingListApi';
import { getPantry, addPantryItem, deletePantryItem } from '../api/pantryApi';
import toast from 'react-hot-toast';
import { User, Plus, Trash2, X, Save } from 'lucide-react';

const DIETS = ['NONE', 'VEGETARIAN', 'VEGAN', 'KETO', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_CARB'];

export default function ProfilePage() {
  const { user } = useAuth();
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

  const handleAddPantryItem = async () => {
    if (!newItem.ingredientName.trim()) return toast.error('Enter ingredient name');
    try {
      const res = await addPantryItem(newItem);
      setPantryItems(p => [...p, res.data]);
      setNewItem({ ingredientName: '', quantity: '', unit: '' });
      toast.success('Added to pantry!');
    } catch { toast.error('Failed to add item'); }
  };

  const handleDeletePantryItem = async (id) => {
    try {
      await deletePantryItem(id);
      setPantryItems(p => p.filter(i => i.id !== id));
    } catch { toast.error('Failed to delete item'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 800 }}>
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <span className="gradient-text">Profile</span> & Settings
        </h1>
        <p className="text-secondary">Manage your preferences and pantry.</p>
      </div>

      {/* User Info */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700, color: '#000'
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ color: 'var(--text-primary)' }}>{user?.name}</h3>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Dietary Preferences */}
      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>🥗 Dietary Preferences</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Diet Type</label>
            <div className="toggle-group">
              {DIETS.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`toggle-option${prefs.dietType === d ? ' active' : ''}`}
                  onClick={() => setPrefs(p => ({ ...p, dietType: d }))}
                >
                  {d === 'NONE' ? 'None' : d.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Allergies</label>
            <div className="chips-input-container">
              {prefs.allergies?.map(a => (
                <span key={a} className="chip chip-red">
                  {a}
                  <button className="chip-remove" onClick={() => removeAllergy(a)}><X size={12} /></button>
                </span>
              ))}
              <input
                className="chips-input-field"
                placeholder="Add allergy, press Enter..."
                value={allergyInput}
                onChange={e => setAllergyInput(e.target.value)}
                onKeyDown={addAllergy}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Preferred Cuisine</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Italian, Indian..."
                value={prefs.preferredCuisine || ''}
                onChange={e => setPrefs(p => ({ ...p, preferredCuisine: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Cook Time (mins)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g., 30"
                value={prefs.maxCookTimeMinutes || ''}
                onChange={e => setPrefs(p => ({ ...p, maxCookTimeMinutes: e.target.value ? parseInt(e.target.value) : null }))}
              />
            </div>
          </div>

          <button id="save-prefs-btn" className="btn btn-primary" onClick={handleSavePrefs} style={{ alignSelf: 'flex-start' }}>
            <Save size={16} /> Save Preferences
          </button>
        </div>
      </div>

      {/* Pantry */}
      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>🧺 My Pantry</h3>
        <p className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>
          Items here are automatically subtracted from shopping lists.
        </p>

        {/* Add new item */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            id="pantry-name-input"
            type="text"
            className="form-input"
            placeholder="Ingredient"
            value={newItem.ingredientName}
            onChange={e => setNewItem(p => ({ ...p, ingredientName: e.target.value }))}
            style={{ flex: '2 1 150px' }}
            onKeyDown={e => e.key === 'Enter' && handleAddPantryItem()}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Qty"
            value={newItem.quantity}
            onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
            style={{ flex: '1 1 80px' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Unit"
            value={newItem.unit}
            onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
            style={{ flex: '1 1 80px' }}
          />
          <button className="btn btn-primary" onClick={handleAddPantryItem}>
            <Plus size={16} /> Add
          </button>
        </div>

        {/* Pantry list */}
        {pantryItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p className="text-muted">Your pantry is empty. Add your staple ingredients!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {pantryItems.map(item => (
              <span key={item.id} className="chip chip-green">
                {item.ingredientName}
                {item.quantity && ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})`}
                <button className="chip-remove" onClick={() => handleDeletePantryItem(item.id)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
