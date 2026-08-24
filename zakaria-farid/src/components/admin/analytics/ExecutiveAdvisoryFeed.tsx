'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  ShieldCheck, 
  Lightbulb,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Zap,
  Flame,
  Compass
} from 'lucide-react';
import { ExecutiveAdvisory } from '@/lib/services/dashboardAnalytics';

interface ExecutiveAdvisoryFeedProps {
  advisories: ExecutiveAdvisory[];
  adminLocale: string;
}

export default function ExecutiveAdvisoryFeed({ advisories, adminLocale }: ExecutiveAdvisoryFeedProps) {
  const isAr = adminLocale === 'ar';

  const getTypeIcon = (type: ExecutiveAdvisory['type']) => {
    switch (type) {
      case 'deal_alert':
        return AlertTriangle;
      case 'opportunity':
        return Sparkles;
      case 'pricing':
        return DollarSign;
      case 'portfolio_gap':
      default:
        return Lightbulb;
    }
  };

  const getSeverityStyle = (severity: ExecutiveAdvisory['severity']) => {
    switch (severity) {
      case 'high':
        return {
          themeColor: '#FB7185',
          bgGradient: 'linear-gradient(145deg, rgba(244, 63, 94, 0.14) 0%, rgba(16, 20, 29, 0.95) 100%)',
          border: 'rgba(244, 63, 94, 0.35)',
          topBorder: '#FB7185',
          badgeBg: 'rgba(244, 63, 94, 0.15)',
          badgeColor: '#FB7185',
          badgeBorder: 'rgba(244, 63, 94, 0.3)',
          badgeLabel: isAr ? 'إجراء عاجل' : 'HIGH PRIORITY',
          btnBg: 'rgba(244, 63, 94, 0.12)',
          btnBorder: 'rgba(244, 63, 94, 0.35)',
          btnColor: '#FDA4AF',
          btnHoverBg: '#FB7185',
          btnHoverColor: '#0A0C10',
          metricBg: 'rgba(244, 63, 94, 0.12)',
          metricColor: '#FB7185',
        };
      case 'medium':
        return {
          themeColor: '#E5B869',
          bgGradient: 'linear-gradient(145deg, rgba(229, 184, 105, 0.12) 0%, rgba(16, 20, 29, 0.95) 100%)',
          border: 'rgba(229, 184, 105, 0.3)',
          topBorder: '#E5B869',
          badgeBg: 'rgba(229, 184, 105, 0.15)',
          badgeColor: '#E5B869',
          badgeBorder: 'rgba(229, 184, 105, 0.35)',
          badgeLabel: isAr ? 'فرصة نمو استثمارية' : 'GROWTH OPPORTUNITY',
          btnBg: 'linear-gradient(135deg, rgba(229, 184, 105, 0.15) 0%, rgba(197, 160, 89, 0.08) 100%)',
          btnBorder: 'rgba(229, 184, 105, 0.35)',
          btnColor: '#E5B869',
          btnHoverBg: 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)',
          btnHoverColor: '#0A0C10',
          metricBg: 'rgba(229, 184, 105, 0.12)',
          metricColor: '#E5B869',
        };
      case 'info':
      default:
        return {
          themeColor: '#38BDF8',
          bgGradient: 'linear-gradient(145deg, rgba(56, 189, 248, 0.12) 0%, rgba(16, 20, 29, 0.95) 100%)',
          border: 'rgba(56, 189, 248, 0.3)',
          topBorder: '#38BDF8',
          badgeBg: 'rgba(56, 189, 248, 0.15)',
          badgeColor: '#38BDF8',
          badgeBorder: 'rgba(56, 189, 248, 0.35)',
          badgeLabel: isAr ? 'رؤية استراتيجية' : 'STRATEGIC INSIGHT',
          btnBg: 'rgba(56, 189, 248, 0.12)',
          btnBorder: 'rgba(56, 189, 248, 0.3)',
          btnColor: '#7DD3FC',
          btnHoverBg: '#38BDF8',
          btnHoverColor: '#0A0C10',
          metricBg: 'rgba(56, 189, 248, 0.12)',
          metricColor: '#38BDF8',
        };
    }
  };

  return (
    <div className="advisory-master-container">
      {/* Header Bar */}
      <div className="advisory-header">
        <div className="advisory-title-group">
          <div className="advisory-icon-box">
            <Sparkles size={17} />
          </div>
          <div>
            <div className="title-with-pill">
              <h2 className="advisory-title">
                {isAr ? 'المرشد الاستراتيجي والذكاء التنفيذي' : 'Strategic Executive Advisory & Intelligence'}
              </h2>
              <span className="live-ai-badge">
                <span className="pulsing-dot" />
                <span>{isAr ? 'تحليل مباشر' : 'Real-time Intelligence'}</span>
              </span>
            </div>
            <p className="advisory-sub">
              {isAr 
                ? 'توصيات ذكية مستمرة مبنية على حركة طلبات العملاء وتغيرات الأسعار وفجوات المعروض'
                : 'Automated executive guidance on inventory gaps, response priorities, and acquisition moves.'}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="advisory-grid">
        {advisories.map((item) => {
          const Icon = getTypeIcon(item.type);
          const style = getSeverityStyle(item.severity);
          const title = isAr ? item.titleAr : item.titleEn;
          const msg = isAr ? item.messageAr : item.messageEn;
          const actionText = isAr ? item.actionTextAr : item.actionTextEn;

          return (
            <div 
              key={item.id} 
              className="advisory-item"
              style={{
                background: style.bgGradient,
                borderColor: style.border,
                borderTop: `2px solid ${style.topBorder}`,
              }}
            >
              {/* Top Row: Severity Badge + Metric Chip */}
              <div className="advisory-card-top">
                <div className="badge-row">
                  <div 
                    className="advisory-icon-circle"
                    style={{
                      color: style.themeColor,
                      background: style.badgeBg,
                      borderColor: style.badgeBorder,
                    }}
                  >
                    <Icon size={14} strokeWidth={2.5} />
                  </div>
                  <span 
                    className="advisory-severity-pill"
                    style={{
                      color: style.badgeColor,
                      background: style.badgeBg,
                      borderColor: style.badgeBorder,
                    }}
                  >
                    {style.badgeLabel}
                  </span>
                </div>

                {item.metric && (
                  <span 
                    className="advisory-metric-badge"
                    style={{
                      color: style.metricColor,
                      background: style.metricBg,
                      borderColor: style.badgeBorder,
                    }}
                  >
                    {item.metric}
                  </span>
                )}
              </div>

              {/* Title & Body */}
              <div className="advisory-body">
                <h3 className="advisory-card-title">{title}</h3>
                <p className="advisory-card-desc">{msg}</p>
              </div>

              {/* Action Button */}
              {item.actionHref && actionText && (
                <div className="advisory-footer">
                  <Link 
                    href={item.actionHref} 
                    className="advisory-action-btn"
                    style={{
                      background: style.btnBg,
                      borderColor: style.btnBorder,
                      color: style.btnColor,
                    }}
                  >
                    <span>{actionText}</span>
                    <ArrowRight size={13} className="btn-arrow-icon" style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .advisory-master-container {
          background: rgba(16, 20, 29, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .advisory-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .advisory-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .advisory-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(229, 184, 105, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #E5B869;
          flex-shrink: 0;
          border: 1px solid rgba(229, 184, 105, 0.3);
          box-shadow: 0 4px 12px rgba(229, 184, 105, 0.15);
        }

        .title-with-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .advisory-title {
          font-size: 15px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .live-ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 9px;
          border-radius: 9999px;
          background: rgba(229, 184, 105, 0.12);
          border: 1px solid rgba(229, 184, 105, 0.3);
          color: #E5B869;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .pulsing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E5B869;
          box-shadow: 0 0 8px #E5B869;
          animation: pulseGlow 1.8s infinite;
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.25); }
        }

        .advisory-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          margin: 2px 0 0 0;
          font-weight: 500;
        }

        .advisory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 14px;
        }

        .advisory-item {
          border-radius: 14px;
          border: 1px solid;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          gap: 14px;
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }

        .advisory-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
        }

        .advisory-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .advisory-icon-circle {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          flex-shrink: 0;
        }

        .advisory-severity-pill {
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 5px;
          border: 1px solid;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .advisory-metric-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid;
          letter-spacing: 0.02em;
        }

        .advisory-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .advisory-card-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.35;
          letter-spacing: -0.01em;
        }

        .advisory-card-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
          margin: 0;
          line-height: 1.55;
          font-weight: 450;
        }

        .advisory-footer {
          display: flex;
          align-items: center;
          margin-top: 2px;
        }

        .advisory-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 11.5px;
          font-weight: 800;
          text-decoration: none;
          transition: all 180ms ease;
          letter-spacing: 0.01em;
        }

        .advisory-action-btn:hover {
          background: #E5B869 !important;
          color: #0A0C10 !important;
          border-color: #E5B869 !important;
          box-shadow: 0 4px 14px rgba(229, 184, 105, 0.35);
          transform: translateX(2px);
        }

        .btn-arrow-icon {
          transition: transform 180ms ease;
        }

        .advisory-action-btn:hover .btn-arrow-icon {
          transform: translateX(3px);
        }
      `}</style>
    </div>
  );
}
