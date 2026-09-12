'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  Zap, 
  Crown, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Eye, 
  Edit3, 
  Building2, 
  Search,
  X,
  ArrowUpDown,
  Sparkles,
  Handshake,
  MapPin,
  Calendar
} from 'lucide-react';
import { PropertyEngagementMetric } from '@/lib/services/dashboardAnalytics';

interface PropertyEngagementLeaderboardProps {
  metrics: PropertyEngagementMetric[];
  adminLocale: string;
}

type SortOption = 'demand' | 'inquiries' | 'price' | 'negotiations';

export default function PropertyEngagementLeaderboard({ metrics, adminLocale }: PropertyEngagementLeaderboardProps) {
  const isAr = adminLocale === 'ar';

  // ─── Live Theme Observer (Dark / Light) ───
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

  // ─── Filter & Search & Sort State ───
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'demand' | 'inquiries' | 'price' | 'negotiations'>('demand');

  // ─── Portfolio Metrics & Summary Ribbon ───
  const totalCount = metrics.length;
  const totalInquiries = useMemo(() => metrics.reduce((sum, m) => sum + (m.inquiryCount || 0), 0), [metrics]);
  const avgDemandScore = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round(metrics.reduce((sum, m) => sum + (m.demandScore || 0), 0) / totalCount);
  }, [metrics, totalCount]);
  const totalNegotiations = useMemo(() => metrics.reduce((sum, m) => sum + (m.activeNegotiations || 0), 0), [metrics]);

  // ─── Category Counters for Pills ───
  const countAll = totalCount;
  const countUltraHot = useMemo(() => metrics.filter(m => m.liquidityTier === 'ultra_hot').length, [metrics]);
  const countTrophy = useMemo(() => metrics.filter(m => m.liquidityTier === 'trophy_asset').length, [metrics]);
  const countNeedsAttention = useMemo(() => metrics.filter(m => m.liquidityTier === 'under_engaged').length, [metrics]);

  // ─── Tier Badges Definition ───
  const getTierBadge = (tier: PropertyEngagementMetric['liquidityTier'], isLightMode: boolean) => {
    if (isLightMode) {
      switch (tier) {
        case 'ultra_hot':
          return {
            label: isAr ? 'طلب استثنائي مرتفع' : 'Ultra-High Demand',
            icon: Flame,
            color: '#E11D48',
            bg: '#FFF1F2',
            border: '#FECDD3',
          };
        case 'active_interest':
          return {
            label: isAr ? 'تفاعل نشط ومستمر' : 'Active Market Interest',
            icon: Zap,
            color: '#047857',
            bg: 'rgba(4, 120, 87, 0.08)',
            border: 'rgba(4, 120, 87, 0.25)',
          };
        case 'trophy_asset':
          return {
            label: isAr ? 'أصل سيادي نادر' : 'Trophy Sovereign Asset',
            icon: Crown,
            color: '#946F23',
            bg: 'rgba(148, 111, 35, 0.08)',
            border: 'rgba(148, 111, 35, 0.25)',
          };
        case 'under_engaged':
        default:
          return {
            label: isAr ? 'تفاعل منخفض (مراجعة التسعير)' : 'Low Engagement (Review Price)',
            icon: AlertCircle,
            color: '#B45309',
            bg: 'rgba(217, 119, 6, 0.08)',
            border: 'rgba(217, 119, 6, 0.25)',
          };
      }
    }

    // Dark Mode
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
      default:
        return {
          label: isAr ? 'تفاعل منخفض (مراجعة التسعير)' : 'Low Engagement (Review Price)',
          icon: AlertCircle,
          color: '#FBBF24',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.25)',
        };
    }
  };

  // ─── Rank Badge Style ───
  const getRankBadgeStyle = (rankIndex: number, isLightMode: boolean) => {
    const rankNum = rankIndex + 1;
    const formatted = `#${rankNum < 10 ? '0' + rankNum : rankNum}`;

    if (isLightMode) {
      if (rankIndex === 0) {
        return {
          color: '#946F23',
          bg: 'rgba(148, 111, 35, 0.12)',
          border: 'rgba(148, 111, 35, 0.35)',
          label: formatted,
        };
      }
      if (rankIndex === 1) {
        return {
          color: '#475569',
          bg: 'rgba(71, 85, 105, 0.1)',
          border: 'rgba(71, 85, 105, 0.3)',
          label: formatted,
        };
      }
      if (rankIndex === 2) {
        return {
          color: '#854D0E',
          bg: 'rgba(133, 77, 14, 0.1)',
          border: 'rgba(133, 77, 14, 0.3)',
          label: formatted,
        };
      }
      return {
        color: '#64748B',
        bg: '#F1F5F9',
        border: '#D8D2C4',
        label: formatted,
      };
    }

    // Dark mode
    if (rankIndex === 0) {
      return {
        color: '#E5B869',
        bg: 'rgba(229, 184, 105, 0.15)',
        border: 'rgba(229, 184, 105, 0.35)',
        label: formatted,
      };
    }
    if (rankIndex === 1) {
      return {
        color: '#94A3B8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.25)',
        label: formatted,
      };
    }
    if (rankIndex === 2) {
      return {
        color: '#D97706',
        bg: 'rgba(217, 119, 6, 0.12)',
        border: 'rgba(217, 119, 6, 0.25)',
        label: formatted,
      };
    }
    return {
      color: 'rgba(255, 255, 255, 0.4)',
      bg: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 255, 255, 0.08)',
      label: formatted,
    };
  };

  // ─── Filtered and Sorted Dataset ───
  const processedMetrics = useMemo(() => {
    let list = [...metrics];

    // 1. Tier filter
    if (filterTier !== 'all') {
      list = list.filter(m => m.liquidityTier === filterTier);
    }

    // 2. Search query filter (name Arabic / English / location)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(m => {
        const matchAr = m.titleAr?.toLowerCase().includes(q);
        const matchEn = m.titleEn?.toLowerCase().includes(q);
        const matchLoc = m.location?.toLowerCase().includes(q);
        return matchAr || matchEn || matchLoc;
      });
    }

    // 3. Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'inquiries':
          return (b.inquiryCount || 0) - (a.inquiryCount || 0);
        case 'price':
          return (b.priceEgp || 0) - (a.priceEgp || 0);
        case 'negotiations':
          return (b.activeNegotiations || 0) - (a.activeNegotiations || 0);
        case 'demand':
        default:
          return (b.demandScore || 0) - (a.demandScore || 0);
      }
    });

    return list;
  }, [metrics, filterTier, searchQuery, sortBy]);

  return (
    <div className={`leaderboard-card ${isLight ? 'is-light' : ''}`}>
      {/* ─── Header & Portfolio Ribbon ─── */}
      <div className="leaderboard-header">
        <div className="leaderboard-title-group">
          <div className="leaderboard-icon-box">
            <TrendingUp size={19} className="gold-icon" />
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

        {/* Portfolio Summary Ribbon */}
        <div className="summary-ribbon">
          <div className="ribbon-item">
            <span className="ribbon-label">{isAr ? 'إجمالي المعروض:' : 'Indexed Supply:'}</span>
            <span className="ribbon-value">{totalCount} {isAr ? 'صرح' : 'Assets'}</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-item">
            <span className="ribbon-label">{isAr ? 'متوسط مؤشر الطلب:' : 'Portfolio Demand Avg:'}</span>
            <span className="ribbon-value gold">{avgDemandScore}/100</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-item">
            <span className="ribbon-label">{isAr ? 'إجمالي الطلبات:' : 'Total Inquiries:'}</span>
            <span className="ribbon-value">{totalInquiries}</span>
          </div>
          <div className="ribbon-divider" />
          <div className="ribbon-item">
            <span className="ribbon-label">{isAr ? 'المفاوضات النشطة:' : 'Active Negotiations:'}</span>
            <span className="ribbon-value emerald">{totalNegotiations}</span>
          </div>
        </div>
      </div>

      {/* ─── Interaction, Search & Filter Toolbar ─── */}
      <div className="leaderboard-toolbar">
        {/* Filter Pills with Live Counters */}
        <div className="tier-filter-pills">
          {[
            { id: 'all', labelEn: `All Estates (${countAll})`, labelAr: `جميع العقارات (${countAll})` },
            { id: 'ultra_hot', labelEn: `Ultra-Hot (${countUltraHot})`, labelAr: `الأعلى طلباً (${countUltraHot})` },
            { id: 'trophy_asset', labelEn: `Trophy Sovereign (${countTrophy})`, labelAr: `أصول سيادية (${countTrophy})` },
            { id: 'under_engaged', labelEn: `Needs Attention (${countNeedsAttention})`, labelAr: `تتطلب اهتمام (${countNeedsAttention})` },
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

        {/* Right Group: Search Input + Sort Dropdown */}
        <div className="toolbar-actions-group">
          {/* Quick Search */}
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو المنطقة...' : 'Search by title or district...'}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                title={isAr ? 'مسح البحث' : 'Clear search'}
                aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="sort-selector-wrap">
            <ArrowUpDown size={14} className="sort-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="sort-dropdown"
              aria-label={isAr ? 'فرز العقارات' : 'Sort properties'}
            >
              <option value="demand">{isAr ? 'الأعلى طلباً (Demand Score)' : 'Highest Demand Score'}</option>
              <option value="inquiries">{isAr ? 'الأكثر استفساراً (Most Inquiries)' : 'Most Inquiries'}</option>
              <option value="price">{isAr ? 'الأعلى قيمة (Highest Price)' : 'Highest Price'}</option>
              <option value="negotiations">{isAr ? 'المفاوضات الجارية (Active Negotiations)' : 'Active Negotiations'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Structured Executive Table ─── */}
      <div className="leaderboard-table-wrap">
        <div className="leaderboard-table-inner">
          {/* Header Row */}
          <div className="table-header-row">
            <div className="th-col col-asset">
              <span>{isAr ? '# والصرح المعماري' : '# & Property Asset'}</span>
            </div>
            <div className="th-col col-demand">
              <span>{isAr ? 'مؤشر الجاذبية والطلب' : 'Demand Velocity'}</span>
            </div>
            <div className="th-col col-leads">
              <span>{isAr ? 'الاستفسارات والصفقات' : 'Inquiries & Negotiations'}</span>
            </div>
            <div className="th-col col-price">
              <span>{isAr ? 'القيمة المعروضة' : 'Listing Value'}</span>
            </div>
            <div className="th-col col-actions">
              <span>{isAr ? 'إجراءات' : 'Actions'}</span>
            </div>
          </div>

          {/* Body Rows / Empty State */}
          {processedMetrics.length === 0 ? (
            <div className="leaderboard-empty">
              <div className="empty-icon-circle">
                <Building2 size={24} />
              </div>
              <h4 className="empty-title">
                {isAr ? 'لم يتم العثور على صروح عقارية مطابقة' : 'No matching properties found'}
              </h4>
              <p className="empty-sub">
                {isAr 
                  ? 'يرجى مراجعة كلمات البحث أو تعديل تبويب التصفية لإظهار العقارات المتاحة.'
                  : 'Try adjusting your search query or switching filter tabs to view available estates.'}
              </p>
              {(searchQuery || filterTier !== 'all') && (
                <button
                  type="button"
                  className="empty-reset-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterTier('all');
                  }}
                >
                  {isAr ? 'إعادة ضبط البحث والتصفية' : 'Reset Filters & Search'}
                </button>
              )}
            </div>
          ) : (
            <div className="leaderboard-rows">
              {processedMetrics.map((item, idx) => {
                const tierBadge = getTierBadge(item.liquidityTier, isLight);
                const TierIcon = tierBadge.icon;
                const title = isAr ? item.titleAr : item.titleEn;
                const rankStyle = getRankBadgeStyle(idx, isLight);

                return (
                  <div key={item.propertyId} className="leaderboard-row">
                    {/* 1. Rank & Asset Info */}
                    <div className="col-asset">
                      <div 
                        className="rank-badge"
                        style={{
                          color: rankStyle.color,
                          background: rankStyle.bg,
                          borderColor: rankStyle.border,
                        }}
                      >
                        {rankStyle.label}
                      </div>

                      <div className="prop-thumb-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.thumbnail || '/images/hero-modern-villa.png'} 
                          alt={title} 
                          className="prop-thumb-img"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/hero-modern-villa.png';
                          }}
                        />
                      </div>

                      <div className="prop-details">
                        <div className="prop-title-bar">
                          <h4 className="prop-title-text" title={title}>
                            {title}
                          </h4>
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

                        <div className="prop-meta-line">
                          <span className="meta-item">
                            <MapPin size={12} className="meta-icon" />
                            <span>{item.location}</span>
                          </span>
                          <span className="meta-bullet">•</span>
                          <span className="meta-item">
                            <Calendar size={12} className="meta-icon" />
                            <span>{isAr ? `منذ ${item.daysOnMarket} يوماً` : `${item.daysOnMarket}d on market`}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Demand Velocity Meter */}
                    <div className="col-demand">
                      <div className="demand-score-head">
                        <span className="demand-title">{isAr ? 'مؤشر الطلب' : 'Demand Score'}</span>
                        <span className="demand-num" style={{ color: tierBadge.color }}>
                          {item.demandScore}<span className="demand-denom">/100</span>
                        </span>
                      </div>
                      <div className="demand-progress-track">
                        <div 
                          className="demand-progress-fill" 
                          style={{ 
                            width: `${Math.max(5, Math.min(100, item.demandScore))}%`,
                            background: tierBadge.color,
                          }} 
                        />
                      </div>
                    </div>

                    {/* 3. Inquiries & Negotiations */}
                    <div className="col-leads">
                      <div className="inquiry-stat-chip">
                        <Users size={13} className="chip-icon" />
                        <span>{item.inquiryCount} {isAr ? 'استفسار' : 'Inquiries'}</span>
                      </div>
                      {item.activeNegotiations > 0 && (
                        <div className="neg-stat-chip">
                          <Handshake size={12} className="chip-icon" />
                          <span>{item.activeNegotiations} {isAr ? 'مفاوضة' : 'Negotiating'}</span>
                        </div>
                      )}
                      {item.closedWonCount > 0 && (
                        <div className="won-stat-chip">
                          <Sparkles size={12} className="chip-icon" />
                          <span>{item.closedWonCount} {isAr ? 'تعاقد' : 'Won'}</span>
                        </div>
                      )}
                    </div>

                    {/* 4. Listing Value */}
                    <div className="col-price">
                      <span className="price-num">
                        {new Intl.NumberFormat('en-US').format(item.priceEgp)}
                      </span>
                      <span className="price-curr">
                        {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>

                    {/* 5. Quick Actions */}
                    <div className="col-actions">
                      <Link
                        href={`/admin/${adminLocale}/properties/${item.propertyId}/edit`}
                        className="action-btn"
                        title={isAr ? 'تعديل بيانات الصرح' : 'Edit Property Details'}
                      >
                        <Edit3 size={15} />
                      </Link>
                      <Link
                        href={`/${adminLocale}/properties/${item.slug || item.propertyId}`}
                        target="_blank"
                        className="action-btn"
                        title={isAr ? 'معاينة الصرح في الموقع' : 'View on Public Site'}
                      >
                        <Eye size={15} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* ─── Base Card Container ─── */
        .leaderboard-card {
          background: rgba(16, 20, 29, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
        }

        .leaderboard-card.is-light {
          background: #FFFFFF;
          border: 1px solid #D8D2C4;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
        }

        /* ─── Header & Title Group ─── */
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
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(229, 184, 105, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #E5B869;
          flex-shrink: 0;
          border: 1px solid rgba(229, 184, 105, 0.25);
        }

        .leaderboard-card.is-light .leaderboard-icon-box {
          background: rgba(148, 111, 35, 0.1);
          border-color: rgba(148, 111, 35, 0.25);
          color: #946F23;
        }

        .leaderboard-title {
          font-size: 16px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .leaderboard-card.is-light .leaderboard-title {
          color: #0F172A;
        }

        .leaderboard-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          margin: 3px 0 0 0;
          font-weight: 500;
        }

        .leaderboard-card.is-light .leaderboard-sub {
          color: #475569;
        }

        /* ─── Summary Ribbon ─── */
        .summary-ribbon {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 8px 16px;
          flex-wrap: wrap;
        }

        .leaderboard-card.is-light .summary-ribbon {
          background: #F8FAFC;
          border: 1px solid #D8D2C4;
        }

        .ribbon-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .ribbon-label {
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }

        .leaderboard-card.is-light .ribbon-label {
          color: #64748B;
        }

        .ribbon-value {
          font-weight: 800;
          color: #FFFFFF;
          font-variant-numeric: tabular-nums;
        }

        .leaderboard-card.is-light .ribbon-value {
          color: #0F172A;
        }

        .ribbon-value.gold {
          color: #E5B869;
        }

        .leaderboard-card.is-light .ribbon-value.gold {
          color: #946F23;
        }

        .ribbon-value.emerald {
          color: #34D399;
        }

        .leaderboard-card.is-light .ribbon-value.emerald {
          color: #047857;
        }

        .ribbon-divider {
          width: 1px;
          height: 14px;
          background: rgba(255, 255, 255, 0.08);
        }

        .leaderboard-card.is-light .ribbon-divider {
          background: #D8D2C4;
        }

        /* ─── Toolbar (Filters, Search & Sort) ─── */
        .leaderboard-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          padding-bottom: 4px;
        }

        .tier-filter-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tier-pill-btn {
          padding: 6px 13px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.65);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 160ms ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
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

        .leaderboard-card.is-light .tier-pill-btn {
          background: #F1F5F9;
          border: 1px solid #D8D2C4;
          color: #334155;
        }

        .leaderboard-card.is-light .tier-pill-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }

        .leaderboard-card.is-light .tier-pill-btn.active {
          background: linear-gradient(135deg, #946F23 0%, #78581C 100%);
          color: #FFFFFF;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(148, 111, 35, 0.25);
        }

        .toolbar-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Search Box */
        .search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 220px;
        }

        .search-icon {
          position: absolute;
          inset-inline-start: 10px;
          color: rgba(255, 255, 255, 0.45);
          pointer-events: none;
        }

        .leaderboard-card.is-light .search-icon {
          color: #64748B;
        }

        .search-input {
          width: 100%;
          padding: 7px 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          font-size: 12px;
          font-family: inherit;
          outline: none;
          transition: all 160ms ease;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .search-input:focus {
          border-color: #E5B869;
          box-shadow: 0 0 0 3px rgba(229, 184, 105, 0.15);
        }

        .leaderboard-card.is-light .search-input {
          background: #FFFFFF;
          border: 1px solid #D8D2C4;
          color: #0F172A;
        }

        .leaderboard-card.is-light .search-input::placeholder {
          color: #94A3B8;
        }

        .leaderboard-card.is-light .search-input:focus {
          border-color: #946F23;
          box-shadow: 0 0 0 3px rgba(148, 111, 35, 0.12);
        }

        .search-clear-btn {
          position: absolute;
          inset-inline-end: 8px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .search-clear-btn:hover {
          color: #FFFFFF;
        }

        .leaderboard-card.is-light .search-clear-btn {
          color: #64748B;
        }

        .leaderboard-card.is-light .search-clear-btn:hover {
          color: #0F172A;
        }

        /* Sort Dropdown */
        .sort-selector-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sort-icon {
          position: absolute;
          inset-inline-start: 10px;
          color: rgba(255, 255, 255, 0.45);
          pointer-events: none;
        }

        .leaderboard-card.is-light .sort-icon {
          color: #64748B;
        }

        .sort-dropdown {
          padding: 7px 12px 7px 30px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: all 160ms ease;
        }

        [dir="rtl"] .sort-dropdown {
          padding: 7px 30px 7px 12px;
        }

        .sort-dropdown:focus {
          border-color: #E5B869;
          box-shadow: 0 0 0 3px rgba(229, 184, 105, 0.15);
        }

        .leaderboard-card.is-light .sort-dropdown {
          background: #FFFFFF;
          border: 1px solid #D8D2C4;
          color: #0F172A;
        }

        .leaderboard-card.is-light .sort-dropdown:focus {
          border-color: #946F23;
          box-shadow: 0 0 0 3px rgba(148, 111, 35, 0.12);
        }

        .leaderboard-card.is-light .sort-dropdown option {
          background: #FFFFFF;
          color: #0F172A;
        }

        .sort-dropdown option {
          background: #0F141E;
          color: #FFFFFF;
        }

        /* ─── Structured Executive Table Layout ─── */
        .leaderboard-table-wrap {
          width: 100%;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 111, 35, 0.3) transparent;
        }

        .leaderboard-table-inner {
          min-width: 780px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Table Header */
        .table-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .leaderboard-card.is-light .table-header-row {
          background: #F8FAFC;
          border: 1px solid #D8D2C4;
        }

        .th-col {
          font-size: 11px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .leaderboard-card.is-light .th-col {
          color: #475569;
        }

        /* Table Body Rows */
        .leaderboard-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leaderboard-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          border-inline-start: 4px solid transparent;
          transition: background 180ms ease, border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
        }

        .leaderboard-row:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(229, 184, 105, 0.3);
          border-inline-start-color: #E5B869;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .leaderboard-card.is-light .leaderboard-row {
          background: #FFFFFF;
          border: 1px solid #D8D2C4;
          border-inline-start: 4px solid transparent;
        }

        .leaderboard-card.is-light .leaderboard-row:hover {
          background: #F8FAFC;
          border-color: #C5A059;
          border-inline-start-color: #946F23;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
        }

        /* Column 1: Rank & Asset */
        .col-asset {
          flex: 2.8;
          min-width: 280px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .rank-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }

        .prop-thumb-wrap {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          overflow: hidden;
          background: #000;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .leaderboard-card.is-light .prop-thumb-wrap {
          border: 1px solid #D8D2C4;
          background: #F1F5F9;
        }

        .prop-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .prop-details {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
          flex: 1;
        }

        .prop-title-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .prop-title-text {
          font-size: 14px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.35;
          letter-spacing: -0.01em;
        }

        .leaderboard-card.is-light .prop-title-text {
          color: #0F172A;
        }

        .tier-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 800;
          padding: 2.5px 7px;
          border-radius: 6px;
          border: 1px solid;
          white-space: nowrap;
        }

        .prop-meta-line {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        .leaderboard-card.is-light .prop-meta-line {
          color: #475569;
        }

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .meta-icon {
          color: rgba(255, 255, 255, 0.45);
          flex-shrink: 0;
        }

        .leaderboard-card.is-light .meta-icon {
          color: #64748B;
        }

        .meta-bullet {
          opacity: 0.4;
        }

        /* Column 2: Demand Score */
        .col-demand {
          flex: 1.2;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .demand-score-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .demand-title {
          font-size: 10.5px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .leaderboard-card.is-light .demand-title {
          color: #64748B;
        }

        .demand-num {
          font-size: 13.5px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .demand-denom {
          font-size: 11px;
          font-weight: 600;
          opacity: 0.65;
        }

        .demand-progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          overflow: hidden;
        }

        .leaderboard-card.is-light .demand-progress-track {
          background: #E2E8F0;
        }

        .demand-progress-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Column 3: Inquiries & Negotiations */
        .col-leads {
          flex: 1.3;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: flex-start;
        }

        .inquiry-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .leaderboard-card.is-light .inquiry-stat-chip {
          background: #F1F5F9;
          border: 1px solid #D8D2C4;
          color: #0F172A;
        }

        .neg-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          color: #34D399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 2px 7px;
          border-radius: 5px;
        }

        .leaderboard-card.is-light .neg-stat-chip {
          color: #047857;
          background: rgba(4, 120, 87, 0.08);
          border-color: rgba(4, 120, 87, 0.25);
        }

        .won-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          color: #E5B869;
          background: rgba(229, 184, 105, 0.12);
          border: 1px solid rgba(229, 184, 105, 0.25);
          padding: 2px 7px;
          border-radius: 5px;
        }

        .leaderboard-card.is-light .won-stat-chip {
          color: #946F23;
          background: rgba(148, 111, 35, 0.08);
          border-color: rgba(148, 111, 35, 0.25);
        }

        /* Column 4: Listing Value */
        .col-price {
          flex: 1.1;
          min-width: 130px;
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .price-num {
          font-size: 15px;
          font-weight: 800;
          color: #FFFFFF;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }

        .leaderboard-card.is-light .price-num {
          color: #0F172A;
        }

        .price-curr {
          font-size: 12px;
          font-weight: 800;
          color: #E5B869;
        }

        .leaderboard-card.is-light .price-curr {
          color: #946F23;
        }

        /* Column 5: Actions */
        .col-actions {
          width: 84px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 160ms ease;
        }

        .action-btn:hover {
          background: linear-gradient(135deg, #E5B869 0%, #C5A059 100%);
          color: #0A0C10;
          border-color: transparent;
          transform: translateY(-1px);
        }

        .leaderboard-card.is-light .action-btn {
          background: #F8FAFC;
          border: 1px solid #D8D2C4;
          color: #475569;
        }

        .leaderboard-card.is-light .action-btn:hover {
          background: linear-gradient(135deg, #946F23 0%, #78581C 100%);
          color: #FFFFFF;
          border-color: transparent;
        }

        /* ─── Empty State ─── */
        .leaderboard-empty {
          padding: 48px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 12px;
        }

        .leaderboard-card.is-light .leaderboard-empty {
          background: #F8FAFC;
          border: 1px dashed #D8D2C4;
        }

        .empty-icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(229, 184, 105, 0.1);
          color: #E5B869;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .leaderboard-card.is-light .empty-icon-circle {
          background: rgba(148, 111, 35, 0.1);
          color: #946F23;
        }

        .empty-title {
          font-size: 15px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
        }

        .leaderboard-card.is-light .empty-title {
          color: #0F172A;
        }

        .empty-sub {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          max-width: 420px;
        }

        .leaderboard-card.is-light .empty-sub {
          color: #64748B;
        }

        .empty-reset-btn {
          margin-top: 6px;
          padding: 7px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 160ms ease;
        }

        .empty-reset-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .leaderboard-card.is-light .empty-reset-btn {
          background: #0F172A;
          color: #FFFFFF;
          border-color: #0F172A;
        }

        .leaderboard-card.is-light .empty-reset-btn:hover {
          background: #946F23;
          border-color: #946F23;
        }

        /* ─── Responsive Media Queries ─── */
        @media (max-width: 1024px) {
          .summary-ribbon {
            width: 100%;
            justify-content: space-around;
          }
        }

        @media (max-width: 768px) {
          .leaderboard-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .toolbar-actions-group {
            width: 100%;
            flex-direction: column;
          }
          .search-input-wrap, .sort-selector-wrap {
            width: 100%;
          }
          .sort-dropdown {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
