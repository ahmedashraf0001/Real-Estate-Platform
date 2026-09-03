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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        direction: isAr ? 'rtl' : 'ltr',
        textAlign: isAr ? 'right' : 'left',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Header with Padlock */}
      <div 
        style={{
          padding: '0.85rem 1.25rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ color: '#946f23' }}>
            <Lock size={16} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
            {title}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
            #{recordId}
          </span>
        </div>

        <span 
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#92400e',
            background: '#fffbeb',
            padding: '0.22rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(217, 119, 6, 0.35)'
          }}
        >
          {isAr ? 'قيد نهائي — غير قابل للتعديل' : 'Posted — Immutable'}
        </span>
      </div>

      {/* Body Content (No edit/delete controls) */}
      <div style={{ padding: '1.25rem', background: '#ffffff' }}>
        {children}
      </div>

      {/* Footer Audit & Correction Citation */}
      <div 
        style={{
          padding: '0.65rem 1.25rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: '#64748b'
        }}
      >
        <Info size={14} color="#946f23" />
        <span>
          {correctionNotice || (isAr 
            ? 'هذا السجل محصن محاسبياً ضد التعديل أو الحذف المباشر (Section 0.6). تصحيح القيود يتم حصراً عبر قيد تسوية عكسي أو تعديل معتمد.'
            : 'This record cannot be edited or deleted (Section 0.6). Corrections are made strictly via a new reversing journal entry or formal amendment.')}
        </span>
      </div>
    </div>
  );
};
