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
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '4px',
          padding: '0.15rem 0.4rem',
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'monospace'
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
            background: 'var(--zf-bg-panel-raised, #171c2b)',
            border: '1px solid var(--zf-border-hairline, rgba(212, 175, 55, 0.25))',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
            zIndex: 100,
            fontSize: '0.75rem',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangle size={12} />
            <span>{isAr ? `مسألة معلقة ${questionId}` : `Open Question ${questionId}`}</span>
          </div>
          <div style={{ color: 'var(--zf-text-primary, #eef0f4)', marginTop: '0.25rem', lineHeight: 1.3 }}>
            {summary}
          </div>
          {interimDefault && (
            <div style={{ color: 'var(--zf-text-muted, #6b7086)', marginTop: '0.35rem', fontSize: '0.7rem' }}>
              <strong>{isAr ? 'الإجراء المؤقت:' : 'Interim Default:'}</strong> {interimDefault}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
