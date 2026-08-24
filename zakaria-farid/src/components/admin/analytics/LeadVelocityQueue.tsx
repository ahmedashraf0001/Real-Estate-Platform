'use client';

import React from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Phone, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  UserCheck, 
  ShieldAlert,
  Send
} from 'lucide-react';
import { ChannelBreakdownMetric } from '@/lib/services/dashboardAnalytics';

interface LeadVelocityQueueProps {
  staleLeads: any[];
  channels: ChannelBreakdownMetric[];
  adminLocale: string;
}

export default function LeadVelocityQueue({ staleLeads, channels, adminLocale }: LeadVelocityQueueProps) {
  const isAr = adminLocale === 'ar';

  const formatHoursAgo = (dateStr: string) => {
    const then = new Date(dateStr).getTime();
    const diffHours = Math.round((Date.now() - then) / (1000 * 60 * 60));
    if (diffHours < 24) {
      return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  };

  return (
    <div className="velocity-grid">
      {/* 1. Lead Origin Channel Share */}
      <div className="channel-card">
        <div className="section-header">
          <div className="section-icon-box">
            <Send size={16} className="gold-icon" />
          </div>
          <div>
            <h3 className="section-title">
              {isAr ? 'قنوات استقطاب العملاء والمستثمرين' : 'Acquisition Channels & Conversion'}
            </h3>
            <p className="section-sub">
              {isAr ? 'توزيع مصادر الاستفسارات ومعدل التحويل' : 'Inquiry volume distribution & closing rate by channel.'}
            </p>
          </div>
        </div>

        <div className="channel-bars-list">
          {channels.map((ch) => (
            <div key={ch.channelKey} className="channel-row">
              <div className="channel-meta">
                <span className="channel-name">{isAr ? ch.labelAr : ch.labelEn}</span>
                <div className="channel-stats">
                  <span className="channel-share-pct" style={{ color: ch.color }}>{ch.percentage}%</span>
                  <span className="channel-conv-pill">
                    {ch.conversionRate}% {isAr ? 'إغلاق' : 'Conv.'}
                  </span>
                </div>
              </div>
              <div className="channel-track">
                <div 
                  className="channel-fill"
                  style={{
                    width: `${Math.max(4, ch.percentage)}%`,
                    background: ch.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Urgent Deals Action Queue */}
      <div className="urgent-queue-card">
        <div className="section-header">
          <div className="section-icon-box alert-box">
            <AlertTriangle size={16} className="red-icon" />
          </div>
          <div>
            <div className="title-with-pill">
              <h3 className="section-title">
                {isAr ? 'طابور الاستجابة السريعة للصفقات العاجلة' : 'High-Priority Deal Action Queue'}
              </h3>
              {staleLeads.length > 0 && (
                <span className="urgent-count-badge">
                  {staleLeads.length} {isAr ? 'تتطلب رد' : 'Pending SLA'}
                </span>
              )}
            </div>
            <p className="section-sub">
              {isAr 
                ? 'طلبات عملاء جديدة مر عليها أكثر من 24 ساعة دون تواصل'
                : 'High-intent inquiries awaiting broker follow-up >24 hours.'}
            </p>
          </div>
        </div>

        <div className="urgent-leads-list">
          {staleLeads.length === 0 ? (
            <div className="queue-all-clear">
              <UserCheck size={24} className="clear-icon" />
              <p>{isAr ? 'جميع طلبات العملاء تم الرد عليها ضمن المعدل الزمني المثالي ✨' : 'All client inquiries are up to date within the target response SLA ✨'}</p>
            </div>
          ) : (
            staleLeads.map((lead) => {
              const cleanPhone = (lead.phone || '').replace(/[^0-9+]/g, '');
              const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                isAr 
                  ? `أهلاً بك ${lead.name}، معك زكريا فريد للاستشارات العقارية المعمارية بخصوص استفسارك.`
                  : `Hello ${lead.name}, this is Zakaria Farid Luxury Architectural Studio regarding your inquiry.`
              )}`;

              return (
                <div key={lead.id} className="urgent-lead-row">
                  <div className="lead-main-meta">
                    <div className="lead-name-row">
                      <strong className="lead-name">{lead.name || (isAr ? 'عميل فاخر' : 'Luxury Client')}</strong>
                      <span className="lead-time-tag">
                        <Clock size={11} />
                        <span>{formatHoursAgo(lead.created_at)}</span>
                      </span>
                    </div>
                    <span className="lead-prop-name">
                      {lead.property?.title_en || lead.property?.title_ar || (isAr ? 'استفسار عام عن محفظة العقارات' : 'General Portfolio Inquiry')}
                    </span>
                  </div>

                  <div className="lead-action-buttons">
                    {cleanPhone && (
                      <>
                        <a 
                          href={waUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="lead-btn wa-btn"
                          title={isAr ? 'محادثة فورية عبر واتساب' : 'Chat on WhatsApp'}
                        >
                          <MessageSquare size={13} />
                          <span>WhatsApp</span>
                        </a>
                        <a 
                          href={`tel:${cleanPhone}`} 
                          className="lead-btn phone-btn"
                          title={isAr ? 'اتصال هاتفي مباشر' : 'Direct Call'}
                        >
                          <Phone size={13} />
                          <span>Call</span>
                        </a>
                      </>
                    )}
                    <Link 
                      href={`/admin/${adminLocale}/leads`} 
                      className="lead-btn crm-btn"
                      title={isAr ? 'فتح في CRM' : 'Open in CRM'}
                    >
                      <ArrowRight size={13} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx>{`
        .velocity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 16px;
        }

        .channel-card, .urgent-queue-card {
          background: rgba(16, 20, 29, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .urgent-queue-card {
          border-top: 2px solid #FB7185;
        }

        .channel-card {
          border-top: 2px solid #E5B869;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon-box {
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

        .section-icon-box.alert-box {
          background: rgba(244, 63, 94, 0.12);
          color: #FB7185;
          border: 1px solid rgba(244, 63, 94, 0.25);
        }

        .title-with-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .section-title {
          font-size: 14.5px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
        }

        .urgent-count-badge {
          font-size: 9.5px;
          font-weight: 800;
          color: #FB7185;
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.25);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .section-sub {
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.55);
          margin: 2px 0 0 0;
        }

        .channel-bars-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .channel-row {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .channel-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .channel-name {
          font-size: 12.5px;
          font-weight: 700;
          color: #FFFFFF;
        }

        .channel-stats {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .channel-share-pct {
          font-size: 12.5px;
          font-weight: 800;
        }

        .channel-conv-pill {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.04);
          padding: 2px 5px;
          border-radius: 4px;
        }

        .channel-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 9999px;
          overflow: hidden;
        }

        .channel-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.4s ease;
        }

        .urgent-leads-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .urgent-lead-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          transition: all 150ms ease;
        }

        .urgent-lead-row:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(244, 63, 94, 0.25);
        }

        .lead-main-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .lead-name-row {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .lead-name {
          font-size: 12.5px;
          font-weight: 800;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lead-time-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 9.5px;
          font-weight: 700;
          color: #FB7185;
          background: rgba(244, 63, 94, 0.12);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .lead-prop-name {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.55);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lead-action-buttons {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .lead-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          transition: all 150ms ease;
        }

        .wa-btn {
          background: rgba(16, 185, 129, 0.12);
          color: #34D399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .wa-btn:hover {
          background: #34D399;
          color: #0A0C10;
        }

        .phone-btn {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .phone-btn:hover {
          background: #E5B869;
          color: #0A0C10;
          border-color: #E5B869;
        }

        .crm-btn {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 6px;
        }

        .crm-btn:hover {
          background: #E5B869;
          color: #0A0C10;
          border-color: #E5B869;
        }

        .queue-all-clear {
          padding: 22px;
          text-align: center;
          color: rgba(255, 255, 255, 0.55);
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .clear-icon {
          color: #34D399;
        }
      `}</style>
    </div>
  );
}
