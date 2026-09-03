'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface OpenQuestionFlagProps {
  questionId: string; // e.g. "Q1", "Q3", "Q4", "Q9", "Q11", "Q14"
  summary: string;
  interimDefault?: string;
  onNavigate?: (qid: string) => void;
  isAr?: boolean;
}

export const OpenQuestionFlag: React.FC<OpenQuestionFlagProps> = ({
  questionId,
  summary,
  interimDefault,
  onNavigate,
  isAr = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onNavigate) onNavigate(questionId);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: '#fffbeb',
          color: '#b45309',
          border: '1px solid rgba(217, 119, 6, 0.35)',
          borderRadius: '6px',
          padding: '0.18rem 0.45rem',
          fontSize: '0.72rem',
          fontWeight: 800,
          cursor: 'pointer',
          fontVariantNumeric: 'tabular-nums'
        }}
        title={`${questionId}: ${summary}`}
      >
        <AlertTriangle size={11} />
        <span>{questionId}</span>
      </button>

      {/* Floating Hover Card */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: isAr ? undefined : '0',
            right: isAr ? '0' : undefined,
            marginBottom: '0.4rem',
            width: '260px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.75rem 0.95rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            zIndex: 100,
            fontSize: '0.75rem',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangle size={12} />
            <span>{isAr ? `مسألة معلقة ${questionId}` : `Open Question ${questionId}`}</span>
          </div>
          <div style={{ color: '#0f172a', marginTop: '0.3rem', lineHeight: 1.4, fontWeight: 500 }}>
            {summary}
          </div>
          {interimDefault && (
            <div style={{ color: '#64748b', marginTop: '0.4rem', fontSize: '0.7rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.35rem' }}>
              <strong style={{ color: '#334155' }}>{isAr ? 'الإجراء المؤقت:' : 'Interim Default:'}</strong> {interimDefault}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
