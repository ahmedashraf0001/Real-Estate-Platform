'use client';

import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function AdminLoading() {
  const pathname = usePathname() || '';
  const isAr = pathname.startsWith('/admin/ar') || pathname.includes('/ar') || (typeof document !== 'undefined' && (document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl'));

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        minHeight: '65vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @keyframes spin-gold { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        background: 'rgba(22, 23, 28, 0.95)',
        padding: '36px 48px',
        borderRadius: '20px',
        border: '1px solid rgba(221, 167, 82, 0.2)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ position: 'relative', width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#DDA752',
            borderRightColor: 'rgba(221,167,82,0.3)',
            animation: 'spin-gold 1s linear infinite',
          }} />
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #DDA752 0%, #C48D3A 100%)',
            color: '#0A0C10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 900,
            fontSize: '15px',
          }}>
            ZF
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', letterSpacing: isAr ? 'normal' : '0.04em' }}>
            {isAr ? 'جاري تحضير لوحة التحكم…' : 'Preparing Dashboard…'}
          </span>
          <span style={{ fontSize: '11px', color: '#DDA752', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} />
            {isAr ? 'زكريا فريد للاستشارات العقارية' : 'Zakaria Farid Real Estate'}
          </span>
        </div>
      </div>
    </div>
  );
}
