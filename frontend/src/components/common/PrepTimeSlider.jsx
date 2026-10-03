import { Clock } from 'lucide-react';

export default function PrepTimeSlider({
  value = 30,
  onChange,
  min = 15,
  max = 120,
  step = 5,
  label = 'Max Prep / Cook Time',
  presets = [
    { val: 15, label: '⚡ 15m Speed' },
    { val: 30, label: '🍲 30m Standard' },
    { val: 45, label: '🥘 45m Dinner' },
    { val: 60, label: '🍷 60m+ Gourmet' }
  ],
  milestones = [
    { val: 15, label: '15m' },
    { val: 30, label: '30m' },
    { val: 45, label: '45m' },
    { val: 60, label: '60m' },
    { val: 75, label: '75m' },
    { val: 90, label: '90m' },
    { val: 120, label: '120m+' }
  ]
}) {
  const numericVal = (value !== undefined && value !== null && value !== '') ? Number(value) : 30;
  const clampedVal = Math.min(Math.max(numericVal, min), max);
  const fillPercent = Math.min(Math.max(((clampedVal - min) / (max - min)) * 100, 0), 100);

  return (
    <div className="prep-time-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
      {/* Header with Title and Dynamic Glowing Indicator Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--on-background)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Clock size={16} style={{ color: 'var(--primary)' }} />
          <span>{label}</span>
        </label>
        
        {/* Dynamic Glowing Value Badge - Perfectly Synced */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'var(--gradient-primary)',
          color: '#ffffff',
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          fontSize: '0.85rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(226, 114, 91, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          transition: 'all 0.15s ease'
        }}>
          <span>⏱️ {clampedVal} mins{clampedVal >= max ? '+' : ''}</span>
        </div>
      </div>

      {/* Progress Track & Range Slider Layer */}
      <div className="prep-time-slider-wrapper" style={{ position: 'relative', width: '100%', padding: '0.4rem 0' }}>
        {/* Base Background Track */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          height: '10px',
          borderRadius: '9999px',
          background: 'rgba(159, 64, 45, 0.12)',
          border: '1px solid rgba(159, 64, 45, 0.18)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)',
          pointerEvents: 'none'
        }} />

        {/* Dynamic Glowing Filled Progress Bar (Synced 100% with value) */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          height: '10px',
          width: `${fillPercent}%`,
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, #9f402d 0%, #e2725b 50%, #f97316 100%)',
          boxShadow: '0 0 12px rgba(226, 114, 91, 0.55)',
          pointerEvents: 'none',
          transition: 'width 0.1s ease-out'
        }} />

        {/* Range Input on Top */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clampedVal}
          className="prep-time-slider"
          onChange={(e) => onChange?.(Number(e.target.value))}
          onInput={(e) => onChange?.(Number(e.target.value))}
          aria-label={label}
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            height: '28px',
            background: 'transparent',
            border: 'none',
            margin: 0,
            display: 'block'
          }}
        />
      </div>

      {/* Milestone Scale with Interactive Tick Dots (Exact Mathematical Alignment) */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '28px',
        marginTop: '-0.15rem'
      }}>
        {milestones.map((m) => {
          const isSelected = clampedVal === m.val;
          const isPassed = clampedVal >= m.val;
          const tickPercent = Math.min(Math.max(((m.val - min) / (max - min)) * 100, 0), 100);
          
          // Smoothly clamp edge labels so text never overflows container
          const transformOrigin = tickPercent <= 4 ? 'translateX(0%)' : tickPercent >= 96 ? 'translateX(-100%)' : 'translateX(-50%)';

          return (
            <button
              key={m.val}
              type="button"
              onClick={() => onChange?.(m.val)}
              style={{
                position: 'absolute',
                left: `${tickPercent}%`,
                transform: transformOrigin,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: tickPercent <= 4 ? 'flex-start' : tickPercent >= 96 ? 'flex-end' : 'center',
                gap: '3px',
                padding: '2px 0',
                color: isSelected ? 'var(--primary)' : isPassed ? 'var(--on-background)' : 'var(--text-muted)',
                transition: 'color 0.15s ease'
              }}
              title={`Set to ${m.label}`}
            >
              <div style={{
                width: isSelected ? '8px' : '5px',
                height: isSelected ? '8px' : '5px',
                borderRadius: '50%',
                background: isSelected ? 'var(--primary)' : isPassed ? 'rgba(159, 64, 45, 0.75)' : 'rgba(159, 64, 45, 0.25)',
                boxShadow: isSelected ? '0 0 6px rgba(159, 64, 45, 0.8)' : 'none',
                alignSelf: tickPercent <= 4 ? 'flex-start' : tickPercent >= 96 ? 'flex-end' : 'center',
                marginLeft: tickPercent <= 4 ? '3px' : '0',
                marginRight: tickPercent >= 96 ? '3px' : '0',
                transition: 'all 0.2s ease'
              }} />
              <span style={{
                fontSize: '0.75rem',
                fontWeight: isSelected ? 800 : isPassed ? 600 : 500,
                lineHeight: 1,
                whiteSpace: 'nowrap'
              }}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Preset Buttons */}
      {presets && presets.length > 0 && (
        <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {presets.map((preset) => {
            const isSelected = clampedVal === preset.val;
            return (
              <button
                key={preset.val}
                type="button"
                onClick={() => onChange?.(preset.val)}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 600,
                  border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--surface-container)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

