'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, RotateCcw } from 'lucide-react';
import { useERPWorkstation } from '../../context/ERPWorkstationContext';
import { ERP_PALETTE_PRESETS, ERPPalettePreset, DEFAULT_PALETTE_PRESET } from '@/lib/erp/erpPalettePresets';

interface ZFPaletteCustomizerProps {
  isAr?: boolean;
}

export const ZFPaletteCustomizer: React.FC<ZFPaletteCustomizerProps> = ({ isAr = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { activePreset, selectPresetById } = useERPWorkstation();

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: isOpen ? 'var(--erp-accent-subtle, #eff6ff)' : 'transparent',
          border: 'none',
          color: isOpen ? 'var(--erp-accent, #2563eb)' : '#334155',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
        title={isAr ? 'تخصيص نسق ولون الواجهة (FIN-OS)' : 'Customize Accent Color (FIN-OS)'}
        aria-label={isAr ? 'تخصيص الألوان' : 'Customize Accent Color'}
      >
        <Palette size={19} strokeWidth={1.75} />
        {/* Active accent dot */}
        <span
          style={{
            position: 'absolute',
            bottom: '4px',
            right: isAr ? 'auto' : '4px',
            left: isAr ? '4px' : 'auto',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: activePreset?.accent || '#2563eb',
            border: '1px solid #ffffff',
          }}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: isAr ? 'auto' : 0,
            left: isAr ? 0 : 'auto',
            width: '310px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            padding: '1rem',
            zIndex: 1050,
            boxSizing: 'border-box',
            animation: 'zfPaletteFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`
            @keyframes zfPaletteFadeIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                {isAr ? 'نسق وألوان الواجهة' : 'Theme Accent Palette'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                {isAr ? 'ألوان رصينة معتمدة للأنظمة المالية' : 'Curated institutional enterprise tones'}
              </div>
            </div>
            {activePreset?.id !== DEFAULT_PALETTE_PRESET.id && (
              <button
                type="button"
                onClick={() => selectPresetById(DEFAULT_PALETTE_PRESET.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.68rem',
                  color: '#64748b',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.25rem 0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title={isAr ? 'استعادة الأزرق الافتراضي' : 'Reset to Default'}
              >
                <RotateCcw size={11} />
                <span>{isAr ? 'الافتراضي' : 'Default'}</span>
              </button>
            )}
          </div>

          {/* Presets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
            {ERP_PALETTE_PRESETS.map((preset) => {
              const isSelected = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPresetById(preset.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.6rem',
                    background: isSelected ? 'var(--erp-accent-subtle, #eff6ff)' : '#ffffff',
                    border: `1.5px solid ${isSelected ? preset.accent : '#e2e8f0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: isAr ? 'right' : 'left',
                    transition: 'all 0.12s ease',
                    outline: 'none',
                  }}
                >
                  {/* Swatch circle */}
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: preset.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                    }}
                  >
                    {isSelected && <Check size={11} strokeWidth={3.5} color="#ffffff" />}
                  </span>

                  {/* Label */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#0f172a' : '#334155',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {isAr ? preset.nameAr.split(' ')[0] + ' ' + (preset.nameAr.split(' ')[1] || '') : preset.nameEn}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {preset.contrastRatio}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Compliance Footer Note */}
          <div
            style={{
              padding: '0.5rem 0.65rem',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '8px',
              fontSize: '0.67rem',
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
              {isAr ? 'ضمان التباين وسلامة المؤشرات:' : 'Accessibility & Semantic Lock:'}
            </strong>
            {isAr
              ? 'ألوان الحالات الدلالية (الربح الأخضر، العجز الأحمر، التحذير الكهرماني) ثابتة ولا تتأثر بالسمة المختارة.'
              : 'Status indicators (green, red, amber, info) remain permanently fixed and unaffected by theme changes.'}
          </div>
        </div>
      )}
    </div>
  );
};
