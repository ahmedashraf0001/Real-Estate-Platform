import { Sparkles } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div style={{
      minHeight: '65vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        background: '#FFFFFF',
        padding: '36px 48px',
        borderRadius: '20px',
        border: '1px solid rgba(201, 169, 106, 0.3)',
        boxShadow: '0 12px 32px rgba(30, 77, 61, 0.08)'
      }}>
        <div style={{ position: 'relative', width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#C9A96A',
            borderRightColor: '#1E4D3D',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#1E4D3D',
            color: '#C9A96A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Playfair Display', serif",
            fontWeight: 800,
            fontSize: '15px'
          }}>
            ZF
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E4D3D', letterSpacing: '0.04em' }}>
            Preparing Dashboard…
          </span>
          <span style={{ fontSize: '11px', color: '#C9A96A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} />
            Zakaria Farid Real Estate
          </span>
        </div>
      </div>
    </div>
  );
}
