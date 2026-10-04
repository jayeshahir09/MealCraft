import { useState, useRef, useEffect } from 'react';
import { MASTER_INGREDIENTS, POPULAR_STAPLES, normalizeIngredientName, findMasterIngredient } from '../../utils/ingredients';
import { Search, Sparkles, Plus } from 'lucide-react';

export default function IngredientAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search or enter ingredient (e.g. Garlic, Milk)...',
  showStaples = false,
  onStapleClick,
  id,
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);

  // Filter matching ingredients
  const query = value.trim().toLowerCase();
  const matches = query.length > 0
    ? MASTER_INGREDIENTS.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.synonyms && item.synonyms.some(s => s.toLowerCase().includes(query)))
      ).slice(0, 8)
    : [];

  const exactMatch = MASTER_INGREDIENTS.find(i => i.name.toLowerCase() === query);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    } else if (onChange) {
      onChange(item.name);
    }
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleCustomAdd = () => {
    if (!value.trim()) return;
    const normalized = normalizeIngredientName(value);
    const itemObj = findMasterIngredient(normalized) || {
      name: normalized,
      category: 'Custom',
      emoji: '🥕',
      defaultUnit: ''
    };
    handleSelect(itemObj);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (matches.length > 0) setIsOpen(true);
      return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex(prev => (prev < matches.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(prev => (prev > 0 ? prev - 1 : matches.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIndex >= 0 && matches[highlightIndex]) {
          handleSelect(matches[highlightIndex]);
        } else {
          handleCustomAdd();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomAdd();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => {
            if (value.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`form-input ${className}`}
          style={{
            width: '100%',
            paddingRight: '2.5rem'
          }}
          autoComplete="off"
        />
        <div style={{
          position: 'absolute',
          right: '0.85rem',
          pointerEvents: 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={16} />
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (matches.length > 0 || (query.length > 1 && !exactMatch)) && (
        <div
          className="glass-panel animate-fade-in-up"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 999,
            maxHeight: '280px',
            overflowY: 'auto',
            borderRadius: '0.85rem',
            padding: '0.4rem',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-color)',
            background: 'var(--surface-overlay, #222)'
          }}
        >
          {matches.map((item, idx) => (
            <div
              key={item.name}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightIndex(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.6rem',
                cursor: 'pointer',
                background: highlightIndex === idx ? 'var(--primary-light, rgba(159, 64, 45, 0.15))' : 'transparent',
                color: highlightIndex === idx ? 'var(--primary)' : 'var(--on-background)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.name}</span>
                  {item.synonyms && item.synonyms.some(s => s.toLowerCase().includes(query)) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      (matched alias)
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '1rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)'
                }}>
                  {item.category}
                </span>
                {item.defaultUnit && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    std: {item.defaultUnit}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Custom entry fallback option */}
          {query.length > 1 && !exactMatch && (
            <div
              onClick={handleCustomAdd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.6rem',
                cursor: 'pointer',
                borderTop: '1px dashed var(--border-color)',
                marginTop: '0.25rem',
                color: 'var(--primary)',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              <Plus size={14} />
              <span>Use custom ingredient: <strong>"{value}"</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Quick Staples Row */}
      {showStaples && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '0.45rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <Sparkles size={13} style={{ color: 'var(--primary)' }} />
            <span>Quick Master Staples</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {POPULAR_STAPLES.map(stapleName => {
              const master = MASTER_INGREDIENTS.find(i => i.name === stapleName);
              return (
                <button
                  key={stapleName}
                  type="button"
                  onClick={() => {
                    if (onStapleClick) {
                      onStapleClick(master || stapleName);
                    } else if (master) {
                      handleSelect(master);
                    }
                  }}
                  className="quick-add-pill"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'var(--surface-container)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  <span>{master?.emoji || '🥕'}</span>
                  <span>{stapleName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
