import React from 'react';
import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(221, 167, 82, 0.12) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        padding: '2.5rem 3rem',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{
          position: 'relative',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '2px solid rgba(221, 167, 82, 0.2)',
          borderTopColor: '#DDA752',
          animation: 'spin 1s linear infinite'
        }}>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '0.04em'
          }}>
            Zakaria Farid
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#DDA752',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            justifyContent: 'center'
          }}>
            <Sparkles size={12} />
            Architectural Portfolio
          </span>
        </div>
      </div>
    </div>
  );
}
