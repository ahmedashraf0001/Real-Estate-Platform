'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface MarketDataPoint {
  id: string;
  rank: string;
  district: string;
  subDistrict: string;
  category: string;
  pricePerSqm: number;
  growth: number;
  roi: number;
  medianTotal: string;
  fiveYearGain: string;
  historical5Yr: number[];
  insight: string;
}

const MARKET_DATA: MarketDataPoint[] = [
  {
    id: 'north-coast',
    rank: '01',
    district: 'North Coast',
    subDistrict: 'Ras El Hekma & Sidi Heneish',
    category: 'Ultra-Prime Coastal',
    pricePerSqm: 65000,
    growth: 18.4,
    roi: 14.2,
    medianTotal: '55.0M EGP',
    fiveYearGain: '+103.5%',
    historical5Yr: [32, 38, 45, 54, 65],
    insight: 'Driven by Ras El Hekma sovereign master developments.'
  },
  {
    id: 'el-gouna',
    rank: '02',
    district: 'El Gouna',
    subDistrict: 'Red Sea Riviera Lagoon Estates',
    category: 'Resort Estates',
    pricePerSqm: 58000,
    growth: 16.2,
    roi: 12.8,
    medianTotal: '36.5M EGP',
    fiveYearGain: '+88.2%',
    historical5Yr: [28, 34, 41, 49, 58],
    insight: 'High euro-denominated yield with steady European demand.'
  },
  {
    id: 'new-cairo',
    rank: '03',
    district: 'New Cairo',
    subDistrict: 'Golden Square & Diplomatic Gate',
    category: 'Sovereign Metro',
    pricePerSqm: 42000,
    growth: 14.8,
    roi: 11.5,
    medianTotal: '42.5M EGP',
    fiveYearGain: '+74.0%',
    historical5Yr: [22, 26, 31, 36, 42],
    insight: 'Supported by diplomatic delegations and corporate HQs.'
  },
  {
    id: 'sheikh-zayed',
    rank: '04',
    district: 'Sheikh Zayed',
    subDistrict: 'West Cairo Belt & New Zayed',
    category: 'Prime Suburban',
    pricePerSqm: 38500,
    growth: 12.6,
    roi: 10.4,
    medianTotal: '29.0M EGP',
    fiveYearGain: '+62.5%',
    historical5Yr: [20, 24, 28, 33, 38.5],
    insight: 'High family estate demand near elite school clusters.'
  },
  {
    id: 'ain-sokhna',
    rank: '05',
    district: 'Ain Sokhna',
    subDistrict: 'Galala Plateau & Marina',
    category: 'Seaside Retreat',
    pricePerSqm: 34000,
    growth: 11.2,
    roi: 9.8,
    medianTotal: '28.0M EGP',
    fiveYearGain: '+54.8%',
    historical5Yr: [18, 21, 25, 29, 34],
    insight: 'Direct expressway connectivity driving weekend liquidity.'
  }
];

type MetricType = 'price' | 'growth' | 'roi';

export const MarketChart: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState<MarketDataPoint>(MARKET_DATA[0]);
  const [metric, setMetric] = useState<MetricType>('price');

  const maxPrice = 70000;
  const maxGrowth = 20;
  const maxRoi = 16;

  const displayData = MARKET_DATA.slice(0, 4);

  const renderMiniSparkline = (points: number[]) => {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 80;
    const height = 22;
    const padding = 2;
    
    const coords = points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1)) * (width - padding * 2);
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
          <linearGradient id="miniSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FCD34D" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#miniSparkGrad)" />
        <path d={pathD} fill="none" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
        <circle cx={last.x} cy={last.y} r="2.5" fill="#FCD34D" />
      </svg>
    );
  };

  return (
    <div className="market-chart-widget">
      {/* 1. Header with Compact Live Indicator */}
      <div className="chart-header">
        <div className="header-left">
          <div className="chart-icon-box">
            <Activity size={14} />
          </div>
          <div>
            <span className="chart-eyebrow">MACRO INTELLIGENCE</span>
            <h3 className="chart-title">Valuation Radar</h3>
          </div>
        </div>

        <div className="chart-live-badge">
          <span className="chart-live-dot" />
          <span>Live Q3</span>
        </div>
      </div>

      {/* 2. Sleek Metric Switcher */}
      <div className="metric-toggle-strip" role="tablist" aria-label="Valuation Metrics">
        {[
          { id: 'price', label: 'EGP / m²' },
          { id: 'growth', label: 'YoY %' },
          { id: 'roi', label: 'Yield %' }
        ].map((tab) => {
          const isActive = metric === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`metric-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => setMetric(tab.id as MetricType)}
              type="button"
            >
              {isActive && (
                <motion.div
                  layoutId="activeMetricPill"
                  className="metric-pill-indicator"
                  transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                />
              )}
              <span className="metric-pill-text">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Compact District Leaderboard */}
      <div className="chart-rows-list">
        {displayData.map((item) => {
          const isSelected = selectedDistrict.id === item.id;
          
          let percentage = 0;
          let displayVal = '';
          
          if (metric === 'price') {
            percentage = (item.pricePerSqm / maxPrice) * 100;
            displayVal = `${(item.pricePerSqm / 1000).toFixed(0)}k EGP`;
          } else if (metric === 'growth') {
            percentage = (item.growth / maxGrowth) * 100;
            displayVal = `+${item.growth}%`;
          } else {
            percentage = (item.roi / maxRoi) * 100;
            displayVal = `${item.roi}%`;
          }

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
                  <span className="row-rank-num">{item.rank}</span>
                  <span className="row-name">{item.district}</span>
                </div>

                <div className="row-stat-wrap">
                  {metric === 'growth' && <ArrowUpRight size={12} className="trend-arrow" />}
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

      {/* 4. Sleek Executive Snapshot Pill (Compact, Never Overflows) */}
      <AnimatePresence mode="wait">
        <motion.div 
          className="selected-snapshot-card"
          key={selectedDistrict.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <div className="snapshot-top">
            <div className="snapshot-identity">
              <span className="snapshot-category">{selectedDistrict.category}</span>
              <span className="snapshot-name">{selectedDistrict.district}</span>
            </div>

            <div className="snapshot-sparkline-box">
              {renderMiniSparkline(selectedDistrict.historical5Yr)}
              <span className="snapshot-spark-label">5Y: {selectedDistrict.fiveYearGain}</span>
            </div>
          </div>

          <div className="snapshot-grid">
            <div className="snapshot-stat-cell">
              <span className="cell-lbl">MEDIAN VALUE</span>
              <span className="cell-val">{selectedDistrict.medianTotal}</span>
            </div>
            <div className="snapshot-stat-cell">
              <span className="cell-lbl">EST. NET YIELD</span>
              <span className="cell-val gold">{selectedDistrict.roi}% / yr</span>
            </div>
          </div>

          <p className="snapshot-brief">
            <ShieldCheck size={13} className="brief-icon" />
            <span>{selectedDistrict.insight}</span>
          </p>
        </motion.div>
      </AnimatePresence>

      <style>{`
        .market-chart-widget {
          width: 100%;
          box-sizing: border-box;
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border-radius: 20px;
          padding: 1.25rem 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
          overflow: hidden;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .market-chart-widget {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.06) 25%,
            rgba(18, 24, 38, 0.42) 60%,
            rgba(10, 14, 24, 0.65) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.38),
            0 4px 14px rgba(0, 0, 0, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .market-chart-widget {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.30) 35%,
            rgba(255, 255, 255, 0.48) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow: 
            0 18px 44px rgba(15, 23, 42, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(255, 255, 255, 0.25);
        }

        /* 1. Header */
        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .chart-icon-box {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: rgba(221, 167, 82, 0.16);
          border: 1px solid rgba(221, 167, 82, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FCD34D;
          flex-shrink: 0;
        }

        [data-theme="light"] .chart-icon-box {
          color: #B8860B;
          background: rgba(184, 134, 11, 0.12);
        }

        .chart-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #FCD34D;
          text-transform: uppercase;
          display: block;
          line-height: 1;
          margin-bottom: 2px;
        }

        [data-theme="light"] .chart-eyebrow {
          color: #B8860B;
        }

        .chart-title {
          font-family: var(--font-heading);
          font-size: 0.9375rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chart-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0.2rem 0.55rem;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 700;
          color: #10B981;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .chart-live-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
          animation: livePulse 2s infinite ease-in-out;
        }

        @keyframes livePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
        }

        /* 2. Metric Segmented Toggle */
        .metric-toggle-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 3px;
          border-radius: 10px;
          gap: 3px;
          position: relative;
        }

        [data-theme="dark"] .metric-toggle-strip {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        [data-theme="light"] .metric-toggle-strip {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .metric-pill-btn {
          position: relative;
          padding: 0.35rem 0.25rem;
          border: none;
          background: transparent;
          border-radius: 7px;
          font-family: inherit;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .metric-pill-btn.active {
          color: #0A0C10;
          font-weight: 800;
        }

        [data-theme="dark"] .metric-pill-btn.active {
          color: #0A0C10;
        }

        .metric-pill-btn:focus-visible,
        .compact-chart-row:focus-visible {
          outline: 2px solid var(--gold-primary) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 16px var(--gold-glow) !important;
        }

        .metric-pill-indicator {
          position: absolute;
          inset: 0;
          border-radius: 7px;
          background: linear-gradient(135deg, #FFF0C8 0%, #FCD34D 50%, #DDA752 100%);
          box-shadow: 0 2px 8px rgba(221, 167, 82, 0.3), inset 0 1px 1px #FFFFFF;
          z-index: -1;
        }

        /* 3. Compact Rows */
        .chart-rows-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .compact-chart-row {
          cursor: pointer;
          padding: 0.45rem 0.65rem;
          border-radius: 10px;
          border: 1px solid transparent;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        [data-theme="dark"] .compact-chart-row:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }

        [data-theme="dark"] .compact-chart-row.selected {
          background: rgba(252, 211, 77, 0.1);
          border-color: rgba(252, 211, 77, 0.35);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .compact-chart-row:hover {
          background: rgba(255, 255, 255, 0.5);
          border-color: rgba(184, 134, 11, 0.2);
        }

        [data-theme="light"] .compact-chart-row.selected {
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(184, 134, 11, 0.35);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05), inset 0 1px 1px #FFFFFF;
        }

        .row-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .row-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          overflow: hidden;
        }

        .row-rank-num {
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          width: 14px;
          flex-shrink: 0;
        }

        .compact-chart-row.selected .row-rank-num {
          color: #FCD34D;
        }

        [data-theme="light"] .compact-chart-row.selected .row-rank-num {
          color: #B8860B;
        }

        .row-name {
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .row-stat-wrap {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-family: var(--font-heading);
          font-size: 0.78rem;
          font-weight: 800;
          color: #FCD34D;
          flex-shrink: 0;
        }

        [data-theme="light"] .row-stat-wrap {
          color: #B8860B;
        }

        .trend-arrow {
          color: #10B981;
        }

        .row-gauge-track {
          width: 100%;
          height: 3px;
          border-radius: 9999px;
          overflow: hidden;
        }

        [data-theme="dark"] .row-gauge-track {
          background: rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .row-gauge-track {
          background: rgba(0, 0, 0, 0.06);
        }

        .row-gauge-fill {
          height: 100%;
          background: linear-gradient(90deg, #A27220, #DDA752);
          border-radius: 9999px;
        }

        .row-gauge-fill.active-glow {
          background: linear-gradient(90deg, #FCD34D 0%, #FFF4D4 100%);
          box-shadow: 0 0 8px rgba(252, 211, 77, 0.6);
        }

        /* 4. Compact Executive Snapshot */
        .selected-snapshot-card {
          border-radius: 14px;
          padding: 0.75rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          box-sizing: border-box;
          overflow: hidden;
        }

        [data-theme="dark"] .selected-snapshot-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.16) 0%,
            rgba(18, 24, 38, 0.75) 50%,
            rgba(10, 14, 24, 0.90) 100%
          );
          border: 1px solid rgba(252, 211, 77, 0.3);
          box-shadow: 
            0 12px 28px rgba(0, 0, 0, 0.35),
            inset 0 1.5px 1.5px rgba(255, 255, 255, 0.45);
        }

        [data-theme="light"] .selected-snapshot-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.90) 0%,
            rgba(255, 255, 255, 0.75) 100%
          );
          border: 1px solid rgba(184, 134, 11, 0.28);
          box-shadow: 
            0 8px 24px rgba(15, 23, 42, 0.06),
            inset 0 1.5px 1.5px #FFFFFF;
        }

        .snapshot-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .snapshot-identity {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .snapshot-category {
          font-family: var(--font-heading);
          font-size: 0.55rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #FCD34D;
          text-transform: uppercase;
        }

        [data-theme="light"] .snapshot-category {
          color: #B8860B;
        }

        .snapshot-name {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 0.84rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .snapshot-sparkline-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          flex-shrink: 0;
        }

        .mini-sparkline {
          width: 75px;
          height: 18px;
        }

        .snapshot-spark-label {
          font-size: 0.58rem;
          font-weight: 700;
          color: #FCD34D;
        }

        [data-theme="light"] .snapshot-spark-label {
          color: #B8860B;
        }

        .snapshot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.4rem;
        }

        .snapshot-stat-cell {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 0.35rem 0.45rem;
          border-radius: 8px;
        }

        [data-theme="dark"] .snapshot-stat-cell {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .snapshot-stat-cell {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .cell-lbl {
          font-size: 0.52rem;
          color: var(--text-secondary);
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .cell-val {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-primary);
          font-family: var(--font-heading);
          white-space: nowrap;
        }

        .cell-val.gold {
          color: #FCD34D;
        }

        [data-theme="light"] .cell-val.gold {
          color: #B8860B;
        }

        .snapshot-brief {
          display: flex;
          align-items: flex-start;
          gap: 5px;
          font-size: 0.68rem;
          color: var(--text-secondary);
          line-height: 1.35;
          margin: 0;
          padding-top: 0.4rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        [data-theme="light"] .snapshot-brief {
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .brief-icon {
          color: #FCD34D;
          flex-shrink: 0;
          margin-top: 1px;
        }

        [data-theme="light"] .brief-icon {
          color: #B8860B;
        }
      `}</style>
    </div>
  );
};


