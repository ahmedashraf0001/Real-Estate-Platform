'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, RotateCcw } from 'lucide-react';
import { ERP_PALETTE_PRESETS } from '@/lib/erp/erpPalettePresets';
import { useAccentPreset, accentTokens, AccentMode } from '@/lib/theme/accentPalette';
import styles from './AdminPaletteMenu.module.css';

export interface AdminPaletteMenuProps {
  isAr: boolean;
}

export function AdminPaletteMenu({ isAr }: AdminPaletteMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePreset, select] = useAccentPreset();
  const [mode, setMode] = useState<AccentMode>('dark');

  // Sync mode with document data-theme
  useEffect(() => {
    const resolveMode = (): AccentMode => {
      if (typeof document !== 'undefined') {
        const docTheme = document.documentElement.getAttribute('data-theme');
        return docTheme === 'light' ? 'light' : 'dark';
      }
      return 'dark';
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(resolveMode());

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            setMode(resolveMode());
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      return () => observer.disconnect();
    }
  }, []);

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
    <div ref={containerRef} className={styles.container} dir={isAr ? 'rtl' : 'ltr'}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={isAr ? 'لون النظام' : 'Accent color'}
        aria-label={isAr ? 'لون النظام' : 'Accent color'}
        aria-expanded={isOpen}
      >
        <Palette size={15} />
      </button>

      {isOpen && (
        <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>
              {isAr ? 'لون النظام' : 'Accent color'}
            </span>
            {activePreset?.id !== 'royal_blue' && (
              <button
                type="button"
                onClick={() => select('royal_blue')}
                className={styles.resetBtn}
                title={isAr ? 'استعادة الافتراضي' : 'Reset to default'}
              >
                <RotateCcw size={11} />
                <span>{isAr ? 'الافتراضي' : 'Default'}</span>
              </button>
            )}
          </div>

          <div className={styles.optionsList}>
            {ERP_PALETTE_PRESETS.map((preset) => {
              const isSelected = activePreset?.id === preset.id;
              const color = accentTokens(preset, mode).accent;

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.optionRow} ${isSelected ? styles.optionRowActive : ''}`}
                  onClick={() => select(preset.id)}
                >
                  <span
                    className={styles.swatch}
                    style={{ ['--swatch' as string]: color }}
                  />
                  <span className={styles.optionName}>
                    {isAr ? preset.nameAr : preset.nameEn}
                  </span>
                  {isSelected && (
                    <Check size={14} strokeWidth={2.5} className={styles.checkIcon} />
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.footerNote}>
            {isAr ? 'يُطبّق على لوحة الإدارة ومنظومة FIN-OS' : 'Applies to Admin and FIN-OS'}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPaletteMenu;
