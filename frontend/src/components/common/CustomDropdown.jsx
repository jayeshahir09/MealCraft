import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export default function CustomDropdown({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  label = '',
  icon = null,
  searchable = true,
  minWidth = '220px',
  align = 'right',
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Isolate mouse wheel scroll so the parent page NEVER scrolls while scrolling the menu
  const handleWheel = useCallback((e) => {
    const list = listRef.current;
    if (!list) return;

    const delta = e.deltaY;
    const isScrollingDown = delta > 0;
    const isScrollingUp = delta < 0;

    const isAtBottom = list.scrollHeight - list.scrollTop <= list.clientHeight + 1;
    const isAtTop = list.scrollTop <= 0;

    if ((isScrollingDown && isAtBottom) || (isScrollingUp && isAtTop)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const selectedOption = options.find(
    (opt) => String(opt.id !== undefined ? opt.id : opt.val || '').toLowerCase() === String(value || '').toLowerCase()
  );

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.desc && opt.desc.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown-root ${className}`}
      style={{ position: 'relative', minWidth, zIndex: isOpen ? 1000 : 'auto', ...style }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`custom-dropdown-trigger ${isOpen ? 'active-trigger' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="dropdown-trigger-content">
          {selectedOption?.emoji && (
            <span className="dropdown-trigger-emoji">
              {selectedOption.emoji}
            </span>
          )}
          {icon && !selectedOption?.emoji && (
            <span className="dropdown-trigger-icon">
              {icon}
            </span>
          )}
          <span className="dropdown-trigger-label">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`dropdown-trigger-chevron ${isOpen ? 'rotated' : ''}`}
        />
      </button>

      {/* Luxury Floating Menu Popover with Contained Scroll */}
      {isOpen && (
        <div
          className="custom-dropdown-menu"
          role="listbox"
          style={{
            [align === 'left' ? 'left' : 'right']: 0
          }}
          onWheel={handleWheel}
        >
          {/* Quick Search Header */}
          {searchable && options.length > 5 && (
            <div className="dropdown-search-header">
              <div className="dropdown-search-input-wrapper">
                <Search size={14} className="dropdown-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  autoFocus
                  className="dropdown-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="dropdown-search-clear"
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Options List (overscroll-behavior: contain) */}
          <div
            ref={listRef}
            className="custom-dropdown-options-list"
            tabIndex={-1}
          >
            {filteredOptions.length === 0 ? (
              <div className="dropdown-no-results">
                <span>🔍 No matching options</span>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const optId = opt.id !== undefined ? opt.id : opt.val;
                const isSelected = String(optId || '').toLowerCase() === String(value || '').toLowerCase();

                return (
                  <button
                    key={String(optId)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(optId);
                      setIsOpen(false);
                    }}
                    className={`dropdown-item-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="dropdown-item-main">
                      {opt.emoji && (
                        <div className={`dropdown-item-emoji-box ${isSelected ? 'selected' : ''}`}>
                          <span>{opt.emoji}</span>
                        </div>
                      )}
                      <div className="dropdown-item-text">
                        <div className="dropdown-item-title">
                          {opt.label}
                        </div>
                        {opt.desc && (
                          <div className="dropdown-item-desc">
                            {opt.desc}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="dropdown-check-badge">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


