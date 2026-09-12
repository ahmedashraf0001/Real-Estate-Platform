'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Sparkles, Check } from 'lucide-react';

export interface ZFERPLoadingWorkstationProps {
  isAr?: boolean;
  className?: string;
}

export const ZFERPLoadingWorkstation: React.FC<ZFERPLoadingWorkstationProps> = ({
  isAr = true,
  className = '',
}) => {
  const [progress, setProgress] = useState(18);
  const [currentStage, setCurrentStage] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const getTheme = (): 'light' | 'dark' => {
      if (typeof document === 'undefined') return 'light';
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark') return 'dark';
      if (attr === 'light') return 'light';
      const match = document.cookie.match(/(?:^|;\s*)zf_theme=([^;]*)/);
      if (match && match[1] === 'dark') return 'dark';
      return 'light';
    };

    setTheme(getTheme());

    const observer = new MutationObserver(() => {
      setTheme(getTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  // Financial Telemetry Stages
  const stages = [
    {
      ar: 'مزامنة شجرة ودليل الحسابات ودليل الشركاء والمساهمين...',
      en: 'Synchronizing Chart of Accounts & Partners Directory...',
      targetProgress: 38,
    },
    {
      ar: 'تدقيق قيود اليومية العامة والأستاذ العام ومطابقة الخزائن...',
      en: 'Auditing General Ledger Journals & Reconciling Vaults...',
      targetProgress: 62,
    },
    {
      ar: 'تحميل عقود التمليك وجداول الأقساط ومحفظة الشيكات الآجلة...',
      en: 'Loading Ownership Contracts, Installment Schedules & PDC Portfolio...',
      targetProgress: 82,
    },
    {
      ar: 'احتساب موقف السيولة اللحظي ومعاملات التكلفة الإنشائية RSV...',
      en: 'Calculating Real-Time Liquidity & RSV Construction Cost Factors...',
      targetProgress: 94,
    },
    {
      ar: 'جاهز لفتح قمرة القيادة والتحكم المالي التنفيذي...',
      en: 'Ready to launch Executive Cockpit & Financial Command...',
      targetProgress: 98,
    },
  ];

  // Financial Modules
  const modules = [
    { id: 'coa', ar: 'دليل الحسابات', en: 'Chart of Accounts' },
    { id: 'vaults', ar: 'الخزائن والأقساط', en: 'Vaults & Schedules' },
    { id: 'gl', ar: 'الأستاذ العام', en: 'General Ledger' },
    { id: 'contracts', ar: 'العقود والشركاء', en: 'Contracts & Partners' },
  ];

  useEffect(() => {
    // Realistic multi-stage financial telemetry progression
    const timers = [
      setTimeout(() => {
        setCurrentStage(1);
        setProgress(38);
      }, 450),
      setTimeout(() => {
        setCurrentStage(2);
        setProgress(64);
      }, 1050),
      setTimeout(() => {
        setCurrentStage(3);
        setProgress(84);
      }, 1750),
      setTimeout(() => {
        setCurrentStage(4);
        setProgress(96);
      }, 2550),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className={`zf-erp-loading-screen ${theme} ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        background: theme === 'dark'
          ? `
            radial-gradient(ellipse at 50% 36%, rgba(197, 160, 89, 0.12) 0%, rgba(4, 120, 87, 0.06) 42%, transparent 74%),
            radial-gradient(circle at 10% 12%, rgba(197, 160, 89, 0.06) 0%, transparent 45%),
            radial-gradient(circle at 90% 88%, rgba(4, 120, 87, 0.05) 0%, transparent 45%),
            #0B0F19
          `
          : `
            radial-gradient(ellipse at 50% 36%, rgba(197, 160, 89, 0.15) 0%, rgba(4, 120, 87, 0.05) 42%, transparent 74%),
            radial-gradient(circle at 10% 12%, rgba(197, 160, 89, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 90% 88%, rgba(4, 120, 87, 0.06) 0%, transparent 45%),
            #EAE6DC
          `,
      }}
    >
      <style>{`
        @keyframes zfCrownPulse {
          0%, 100% {
            box-shadow: 0 0 28px rgba(197, 160, 89, 0.32), 0 0 60px rgba(197, 160, 89, 0.14);
          }
          50% {
            box-shadow: 0 0 46px rgba(197, 160, 89, 0.52), 0 0 85px rgba(197, 160, 89, 0.24);
          }
        }

        @keyframes zfEmeraldPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(1.18);
          }
        }

        @keyframes zfCapsuleEntrance {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes zfShimmerGlow {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .zf-octagonal-crest {
          width: 68px;
          height: 68px;
          clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
          background: linear-gradient(135deg, #E5B869 0%, #C5A059 40%, #946F23 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: zfCrownPulse 3.2s ease-in-out infinite;
          position: relative;
          user-select: none;
        }

        .zf-octagonal-inner {
          width: 58px;
          height: 58px;
          clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
          background: linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #946F23;
          box-shadow: 0 4px 14px rgba(148, 111, 35, 0.15);
        }

        .zf-monogram-zf {
          font-family: 'Cinzel', 'Playfair Display', 'ThmanyahSans', serif;
          font-size: 22px;
          font-weight: 900;
          color: #946F23;
          letter-spacing: 0.04em;
          text-shadow: 0 1px 2px rgba(148, 111, 35, 0.2);
        }

        [data-theme="dark"] .zf-octagonal-inner,
        html[data-theme="dark"] .zf-octagonal-inner,
        .zf-erp-loading-screen.dark .zf-octagonal-inner {
          background: linear-gradient(145deg, #1E2538 0%, #0F172A 100%);
          border: 1px solid rgba(229, 184, 105, 0.4);
          box-shadow: none;
        }

        [data-theme="dark"] .zf-monogram-zf,
        html[data-theme="dark"] .zf-monogram-zf,
        .zf-erp-loading-screen.dark .zf-monogram-zf {
          color: #E5B869;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
        }

        .zf-capsule-glass {
          background: #FFFFFF;
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1.5px solid #D8D2C4;
          box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.1), 0 0 1px 1px rgba(197, 160, 89, 0.2);
        }

        [data-theme="dark"] .zf-capsule-glass,
        html[data-theme="dark"] .zf-capsule-glass,
        .zf-erp-loading-screen.dark .zf-capsule-glass {
          background: rgba(15, 20, 31, 0.94);
          border-color: rgba(229, 184, 105, 0.25);
          box-shadow: 0 28px 70px -12px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(197, 160, 89, 0.18);
        }
      `}</style>

      {/* ─── A. SUBTLE GHOST FRAMEWORK (Subconscious Cockpit Anchor) ─── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.32,
          filter: 'blur(0.5px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Ghost Header Bar */}
        <div
          style={{
            height: '52px',
            width: '100%',
            borderBottom: '1px solid rgba(197, 160, 89, 0.2)',
            background: 'rgba(255, 255, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(197, 160, 89, 0.25)' }} />
            <div style={{ width: '90px', height: '11px', borderRadius: '4px', background: 'rgba(197, 160, 89, 0.2)' }} />
          </div>
          <div style={{ width: '260px', height: '28px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.12)' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(197, 160, 89, 0.2)' }} />
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(197, 160, 89, 0.2)' }} />
          </div>
        </div>

        {/* Ghost Central Area */}
        <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 Ghost KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: '84px',
                  borderRadius: '12px',
                  border: '1px solid rgba(197, 160, 89, 0.14)',
                  background: 'rgba(255, 255, 255, 0.3)',
                }}
              />
            ))}
          </div>
          {/* Ghost Ledger Sheet Outline */}
          <div
            style={{
              flex: 1,
              borderRadius: '14px',
              border: '1px solid rgba(197, 160, 89, 0.14)',
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          />
        </div>

        {/* Ghost Bottom Dock Silhouette */}
        <div
          style={{
            height: '46px',
            width: '100%',
            borderTop: '1px solid rgba(197, 160, 89, 0.16)',
            background: 'rgba(255, 255, 255, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '64px',
                height: '24px',
                borderRadius: '6px',
                background: 'rgba(197, 160, 89, 0.15)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── B. EXECUTIVE CENTRAL FLOATING CAPSULE ─── */}
      <div
        className="zf-capsule-glass"
        style={{
          position: 'relative',
          zIndex: 10,
          width: 'min(92vw, 560px)',
          borderRadius: '24px',
          padding: '40px 36px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
          animation: 'zfCapsuleEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* 1. Royal Octagonal Andalusian Emblem */}
        <div className="zf-octagonal-crest" style={{ marginBottom: '20px' }}>
          <div className="zf-octagonal-inner">
            <span className="zf-monogram-zf">
              ZF
            </span>
          </div>
        </div>

        {/* 2. Institutional Title & FIN-OS Lockup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--zf2-text-primary, #0F172A)',
              letterSpacing: '-0.01em',
            }}
          >
            {isAr
              ? 'مؤسسة زكريا فريد للتطوير والاستثمار العقاري'
              : 'Zakaria Farid Real Estate Development & Investment'}
          </h1>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--zf2-gold, #946F23)',
              letterSpacing: isAr ? 'normal' : '0.04em',
            }}
          >
            <Sparkles size={13} style={{ color: '#C5A059' }} />
            <span>
              {isAr
                ? 'منظومة FIN-OS v2.4 • بيئة الإدارة المالية والسيادية'
                : 'FIN-OS v2.4 Platform • Sovereign Financial Workstation'}
            </span>
          </div>
        </div>

        {/* 3. Live Encrypted Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '9999px',
            background: 'rgba(4, 120, 87, 0.08)',
            border: '1px solid rgba(4, 120, 87, 0.25)',
            marginBottom: '26px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#059669',
              boxShadow: '0 0 8px #059669',
              display: 'inline-block',
              animation: 'zfEmeraldPulse 1.8s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#047857',
              letterSpacing: isAr ? 'normal' : '0.02em',
            }}
          >
            {isAr
              ? 'اتصال مشفر ومباشر بالسجلات المالية (RLS Active)'
              : 'Encrypted Live Connection to Financial Ledgers (RLS Active)'}
          </span>
          <Lock size={11} style={{ color: '#047857', opacity: 0.8 }} />
        </div>

        {/* 4. Financial Initialization Telemetry (Progress Bar & Dynamic Text) */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
          {/* Progress Bar Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '4px',
              borderRadius: '9999px',
              background: 'rgba(197, 160, 89, 0.18)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #C5A059 0%, #047857 50%, #C5A059 100%)',
                backgroundSize: '200% 100%',
                animation: 'zfShimmerGlow 2s linear infinite',
                transition: 'width 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>

          {/* Telemetry Stage Text & Percentage */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '12px',
              minHeight: '20px',
            }}
          >
            <span
              key={currentStage}
              style={{
                fontWeight: 600,
                color: 'var(--zf2-text-secondary, #334155)',
                transition: 'opacity 0.25s ease',
              }}
            >
              {isAr ? stages[currentStage].ar : stages[currentStage].en}
            </span>
            <span
              style={{
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--zf2-gold, #946F23)',
                flexShrink: 0,
              }}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* 5. Mini Readiness Module Capsules */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            width: '100%',
            marginBottom: '24px',
          }}
        >
          {modules.map((mod, idx) => {
            const isReady = currentStage >= idx;
            return (
              <div
                key={mod.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '9px',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                  background: isReady ? 'rgba(4, 120, 87, 0.08)' : 'rgba(148, 163, 184, 0.08)',
                  color: isReady ? '#047857' : 'var(--zf2-text-muted, #94A3B8)',
                  border: `1px solid ${isReady ? 'rgba(4, 120, 87, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`,
                  transition: 'all 0.35s ease',
                }}
              >
                {isReady ? (
                  <Check size={13} strokeWidth={2.8} style={{ color: '#059669', flexShrink: 0 }} />
                ) : (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'rgba(148, 163, 184, 0.6)',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isAr ? mod.ar : mod.en}
                </span>
              </div>
            );
          })}
        </div>

        {/* 6. Sovereign Audit Precision Signature */}
        <div
          style={{
            width: '100%',
            borderTop: '1px solid var(--zf2-border-subtle, #D8D2C4)',
            paddingTop: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--zf2-text-muted, #64748B)',
          }}
        >
          <ShieldCheck size={13} style={{ color: '#C5A059' }} />
          <span>
            {isAr
              ? 'دقة حسابية معتمدة بالقرش (0.00 Delta) • تشفير سيادي محمي'
              : 'Certified Piastre Precision (0.00 Delta) • Sovereign Encrypted'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ZFERPLoadingWorkstation;
