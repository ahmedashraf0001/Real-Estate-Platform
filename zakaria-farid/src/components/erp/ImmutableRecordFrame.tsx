'use client';

import React from 'react';
import { Lock, Info } from 'lucide-react';

interface ImmutableRecordFrameProps {
  title: string;
  recordId: string;
  correctionNotice?: string;
  children: React.ReactNode;
  isAr?: boolean;
}

export const ImmutableRecordFrame: React.FC<ImmutableRecordFrameProps> = ({
  title,
  recordId,
  correctionNotice,
  children,
  isAr = false
}) => {
  return (
    <div 
      style={{
        background: 'var(--zf-bg-panel, #121622)',
        border: '1px solid var(--zf-border-hairline, rgba(212, 175, 55, 0.15))',
        borderRadius: '14px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        direction: isAr ? 'rtl' : 'ltr',
        textAlign: isAr ? 'right' : 'left'
      }}
    >
      {/* Header with Padlock */}
      <div 
        style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ color: 'var(--zf-gold, #d4af37)' }}>
            <Lock size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
            {title}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--zf-text-muted, #6b7086)' }}>
            #{recordId}
          </span>
        </div>

        <span 
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--zf-state-locked, #b98cff)',
            background: 'rgba(185, 140, 255, 0.12)',
            padding: '0.2rem 0.55rem',
            borderRadius: '6px',
            border: '1px solid rgba(185, 140, 255, 0.25)'
          }}
        >
          {isAr ? 'قيد نهائي — غير قابل للتعديل' : 'Posted — Immutable'}
        </span>
      </div>

      {/* Body Content (No edit/delete controls) */}
      <div style={{ padding: '1.25rem' }}>
        {children}
      </div>

      {/* Footer Audit & Correction Citation */}
      <div 
        style={{
          padding: '0.65rem 1.25rem',
          background: 'rgba(0, 0, 0, 0.35)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--zf-text-muted, #6b7086)'
        }}
      >
        <Info size={14} />
        <span>
          {correctionNotice || (isAr 
            ? 'هذا السجل محصن محاسبياً ضد التعديل أو الحذف المباشر (Section 0.6). تصحيح القيود يتم حصراً عبر قيد تسوية عكسي أو تعديل معتمد.'
            : 'This record cannot be edited or deleted (Section 0.6). Corrections are made strictly via a new reversing journal entry or formal amendment.')}
        </span>
      </div>
    </div>
  );
};
