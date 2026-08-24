import { getAllPropertiesAdmin, getAllLeads } from '@/lib/supabase/queries';
import Link from 'next/link';
import {
  TrendingUp, BarChart3, PieChart, Sparkles, Building2, Users, Compass,
  ArrowRight, ShieldCheck, MapPin, ExternalLink, Plus, RefreshCw, Layers
} from 'lucide-react';
import PropertyEngagementLeaderboard from '@/components/admin/analytics/PropertyEngagementLeaderboard';
import DistrictDemandMatrix from '@/components/admin/analytics/DistrictDemandMatrix';
import ExecutiveAdvisoryFeed from '@/components/admin/analytics/ExecutiveAdvisoryFeed';
import LeadVelocityQueue from '@/components/admin/analytics/LeadVelocityQueue';
import {
  computePropertyEngagementScores,
  computeDistrictDemandMetrics,
  generateStrategicAdvisories,
  computeLeadChannelBreakdown
} from '@/lib/services/dashboardAnalytics';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  return {
    title: isAr ? 'تحليلات العقارات والذكاء السوقي' : 'Property & Market Analytics',
  };
}

function isStale(lead: any) {
  const stage = lead.stage || 'new';
  if (stage !== 'new') return false;
  const base = lead.stage_updated_at || lead.created_at;
  if (!base) return false;
  const then = new Date(base).getTime();
  const diffHours = (Date.now() - then) / (1000 * 60 * 60);
  return diffHours >= 24;
}

export default async function AnalyticsPage({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';

  const [properties, leads] = await Promise.all([
    getAllPropertiesAdmin().catch(() => []),
    getAllLeads().catch(() => []),
  ]);

  const activeProperties = properties.filter((p) => p.listing_status === 'active');
  const staleLeads = leads.filter(isStale);

  // Compute analytics
  const engagementMetrics = computePropertyEngagementScores(properties, leads);
  const districtDemandMetrics = computeDistrictDemandMetrics(properties, leads);
  const advisories = generateStrategicAdvisories(properties, leads, isAr);
  const channelBreakdown = computeLeadChannelBreakdown(leads);

  // Key Highlight Stats
  const topProperty = engagementMetrics[0];
  const topDistrict = [...districtDemandMetrics].sort((a, b) => b.inquiryCount - a.inquiryCount)[0];
  const totalInquiries = leads.length;
  const closedDeals = leads.filter((l) => l.stage === 'closed_won').length;
  const closingRate = totalInquiries > 0 ? Math.round((closedDeals / totalInquiries) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif)" }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ─── 1. Analytics Hub Header ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(16, 20, 29, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {isAr ? 'الذكاء العقاري وتحليلات السوق' : 'Property & Market Intelligence'}
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '9999px',
              background: 'rgba(229, 184, 105, 0.12)',
              color: '#E5B869',
              border: '1px solid rgba(229, 184, 105, 0.3)'
            }}>
              {isAr ? 'مؤشرات حية متزامنة' : 'Live Real-Time Index'}
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px', margin: '4px 0 0', fontWeight: 500 }}>
            {isAr
              ? 'تحليل سرعة تفاعل المشترين مع العقارات المعروضة، ومصفوفة العرض والطلب حسب المناطق، وتوزيع قنوات الاستحواذ'
              : 'Live buyer liquidity velocity, district supply vs. demand matrix, and acquisition channel attribution.'}
          </p>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href={`/admin/${adminLocale}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.85)',
              textDecoration: 'none',
              transition: 'all 150ms ease'
            }}
          >
            <span>{isAr ? '← لوحة القيادة التنفيذية' : '← Executive Overview'}</span>
          </Link>

          <Link
            href={`/admin/${adminLocale}/properties/new`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)',
              color: '#0A0C10',
              textDecoration: 'none',
              boxShadow: '0 3px 14px rgba(229, 184, 105, 0.3)',
              transition: 'all 150ms ease'
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{isAr ? 'إدراج عقار جديد' : 'New Property'}</span>
          </Link>
        </div>
      </div>

      {/* ─── 2. Top 4 Analytical Highlights ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
        
        {/* Metric 1: Top Engaged Asset */}
        <div style={{
          background: 'rgba(16, 20, 29, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid rgba(229, 184, 105, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'أعلى عقار طلباً بالمحفظة' : 'Highest Velocity Asset'}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#E5B869', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {topProperty ? (isAr ? topProperty.titleAr : topProperty.titleEn) : (isAr ? 'لا توجد بيانات' : 'No Data')}
            </span>
            <p style={{ fontSize: '11px', color: '#E5B869', margin: '3px 0 0', fontWeight: 600 }}>
              {topProperty ? `${topProperty.demandScore}/100 Demand Score (${topProperty.inquiryCount} Inquiries)` : '—'}
            </p>
          </div>
        </div>

        {/* Metric 2: Primary Demand Geographic District */}
        <div style={{
          background: 'rgba(16, 20, 29, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'المنطقة الأكثر طلباً' : 'Top Geographic Demand'}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={14} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {topDistrict ? (isAr ? topDistrict.nameAr : topDistrict.nameEn) : 'Sheikh Zayed & West'}
            </span>
            <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '3px 0 0', fontWeight: 500 }}>
              {topDistrict ? `${topDistrict.inquirySharePct}% of total inbound buyer demand` : 'Active tracking'}
            </p>
          </div>
        </div>

        {/* Metric 3: Primary Inbound Channel */}
        <div style={{
          background: 'rgba(16, 20, 29, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'أعلى قنوات الاستحواذ' : 'Top Acquisition Channel'}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={14} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', display: 'block' }}>
              {isAr ? 'مكتب الواتساب الفوري' : 'WhatsApp VIP Desk'}
            </span>
            <p style={{ fontSize: '11px', color: '#34D399', margin: '3px 0 0', fontWeight: 600 }}>
              {channelBreakdown[0]?.percentage || 55}% share • 40% target conversion
            </p>
          </div>
        </div>

        {/* Metric 4: Deal Conversion Rate */}
        <div style={{
          background: 'rgba(16, 20, 29, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'نسبة نجاح التعاقد' : 'Deal Conversion Rate'}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#E5B869', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={14} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {closingRate}%
            </span>
            <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '3px 0 0', fontWeight: 500 }}>
              {closedDeals} {isAr ? 'عقود استحواذ ناجحة' : 'Closed Deals'} ({totalInquiries} {isAr ? 'إجمالي الطلبات' : 'Total Leads'})
            </p>
          </div>
        </div>

      </div>

      {/* ─── 3. Strategic Executive Advisory Feed ─── */}
      {advisories.length > 0 && (
        <ExecutiveAdvisoryFeed advisories={advisories} adminLocale={adminLocale} />
      )}

      {/* ─── 4. Full Property Engagement & Buyer Demand Index ─── */}
      <PropertyEngagementLeaderboard metrics={engagementMetrics} adminLocale={adminLocale} />

      {/* ─── 5. Geographic Liquidity Matrix & Acquisition Channels ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* District Demand Matrix */}
        <DistrictDemandMatrix metrics={districtDemandMetrics} adminLocale={adminLocale} />
        
        {/* Lead Velocity & Channel Breakdown */}
        <LeadVelocityQueue staleLeads={staleLeads} channels={channelBreakdown} adminLocale={adminLocale} />
      </div>

    </div>
  );
}
