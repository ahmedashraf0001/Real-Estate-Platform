'use client';

import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DistrictDemandMetric } from '@/lib/services/dashboardAnalytics';

interface DistrictDemandMatrixProps {
  metrics: DistrictDemandMetric[];
  adminLocale: string;
}

export default function DistrictDemandMatrix({ metrics, adminLocale }: DistrictDemandMatrixProps) {
  const isAr = adminLocale === 'ar';

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const readTheme = () => {
      const cur = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ||
        (localStorage.getItem('zf_theme') as 'dark' | 'light') || 'dark';
      setTheme(cur);
    };
    readTheme();
    const obs = new MutationObserver(readTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const isLight = theme === 'light';

  const getStatusBadge = (status: DistrictDemandMetric['marketStatus'], isLightMode: boolean) => {
    if (isLightMode) {
      switch (status) {
        case 'undersupplied':
          return {
            label: isAr ? 'طلب يفوق المعروض (فرصة استحواذ)' : 'High Demand (Acquisition Gap)',
            color: '#047857',
            bg: 'rgba(4, 120, 87, 0.08)',
            border: 'rgba(4, 120, 87, 0.25)',
          };
        case 'oversupplied':
          return {
            label: isAr ? 'معروض وفير (تكثيف التسويق)' : 'High Supply (Boost Marketing)',
            color: '#B45309',
            bg: 'rgba(217, 119, 6, 0.08)',
            border: 'rgba(217, 119, 6, 0.25)',
          };
        case 'balanced':
        default:
          return {
            label: isAr ? 'سيولة متوازنة' : 'Balanced Liquidity',
            color: '#946F23',
            bg: 'rgba(148, 111, 35, 0.08)',
            border: 'rgba(148, 111, 35, 0.25)',
          };
      }
    }

    switch (status) {
      case 'undersupplied':
        return {
          label: isAr ? 'طلب يفوق المعروض (فرصة استحواذ)' : 'High Demand (Acquisition Gap)',
          color: '#34D399',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.25)',
        };
      case 'oversupplied':
        return {
          label: isAr ? 'معروض وفير (تكثيف التسويق)' : 'High Supply (Boost Marketing)',
          color: '#FBBF24',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.25)',
        };
      case 'balanced':
      default:
        return {
          label: isAr ? 'سيولة متوازنة' : 'Balanced Liquidity',
          color: '#E5B869',
          bg: 'rgba(229, 184, 105, 0.12)',
          border: 'rgba(229, 184, 105, 0.25)',
        };
    }
  };

  return (
    <div className={`matrix-card ${isLight ? 'is-light' : ''}`}>
      <div className="matrix-header">
        <div className="matrix-title-group">
          <div className="matrix-icon-box">
            <Compass size={18} className="gold-icon" />
          </div>
          <div>
            <h2 className="matrix-title">
              {isAr ? 'مصفوفة الطلب الجغرافي وتوزيع السيولة' : 'District Demand vs. Listed Supply Matrix'}
            </h2>
            <p className="matrix-sub">
              {isAr 
                ? 'مقارنة نسبة طلبات الشراء الواردة مقابل قيمة المعروض في المناطق والمحافظات الرئيسية'
                : 'Comparing incoming buyer inquiries against listed inventory value to spot acquisition gaps.'}
            </p>
          </div>
        </div>
      </div>

      <div className="matrix-grid">
        {metrics.map((dist) => {
          const badge = getStatusBadge(dist.marketStatus, isLight);
          const name = isAr ? dist.nameAr : dist.nameEn;

          return (
            <div key={dist.districtKey} className="district-card">
              <div className="district-top">
                <div className="district-name-wrap">
                  <MapPin size={13} className="dist-pin-icon" />
                  <h4 className="district-name">{name}</h4>
                </div>
                <span 
                  className="status-pill"
                  style={{
                    color: badge.color,
                    background: badge.bg,
                    borderColor: badge.border,
                  }}
                >
                  {badge.label}
                </span>
              </div>

              {/* Inquiry vs Supply Comparison Bars */}
              <div className="comparison-bars">
                {/* 1. Buyer Inquiries */}
                <div className="bar-row">
                  <div className="bar-label-group">
                    <span className="bar-tag">{isAr ? 'حصة طلبات المشترين' : 'Buyer Inquiries Share'}</span>
                    <strong className="bar-val" style={{ color: isLight ? '#0F172A' : '#E2E8F0' }}>
                      {dist.inquirySharePct}% ({dist.inquiryCount} {isAr ? 'طلبات' : 'Leads'})
                    </strong>
                  </div>
                  <div className="bar-track">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${Math.max(4, dist.inquirySharePct)}%`,
                        background: isLight 
                          ? 'linear-gradient(90deg, #64748B, #475569)' 
                          : 'linear-gradient(90deg, #64748B, #94A3B8)' 
                      }} 
                    />
                  </div>
                </div>

                {/* 2. Listed Supply Value */}
                <div className="bar-row">
                  <div className="bar-label-group">
                    <span className="bar-tag">{isAr ? 'حصة المعروض بالمحفظة' : 'Active Listed Value Share'}</span>
                    <strong className="bar-val" style={{ color: isLight ? '#946F23' : '#E5B869' }}>
                      {dist.supplySharePct}% ({new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { notation: 'compact' }).format(dist.listedSupplyValueEgp)} {isAr ? 'ج.م' : 'EGP'})
                    </strong>
                  </div>
                  <div className="bar-track">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${Math.max(4, dist.supplySharePct)}%`,
                        background: isLight 
                          ? 'linear-gradient(90deg, #C5A059, #946F23)' 
                          : 'linear-gradient(90deg, #C5A059, #E5B869)' 
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* District Footer Stats */}
              <div className="district-footer">
                <span className="footer-stat">
                  {dist.listedSupplyCount} {isAr ? 'عقارات معروضة' : 'Listed Units'}
                </span>
                <span className="footer-dot">•</span>
                <span className="footer-stat">
                  {dist.inquiryCount} {isAr ? 'مستثمر مهتم' : 'Interested Buyers'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .matrix-card {
          background: rgba(16, 20, 29, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          transition: background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
        }

        .matrix-card.is-light {
          background: #FFFFFF;
          border: 1.5px solid #D8D2C4;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
        }

        .matrix-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .matrix-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .matrix-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(229, 184, 105, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #E5B869;
          flex-shrink: 0;
          border: 1px solid rgba(229, 184, 105, 0.25);
        }

        .matrix-card.is-light .matrix-icon-box {
          background: rgba(148, 111, 35, 0.08);
          border-color: rgba(148, 111, 35, 0.25);
          color: #946F23;
        }

        .matrix-title {
          font-size: 15px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .matrix-card.is-light .matrix-title {
          color: #0F172A;
        }

        .matrix-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          margin: 2px 0 0 0;
        }

        .matrix-card.is-light .matrix-sub {
          color: #475569;
        }

        .matrix-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 12px;
        }

        .district-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 150ms ease;
        }

        .matrix-card.is-light .district-card {
          background: #F8FAFC;
          border: 1px solid #D8D2C4;
        }

        .district-card:hover {
          background: rgba(255, 255, 255, 0.035);
          border-color: rgba(229, 184, 105, 0.25);
        }

        .matrix-card.is-light .district-card:hover {
          background: #F1F5F9;
          border-color: #946F23;
        }

        .district-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .district-name-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dist-pin-icon {
          color: #E5B869;
          flex-shrink: 0;
        }

        .matrix-card.is-light .dist-pin-icon {
          color: #946F23;
        }

        .district-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        .matrix-card.is-light .district-name {
          color: #0F172A;
        }

        .status-pill {
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 5px;
          border: 1px solid;
          white-space: nowrap;
        }

        .comparison-bars {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bar-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bar-label-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
        }

        .bar-tag {
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }

        .matrix-card.is-light .bar-tag {
          color: #475569;
        }

        .bar-val {
          font-weight: 800;
          font-size: 11.5px;
        }

        .bar-track {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 9999px;
          overflow: hidden;
        }

        .matrix-card.is-light .bar-track {
          background: #E2E8F0;
        }

        .bar-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.4s ease;
        }

        .district-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          padding-top: 8px;
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
        }

        .matrix-card.is-light .district-footer {
          color: #64748B;
          border-top: 1px dashed #D8D2C4;
        }

        .footer-dot {
          color: rgba(255, 255, 255, 0.3);
        }

        .matrix-card.is-light .footer-dot {
          color: #94A3B8;
        }
      `}</style>
    </div>
  );
}
