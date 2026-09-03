'use client';

import React from 'react';
import { Scale } from 'lucide-react';

interface LegalVerificationTagProps {
  label?: string;
  isAr?: boolean;
}

export const LegalVerificationTag: React.FC<LegalVerificationTagProps> = ({
  label,
  isAr = false
}) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'rgba(255, 138, 61, 0.12)',
        color: 'var(--zf-flag-legal, #ff8a3d)',
        border: '1px solid rgba(255, 138, 61, 0.35)',
        borderRadius: '4px',
        padding: '0.15rem 0.45rem',
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        verticalAlign: 'middle'
      }}
      title="This value is sourced from [NEEDS LEGAL VERIFICATION] and requires Egyptian counsel confirmation."
    >
      <Scale size={11} strokeWidth={2.5} />
      <span>{label || (isAr ? 'يتطلب تدقيقاً قانونياً' : 'Needs Legal Verification')}</span>
    </span>
  );
};
