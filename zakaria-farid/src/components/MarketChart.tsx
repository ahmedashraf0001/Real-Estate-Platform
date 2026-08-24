'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { 
  MarketDistrictConfig, 
  getStoredPlatformSettings, 
  DEFAULT_MARKET_DISTRICTS 
} from '@/lib/services/marketIntelligence';

interface MarketChartProps {
  locale?: string;
}

export const MarketChart: React.FC<MarketChartProps> = ({ locale = 'en' }) => {
  const isAr = locale === 'ar';
  const [districts, setDistricts] = useState<MarketDistrictConfig[]>(
    DEFAULT_MARKET_DISTRICTS.filter(d => d.isEnabled)
  );
  const [selectedDistrict, setSelectedDistrict] = useState<MarketDistrictConfig | null>(
    districts[0] || null
  );
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const loadSettings = () => {
    const settings = getStoredPlatformSettings();
    setIsVisible(settings.showMarketRadar !== false);
    const active = (settings.marketDistricts || []).filter(d => d.isEnabled);
    setDistricts(active);
    if (active.length > 0) {
      setSelectedDistrict(prev => (prev && active.find(d => d.id === prev.id)) ? prev : active[0]);
    } else {
      setSelectedDistrict(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadSettings();

    const handleUpdate = () => loadSettings();
    window.addEventListener('zf_platform_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('zf_platform_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  if (!isVisible || districts.length === 0) {
    return null;
  }

  const maxPrice = Math.max(...districts.map(d => d.pricePerSqm), 70000);

  const renderMiniSparkline = (points: number[]) => {
    const pts = points && points.length > 1 ? points : [30, 40, 50, 60];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const width = 80;
    const height = 22;
    const padding = 2;
    
    const coords = pts.map((val, idx) => {
      const x = padding + (idx / (pts.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y };
    });

    const pathD = coords.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = coords[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');

    const last = coords[coords.length - 1];
    const areaD = `${pathD} L ${last.x} ${height} L ${coords[0].x} ${height} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="mini-sparkline" aria-hidden="true">
        <defs>
          <linearGradient id="miniSparkGrad" x1="0%" y1="0%" x2="0%" y2="1">
            <stop offset="0%" stopColor="#E5B869" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#E5B869" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#miniSparkGrad)" />
        <path d={pathD} fill="none" stroke="#E5B869" strokeWidth="2" strokeLinecap="round" />
        <circle cx={last.x} cy={last.y} r="2.5" fill="#E5B869" />
      </svg>
    );
  };

  return (
    <div className="market-chart-widget" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Header with Eyebrow + Live indicator top row, Title full row */}
      <div className="chart-header">
        <div className="header-top-row">
          <div className="header-eyebrow-wrap">
            <div className="chart-icon-box">
              <Activity size={13} />
            </div>
            <span className="chart-eyebrow">{isAr ? 'البيانات الكلية للسوق' : 'MACRO INTELLIGENCE'}</span>
          </div>

          <div className="chart-live-badge">
            <span className="chart-live-dot" />
            <span>{isAr ? 'مباشر' : 'Live Valuation'}</span>
          </div>
        </div>

        <h3 className="chart-title">{isAr ? 'مؤشر أسعار المتر' : 'Valuation Radar'}</h3>
      </div>

      {/* 2. Direct EGP / m² Header Badge (Removed unnecessary YoY & Yield tabs) */}
      <div className="valuation-focus-bar">
        <span className="valuation-unit-tag">
          <Sparkles size={11} className="gold-sparkle" />
          <span>{isAr ? 'سعر المتر المربع (EGP / m²)' : 'ESTIMATED PRICE / SQM (EGP / m²)'}</span>
        </span>
      </div>

      {/* 3. District Leaderboard */}
      <div className="chart-rows-list">
        {districts.map((item, idx) => {
          const isSelected = selectedDistrict?.id === item.id;
          const percentage = (item.pricePerSqm / maxPrice) * 100;
          const displayVal = `${(item.pricePerSqm / 1000).toFixed(0)}k EGP`;
          const rankNum = String(idx + 1).padStart(2, '0');

          return (
            <div 
              key={item.id} 
              className={`compact-chart-row ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDistrict(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedDistrict(item)}
            >
              <div className="row-main">
                <div className="row-meta">
                  <span className="row-rank-num">{rankNum}</span>
                  <span className="row-name">{isAr ? item.districtAr : item.district}</span>
                </div>

                <div className="row-stat-wrap">
                  <span className="row-stat-value">{displayVal}</span>
                </div>
              </div>

              {/* Radiant Micro Gauge */}
              <div className="row-gauge-track">
                <motion.div 
                  className={`row-gauge-fill ${isSelected ? 'active-glow' : ''}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ type: 'spring', damping: 22, stiffness: 140 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Sleek Executive Snapshot Pill */}
      <AnimatePresence mode="wait">
        {selectedDistrict && (
          <motion.div
            key={selectedDistrict.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="executive-snapshot-card"
          >
            <div className="snapshot-top-row">
              <div className="snapshot-title-group">
                <span className="snapshot-category">
                  {isAr ? selectedDistrict.categoryAr : selectedDistrict.category}
                </span>
                <h4 className="snapshot-district-name">
                  {isAr ? selectedDistrict.districtAr : selectedDistrict.district}
                </h4>
              </div>
              <div className="snapshot-sparkline-wrap">
                {renderMiniSparkline(selectedDistrict.historical5Yr)}
                <span className="sparkline-growth-tag">{selectedDistrict.fiveYearGain}</span>
              </div>
            </div>

            <div className="snapshot-grid-two">
              <div className="snapshot-metric-cell">
                <span className="cell-label">{isAr ? 'متوسط قيمة الوحدة' : 'MEDIAN VALUE'}</span>
                <span className="cell-value">{isAr ? selectedDistrict.medianTotalAr : selectedDistrict.medianTotal}</span>
              </div>
              <div className="snapshot-metric-cell">
                <span className="cell-label">{isAr ? 'متوسط المتر المربع' : 'AVG PRICE / SQM'}</span>
                <span className="cell-value">
                  {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US').format(selectedDistrict.pricePerSqm)} EGP
                </span>
              </div>
            </div>

            <div className="snapshot-footer-note">
              <ShieldCheck size={13} className="note-shield-icon" />
              <p className="note-text">
                {isAr ? selectedDistrict.insightAr : selectedDistrict.insight}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .market-chart-widget {
          position: relative;
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          border-radius: 22px;
          padding: 1.6rem 1.45rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .market-chart-widget {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(255, 255, 255, 0.04) 20%,
            rgba(18, 24, 38, 0.60) 50%,
            rgba(10, 14, 24, 0.88) 100%
          );
          border: 1px solid rgba(229, 184, 105, 0.25);
          box-shadow: 
            0 24px 54px rgba(0, 0, 0, 0.55),
            0 4px 18px rgba(0, 0, 0, 0.28),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.10),
            inset 0 0 24px rgba(229, 184, 105, 0.04);
        }

        [data-theme="light"] .market-chart-widget {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.92) 0%,
            rgba(250, 248, 243, 0.82) 100%
          );
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(184, 147, 74, 0.32);
          box-shadow: 
            0 18px 44px rgba(30, 24, 16, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(184, 147, 74, 0.15);
        }

        .chart-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .header-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .header-eyebrow-wrap {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .chart-icon-box {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: rgba(229, 184, 105, 0.15);
          border: 1px solid rgba(229, 184, 105, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #E5B869;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        [data-theme="light"] .chart-icon-box {
          background: rgba(184, 147, 74, 0.12);
          border-color: rgba(184, 147, 74, 0.3);
          color: #8C6826;
        }

        .chart-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #E5B869;
          text-transform: uppercase;
          white-space: nowrap;
        }

        [data-theme="light"] .chart-eyebrow {
          color: #8C6826;
        }

        .chart-title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        [data-theme="light"] .chart-title {
          color: #141210;
        }

        .chart-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0.2rem 0.55rem;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34D399;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .chart-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 10px #10B981;
        }

        .valuation-focus-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.85rem;
          border-radius: 12px;
          background: rgba(229, 184, 105, 0.08);
          border: 1px solid rgba(229, 184, 105, 0.25);
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
        }

        [data-theme="light"] .valuation-focus-bar {
          background: rgba(184, 147, 74, 0.08);
          border-color: rgba(184, 147, 74, 0.22);
        }

        .valuation-unit-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #E5B869;
          text-transform: uppercase;
        }

        [data-theme="light"] .valuation-unit-tag {
          color: #8C6826;
        }

        .gold-sparkle {
          color: #E5B869;
        }

        [data-theme="light"] .gold-sparkle {
          color: #8C6826;
        }

        .chart-rows-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .compact-chart-row {
          padding: 0.65rem 0.85rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.10);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 7px;
          backdrop-filter: blur(12px);
          box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.15);
        }

        [data-theme="light"] .compact-chart-row {
          background: rgba(255, 255, 255, 0.7);
          border-color: rgba(184, 147, 74, 0.16);
          box-shadow: 0 2px 8px rgba(30, 24, 16, 0.03), inset 0 1px 1px #FFFFFF;
        }

        .compact-chart-row:hover {
          background: rgba(229, 184, 105, 0.09);
          border-color: rgba(229, 184, 105, 0.35);
          transform: translateY(-1px);
        }

        [data-theme="light"] .compact-chart-row:hover {
          background: rgba(184, 147, 74, 0.10);
          border-color: rgba(184, 147, 74, 0.35);
        }

        .compact-chart-row.selected {
          background: linear-gradient(135deg, rgba(229, 184, 105, 0.18) 0%, rgba(229, 184, 105, 0.06) 100%);
          border-color: #E5B869;
          box-shadow: 0 4px 20px rgba(229, 184, 105, 0.22), inset 0 1px 1.5px rgba(255, 255, 255, 0.4);
        }

        [data-theme="light"] .compact-chart-row.selected {
          background: linear-gradient(135deg, rgba(184, 147, 74, 0.15) 0%, rgba(184, 147, 74, 0.05) 100%);
          border-color: #8C6826;
          box-shadow: 0 4px 18px rgba(140, 104, 38, 0.15), inset 0 1px 1.5px #FFFFFF;
        }

        .row-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .row-meta {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .row-rank-num {
          font-family: Georgia, serif;
          font-size: 0.75rem;
          font-weight: 800;
          color: #E5B869;
          opacity: 0.9;
        }

        [data-theme="light"] .row-rank-num {
          color: #8C6826;
        }

        .row-name {
          font-size: 0.84375rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        [data-theme="light"] .row-name {
          color: #141210;
        }

        .row-stat-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .row-stat-value {
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 800;
          color: #E5B869;
        }

        [data-theme="light"] .row-stat-value {
          color: #8C6826;
        }

        .row-gauge-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.10);
          border-radius: 9999px;
          overflow: hidden;
        }

        [data-theme="light"] .row-gauge-track {
          background: rgba(0, 0, 0, 0.08);
        }

        .row-gauge-fill {
          height: 100%;
          border-radius: 9999px;
          background: linear-gradient(90deg, #B8934A 0%, #E5B869 100%);
        }

        .row-gauge-fill.active-glow {
          background: linear-gradient(90deg, #B8934A 0%, #E5B869 60%, #FFFDF5 100%);
          box-shadow: 0 0 10px rgba(229, 184, 105, 0.8);
        }

        .executive-snapshot-card {
          border-radius: 16px;
          padding: 1.15rem;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.10) 0%,
            rgba(18, 24, 38, 0.55) 50%,
            rgba(10, 14, 24, 0.78) 100%
          );
          border: 1px solid rgba(229, 184, 105, 0.28);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 
            0 10px 28px rgba(0, 0, 0, 0.4),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.35);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        [data-theme="light"] .executive-snapshot-card {
          background: #FFFFFF;
          border: 1px solid rgba(184, 147, 74, 0.28);
          box-shadow: 0 8px 24px rgba(30, 24, 16, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .snapshot-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .snapshot-category {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #E5B869;
          text-transform: uppercase;
          display: block;
        }

        [data-theme="light"] .snapshot-category {
          color: #8C6826;
        }

        .snapshot-district-name {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 3px 0 0 0;
        }

        [data-theme="light"] .snapshot-district-name {
          color: #141210;
        }

        .snapshot-sparkline-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .mini-sparkline {
          width: 75px;
          height: 20px;
        }

        .sparkline-growth-tag {
          font-size: 0.6875rem;
          font-weight: 800;
          color: #10B981;
        }

        .snapshot-grid-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding-top: 0.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .snapshot-grid-two {
          border-top-color: rgba(184, 147, 74, 0.18);
        }

        .snapshot-metric-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cell-label {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.65);
          text-transform: uppercase;
        }

        [data-theme="light"] .cell-label {
          color: #64748B;
        }

        .cell-value {
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 800;
          color: #E5B869;
        }

        [data-theme="light"] .cell-value {
          color: #8C6826;
        }

        .snapshot-footer-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding-top: 0.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .snapshot-footer-note {
          border-top-color: rgba(184, 147, 74, 0.15);
        }

        .note-shield-icon {
          color: #E5B869;
          flex-shrink: 0;
          margin-top: 2px;
        }

        [data-theme="light"] .note-shield-icon {
          color: #8C6826;
        }

        .note-text {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.45;
          margin: 0;
        }

        [data-theme="light"] .note-text {
          color: #475569;
        }
      `}</style>
    </div>
  );
};

export default MarketChart;
