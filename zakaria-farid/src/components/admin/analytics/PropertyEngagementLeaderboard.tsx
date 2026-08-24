'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  Zap, 
  Crown, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  ExternalLink, 
  Edit3, 
  Building2, 
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { PropertyEngagementMetric } from '@/lib/services/dashboardAnalytics';

interface PropertyEngagementLeaderboardProps {
  metrics: PropertyEngagementMetric[];
  adminLocale: string;
}

export default function PropertyEngagementLeaderboard({ metrics, adminLocale }: PropertyEngagementLeaderboardProps) {
  const isAr = adminLocale === 'ar';
  const [filterTier, setFilterTier] = useState<string>('all');

  const filteredMetrics = filterTier === 'all' 
    ? metrics 
    : metrics.filter(m => m.liquidityTier === filterTier);

  const getTierBadge = (tier: PropertyEngagementMetric['liquidityTier']) => {
    switch (tier) {
      case 'ultra_hot':
        return {
          label: isAr ? 'طلب استثنائي مرتفع' : 'Ultra-High Demand',
          icon: Flame,
          color: '#FB7185',
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.25)',
        };
      case 'active_interest':
        return {
          label: isAr ? 'تفاعل نشط ومستمر' : 'Active Market Interest',
          icon: Zap,
          color: '#34D399',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.25)',
        };
      case 'trophy_asset':
        return {
          label: isAr ? 'أصل سيادي نادر' : 'Trophy Sovereign Asset',
          icon: Crown,
          color: '#E5B869',
          bg: 'rgba(229, 184, 105, 0.12)',
          border: 'rgba(229, 184, 105, 0.25)',
        };
      case 'under_engaged':
        return {
          label: isAr ? 'تفاعل منخفض (مراجعة التسعير)' : 'Low Engagement (Review Price)',
          icon: AlertCircle,
          color: '#FBBF24',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.25)',
        };
    }
  };

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <div className="leaderboard-title-group">
          <div className="leaderboard-icon-box">
            <TrendingUp size={18} className="gold-icon" />
          </div>
          <div>
            <h2 className="leaderboard-title">
              {isAr ? 'لوحة تفاعل واهتمام المشترين بالعقارات' : 'Property Engagement & Buyer Demand Index'}
            </h2>
            <p className="leaderboard-sub">
              {isAr 
                ? 'ترتيب العقارات حسب معدل الاستفسارات وتفضيلات المشترين وسرعة إتمام الصفقات'
                : 'Ranked by live buyer inquiry velocity, shortlisting frequency, and deal progression score.'}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="tier-filter-pills">
          {[
            { id: 'all', labelEn: 'All Estates', labelAr: 'جميع العقارات' },
            { id: 'ultra_hot', labelEn: 'Ultra-Hot', labelAr: 'الأعلى طلباً' },
            { id: 'trophy_asset', labelEn: 'Trophy Assets', labelAr: 'أصول سيادية' },
            { id: 'under_engaged', labelEn: 'Needs Attention', labelAr: 'تتطلب اهتمام' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              className={`tier-pill-btn ${filterTier === pill.id ? 'active' : ''}`}
              onClick={() => setFilterTier(pill.id)}
            >
              {isAr ? pill.labelAr : pill.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table / Cards List */}
      <div className="leaderboard-table-wrap">
        {filteredMetrics.length === 0 ? (
          <div className="leaderboard-empty">
            <p>{isAr ? 'لا توجد عقارات مطابقة لهذا التصنيف حالياً' : 'No properties matching this filter tier.'}</p>
          </div>
        ) : (
          <div className="leaderboard-rows">
            {filteredMetrics.map((item, idx) => {
              const tierBadge = getTierBadge(item.liquidityTier);
              const TierIcon = tierBadge.icon;
              const title = isAr ? item.titleAr : item.titleEn;

              return (
                <div key={item.propertyId} className="leaderboard-row">
                  {/* Rank Number */}
                  <div className="rank-col">
                    <span className="rank-num">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                  </div>

                  {/* Property Visual & Title */}
                  <div className="prop-info-col">
                    <div className="prop-thumb-wrap">
                      <img src={item.thumbnail} alt={title} className="prop-thumb-img" />
                    </div>
                    <div className="prop-meta-texts">
                      <div className="prop-title-row">
                        <h4 className="prop-title-text" title={title}>{title}</h4>
                        <span 
                          className="tier-badge-pill"
                          style={{
                            color: tierBadge.color,
                            background: tierBadge.bg,
                            borderColor: tierBadge.border,
                          }}
                        >
                          <TierIcon size={12} strokeWidth={2.5} />
                          <span>{tierBadge.label}</span>
                        </span>
                      </div>
                      <span className="prop-location-sub">{item.location}</span>
                    </div>
                  </div>

                  {/* Demand Score Meter */}
                  <div className="score-col">
                    <div className="score-meta-row">
                      <span className="score-label">{isAr ? 'مؤشر الطلب' : 'Demand Score'}</span>
                      <span className="score-val" style={{ color: tierBadge.color }}>
                        {item.demandScore}/100
                      </span>
                    </div>
                    <div className="score-track">
                      <div 
                        className="score-fill" 
                        style={{ 
                          width: `${item.demandScore}%`,
                          background: tierBadge.color,
                        }} 
                      />
                    </div>
                  </div>

                  {/* Inquiry & Lead Metrics */}
                  <div className="leads-col">
                    <div className="inquiry-stat-chip">
                      <Users size={13} className="chip-icon" />
                      <span>{item.inquiryCount} {isAr ? 'طلبات عملاء' : 'Inquiries'}</span>
                    </div>
                    {item.activeNegotiations > 0 && (
                      <span className="active-neg-pill">
                        {item.activeNegotiations} {isAr ? 'مفاوضات نشطة' : 'Negotiating'}
                      </span>
                    )}
                  </div>

                  {/* Price & Value */}
                  <div className="price-col">
                    <span className="price-label">{isAr ? 'السعر المعروض' : 'Listing Value'}</span>
                    <span className="price-val">
                      {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { notation: 'compact' }).format(item.priceEgp)} EGP
                    </span>
                  </div>

                  {/* Quick Action Links */}
                  <div className="actions-col">
                    <Link
                      href={`/admin/${adminLocale}/properties/${item.propertyId}/edit`}
                      className="row-action-btn"
                      title={isAr ? 'تعديل بيانات العقار' : 'Edit Property'}
                    >
                      <Edit3 size={14} />
                    </Link>
                    <Link
                      href={`/${adminLocale}/properties/${item.slug || item.propertyId}`}
                      target="_blank"
                      className="row-action-btn"
                      title={isAr ? 'معاينة في الموقع' : 'View on Public Site'}
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .leaderboard-card {
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
        }

        .leaderboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .leaderboard-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .leaderboard-icon-box {
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

        .leaderboard-title {
          font-size: 15px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .leaderboard-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          margin: 2px 0 0 0;
        }

        .tier-filter-pills {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .tier-pill-btn {
          padding: 5px 11px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.65);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .tier-pill-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
        }

        .tier-pill-btn.active {
          background: linear-gradient(135deg, #E5B869 0%, #C5A059 100%);
          color: #0A0C10;
          border-color: transparent;
          box-shadow: 0 2px 10px rgba(229, 184, 105, 0.25);
        }

        .leaderboard-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .leaderboard-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leaderboard-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        }

        .leaderboard-row:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(229, 184, 105, 0.25);
          transform: translateY(-1px);
        }

        .rank-col {
          flex-shrink: 0;
          width: 24px;
        }

        .rank-num {
          font-size: 13px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.35);
          font-variant-numeric: tabular-nums;
        }

        .prop-info-col {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 2;
          min-width: 220px;
        }

        .prop-thumb-wrap {
          width: 46px;
          height: 46px;
          border-radius: 8px;
          overflow: hidden;
          background: #000;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .prop-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .prop-meta-texts {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .prop-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .prop-title-text {
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .tier-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 5px;
          border: 1px solid;
          white-space: nowrap;
        }

        .prop-location-sub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .score-col {
          flex: 1.2;
          min-width: 120px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .score-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .score-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .score-val {
          font-size: 11.5px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .score-track {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 9999px;
          overflow: hidden;
        }

        .score-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.4s ease;
        }

        .leads-col {
          flex: 1;
          min-width: 110px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
        }

        .inquiry-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #E5B869;
          background: rgba(229, 184, 105, 0.08);
          border: 1px solid rgba(229, 184, 105, 0.2);
          padding: 3px 7px;
          border-radius: 5px;
        }

        .active-neg-pill {
          font-size: 10px;
          font-weight: 700;
          color: #34D399;
        }

        .price-col {
          flex: 1;
          min-width: 100px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .price-label {
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
          font-weight: 600;
        }

        .price-val {
          font-size: 13px;
          font-weight: 800;
          color: #E5B869;
        }

        .actions-col {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .row-action-btn {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 150ms ease;
        }

        .row-action-btn:hover {
          background: linear-gradient(135deg, #E5B869 0%, #C5A059 100%);
          color: #0A0C10;
          border-color: transparent;
        }

        .leaderboard-empty {
          padding: 28px;
          text-align: center;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12.5px;
        }

        @media (max-width: 900px) {
          .leaderboard-row {
            flex-wrap: wrap;
          }
          .prop-info-col {
            flex: 1 1 100%;
          }
          .score-col, .leads-col, .price-col {
            flex: 1 1 40%;
          }
        }
      `}</style>
    </div>
  );
}
