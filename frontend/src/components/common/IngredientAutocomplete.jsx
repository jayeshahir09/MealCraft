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

        {/* Autocomplete Dropdown */}
        {isOpen && (matches.length > 0 || (query.length > 1 && !exactMatch)) && (
          <div
            className="glass-panel animate-fade-in-up"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 9999,
              maxHeight: '300px',
              overflowY: 'auto',
              borderRadius: '1rem',
              padding: '0.45rem',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--border-color)',
              background: 'var(--bg-surface)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            {matches.map((item, idx) => {
              const isHighlighted = highlightIndex === idx;
              const matchedSynonym = item.synonyms && item.synonyms.find(s => s.toLowerCase().includes(query));

              return (
                <div
                  key={item.name}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.7rem',
                    cursor: 'pointer',
                    background: isHighlighted ? 'var(--primary-light)' : 'transparent',
                    color: isHighlighted ? 'var(--primary)' : 'var(--text-primary)',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      fontSize: '1.25rem',
                      width: '34px',
                      height: '34px',
                      borderRadius: '0.55rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isHighlighted ? 'var(--bg-surface)' : 'var(--surface-container)'
                    }}>
                      {item.emoji}
                    </div>
                    <div>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '0.92rem',
                        color: isHighlighted ? 'var(--primary)' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem'
                      }}>
                        <span>{item.name}</span>
                        {matchedSynonym && matchedSynonym.toLowerCase() !== item.name.toLowerCase() && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.4rem',
                            background: 'var(--surface-container-highest)',
                            color: 'var(--text-muted)'
                          }}>
                            matches "{matchedSynonym}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '1rem',
                      background: isHighlighted ? 'var(--surface-container-highest)' : 'var(--surface-container)',
                      color: isHighlighted ? 'var(--primary)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {item.category}
                    </span>
                    {item.defaultUnit && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.35rem',
                        background: 'var(--surface-container-lowest, rgba(0,0,0,0.04))'
                      }}>
                        unit: {item.defaultUnit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Custom entry fallback option */}
            {query.length > 1 && !exactMatch && (
              <div
                onClick={handleCustomAdd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.7rem',
                  cursor: 'pointer',
                  borderTop: '1px dashed var(--border-color)',
                  marginTop: '0.2rem',
                  color: 'var(--primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'var(--primary-light)',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Plus size={14} />
                </div>
                <span>Add custom ingredient: <strong>"{value}"</strong></span>
              </div>
            )}

            {/* Dropdown Keyboard Hint Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.6rem 0.15rem',
              borderTop: '1px solid var(--border-color)',
              marginTop: '0.25rem',
              fontSize: '0.68rem',
              color: 'var(--text-muted)'
            }}>
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
          </div>
        )}
      </div>

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
