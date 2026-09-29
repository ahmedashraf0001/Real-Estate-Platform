'use client';

import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface ZFSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isAr?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md';
  autoFocus?: boolean;
  onClear?: () => void;
}

export const ZFSearchBar: React.FC<ZFSearchBarProps> = ({
  value,
  onChange,
  placeholder,
  isAr = true,
  disabled = false,
  className = '',
  style = {},
  size = 'sm',
  autoFocus = false,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isSmall = size === 'sm';
  const height = isSmall ? '32px' : '36px';
  const fontSize = isSmall ? '0.75rem' : '0.8rem';
  const iconSize = isSmall ? 14 : 16;
  const defaultPlaceholder = isAr ? 'بحث سريع وتصفية السجلات...' : 'Quick search and filter records...';

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  return (
    <div
      className={className}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        background: disabled ? '#f8fafc' : '#ffffff',
        border: '1px solid var(--erp-border, #cbd5e1)',
        borderRadius: '6px',
        padding: '0 0.65rem',
        height,
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.65 : 1,
        ...style,
      }}
      onClick={() => inputRef.current?.focus()}
      onFocus={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = '#2563eb';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.12)';
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Search
        size={iconSize}
        style={{
          color: '#94a3b8',
          flexShrink: 0,
        }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        disabled={disabled}
        autoFocus={autoFocus}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: '#334155',
          fontSize,
          fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          padding: 0,
        }}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          aria-label={isAr ? 'مسح البحث' : 'Clear search'}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            color: '#94a3b8',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'color 0.15s ease, background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0f172a';
            e.currentTarget.style.backgroundColor = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
