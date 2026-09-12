import { getAllPropertiesAdmin, getAllLeads } from '@/lib/supabase/queries';
import Link from 'next/link';
import {
  Building2, Users, TrendingUp, Plus, Crown, AlertTriangle,
  Sparkles, CheckCircle2, ArrowRight, DollarSign, PieChart, Clock, MessageCircle, Home, Castle, SunMedium, ShieldCheck, Compass, Eye, Zap,
  ExternalLink, Phone, Pencil, ArrowUpRight, MapPin, BarChart3, Landmark
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';
import { formatInternationalWhatsAppNumber } from '@/lib/services/whatsappNotifier';
import { generateStrategicAdvisories } from '@/lib/services/dashboardAnalytics';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  return {
    title: isAr ? 'لوحة القيادة التنفيذية' : 'Executive Overview',
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

function formatTimeAgo(isoString?: string) {
  if (!isoString) return '';
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STAGE_CONFIG: Record<string, { en: string; ar: string; color: string; bg: string; border: string }> = {
  new:               { en: 'New Inquiry',      ar: 'طلب جديد',        color: '#E5B869', bg: 'rgba(229, 184, 105, 0.12)', border: 'rgba(229, 184, 105, 0.25)' },
  contacted:         { en: 'Contacted',        ar: 'تم التواصل',       color: '#C5A059', bg: 'rgba(197, 160, 89, 0.12)',  border: 'rgba(197, 160, 89, 0.25)' },
  viewing_scheduled: { en: 'Viewing Set',      ar: 'معاينة مجدولة',    color: '#D4AF37', bg: 'rgba(212, 175, 55, 0.12)',  border: 'rgba(212, 175, 55, 0.25)' },
  negotiating:       { en: 'Negotiating',      ar: 'جاري التفاوض',      color: '#E5B869', bg: 'rgba(229, 184, 105, 0.15)', border: 'rgba(229, 184, 105, 0.3)' },
  closed_won:        { en: 'Closed Won ✨',    ar: 'تم التعاقد ✨',      color: '#34D399', bg: 'rgba(16, 185, 129, 0.12)',  border: 'rgba(16, 185, 129, 0.25)' },
  closed_lost:       { en: 'Closed Lost',      ar: 'لم يتم التعاقد',    color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)',  border: 'rgba(148, 163, 184, 0.2)' },
};

const TYPE_ICONS: Record<string, { icon: any; labelEn: string; labelAr: string }> = {
  apartment: { icon: Building2, labelEn: 'Apartments', labelAr: 'شقق فاخرة' },
  villa:     { icon: Castle,     labelEn: 'Villas',     labelAr: 'قصور وفيلات' },
  townhouse: { icon: Home,       labelEn: 'Townhouses', labelAr: 'تاون هاوس' },
  chalet:    { icon: SunMedium,  labelEn: 'Chalets',    labelAr: 'شاليهات ساحلية' },
};

export default async function AdminDashboard({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';

  const [properties, leads] = await Promise.all([
    getAllPropertiesAdmin().catch(() => []),
    getAllLeads().catch(() => []),
  ]);

  const activeProperties = properties.filter((p) => p.listing_status === 'active');
  const activeCount   = activeProperties.length;
  const featuredCount = properties.filter((p) => p.is_featured).length;
  
  const staleLeads = leads.filter(isStale);
  const staleLeadsCount = staleLeads.length;
  const portfolioValue   = activeProperties.reduce((sum, p) => sum + Number(p.price_egp || 0), 0);
  const avgPropertyPrice = activeCount > 0 ? Math.round(portfolioValue / activeCount) : 0;

  // High Priority Strategic Advisory
  const advisories = generateStrategicAdvisories(properties, leads, isAr);
  const topAdvisory = advisories[0];

  const typeRollup = activeProperties.reduce((acc, p) => {
    const type = p.type || 'other';
    acc[type] = (acc[type] || 0) + Number(p.price_egp || 0);
    return acc;
  }, {} as Record<string, number>);

  const stageCounts = Object.keys(STAGE_CONFIG).reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => (l.stage || 'new') === stage).length;
    return acc;
  }, {} as Record<string, number>);

  const closedWonCount = stageCounts['closed_won'] || 0;
  const totalLeadsCount = leads.length;
  const conversionRate = totalLeadsCount > 0 ? Math.round((closedWonCount / totalLeadsCount) * 100) : 0;

  // Compute district capital distribution
  const districtRollup = activeProperties.reduce((acc, p) => {
    const loc = p.location || (isAr ? 'القاهرة الجديدة' : 'New Cairo');
    let distKey = 'New Cairo';
    if (loc.includes('Zayed') || loc.includes('زايد') || loc.includes('Allegria') || loc.includes('West')) {
      distKey = isAr ? 'الشيخ زايد وغرب القاهرة' : 'Sheikh Zayed & West Cairo';
    } else if (loc.includes('Sahel') || loc.includes('الساحل') || loc.includes('North Coast') || loc.includes('Ras El Hekma') || loc.includes('الحكمة')) {
      distKey = isAr ? 'الساحل الشمالي ورأس الحكمة' : 'North Coast & Ras El Hekma';
    } else if (loc.includes('Gouna') || loc.includes('الجونة') || loc.includes('Red Sea') || loc.includes('البحر الأحمر')) {
      distKey = isAr ? 'الجونة والبحر الأحمر' : 'El Gouna & Red Sea';
    } else {
      distKey = isAr ? 'القاهرة الجديدة والمربع الذهبي' : 'New Cairo & Golden Square';
    }

    if (!acc[distKey]) acc[distKey] = { units: 0, value: 0 };
    acc[distKey].units += 1;
    acc[distKey].value += Number(p.price_egp || 0);
    return acc;
  }, {} as Record<string, { units: number; value: number }>);

  // Recent 5 leads
  const recentLeads = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  // Top active properties
  const topProperties = [...activeProperties].slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif)" }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ─── 1. Executive Prestige Command Header ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.85))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid var(--admin-card-border, #CBD5E1)',
        boxShadow: 'var(--admin-card-shadow, 0 8px 32px rgba(0, 0, 0, 0.4))'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)', letterSpacing: '-0.02em' }}>
              {isAr ? 'مركز الإدارة والعمليات العقارية' : 'Executive Overview & Operations'}
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '9999px',
              background: 'rgba(229, 184, 105, 0.12)',
              color: 'var(--gold-primary, #E5B869)',
              border: '1px solid rgba(229, 184, 105, 0.3)'
            }}>
              {activeCount} {isAr ? 'عقار معروض للبيع' : 'Active Listed Estates'}
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--admin-text-muted, #475569)', marginTop: '4px', margin: '4px 0 0', fontWeight: 500 }}>
            {isAr
              ? 'متابعة حركة المبيعات، ومحفظة الأصول المعروضة، واستفسارات كبار العملاء المباشرة لفريد زكريا'
              : 'Sovereign portfolio valuation, live estate inventory, and high-intent buyer acquisition pipeline.'}
          </p>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href={`/${adminLocale}`}
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--admin-card-border, #CBD5E1)',
              color: 'var(--admin-text-body, #334155)',
              textDecoration: 'none',
              transition: 'all 150ms ease'
            }}
          >
            <ExternalLink size={13} />
            <span>{isAr ? 'عرض الموقع' : 'Live Platform'}</span>
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

      {/* ─── 2. Top 4 Prestige Key Performance Indicators (KPIs) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
        
        {/* KPI 1: Active Portfolio Valuation */}
        <div style={{
          background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
          backdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '16px 18px',
          border: '1px solid var(--admin-card-border, #CBD5E1)',
          boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'القيمة السوقية للمحفظة' : 'Active Portfolio Value'}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#C5A059', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={14} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--admin-text-title, #0F172A)',
                letterSpacing: '-0.02em'
              }}>
                {Number(portfolioValue).toLocaleString('en-US')}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--admin-gold-primary, #946F23)' }}>
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted, #475569)', margin: '3px 0 0', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span>{isAr ? 'متوسط الوحدة:' : 'Avg Listing:'}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--admin-text-title, #0F172A)' }}>
                {Number(avgPropertyPrice).toLocaleString('en-US')}
              </span>
              <span style={{ color: 'var(--admin-gold-primary, #946F23)', fontWeight: 700 }}>
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </p>
          </div>
        </div>

        {/* KPI 2: Active Inventory Status */}
        <Link
          href={`/admin/${adminLocale}/properties`}
          style={{
            background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1px solid var(--admin-card-border, #CBD5E1)',
            boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'border-color 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'المعروض النشط بالكتالوج' : 'Catalog Inventory'}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.05))', color: 'var(--admin-text-title, #FFFFFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={14} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)' }}>{activeCount}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted, #475569)' }}>{isAr ? 'عقار نشط' : 'Units'}</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--admin-gold-primary, #C5A059)', margin: '3px 0 0', fontWeight: 600 }}>
              {featuredCount} {isAr ? 'عقارات مميزة في الواجهة' : 'Featured Trophy Assets'}
            </p>
          </div>
        </Link>

        {/* KPI 3: Total Client Inquiries & Closed Deals */}
        <Link
          href={`/admin/${adminLocale}/leads`}
          style={{
            background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1px solid var(--admin-card-border, #CBD5E1)',
            boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'border-color 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'طلبات العملاء بالمحفظة' : 'Client Inquiries'}
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#C5A059', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={14} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)' }}>{totalLeadsCount}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted, #475569)' }}>{isAr ? 'طلب' : 'Inquiries'}</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--admin-success-text, #047857)', margin: '3px 0 0', fontWeight: 700 }}>
              {closedWonCount} {isAr ? 'عقود استحواذ ناجحة' : 'Closed Deals'} ({conversionRate}%)
            </p>
          </div>
        </Link>

        {/* KPI 4: Response SLA Health */}
        <div style={{
          background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
          backdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '16px 18px',
          border: staleLeadsCount > 0 ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid var(--admin-card-border, #CBD5E1)',
          boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--admin-text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAr ? 'كفاءة سرعة الاستجابة' : 'Response SLA'}
            </span>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: staleLeadsCount > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: staleLeadsCount > 0 ? '#FB7185' : '#34D399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {staleLeadsCount > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: staleLeadsCount > 0 ? '#FB7185' : '#34D399' }}>
                {staleLeadsCount > 0 ? `${staleLeadsCount}` : '100%'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted, #475569)' }}>
                {staleLeadsCount > 0 ? (isAr ? 'تتطلب رد >24h' : 'Pending >24h') : (isAr ? 'استجابة ممتازة' : 'Optimal')}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted, #475569)', margin: '3px 0 0', fontWeight: 500 }}>
              {staleLeadsCount > 0 ? (isAr ? 'يرجى التواصل مع العملاء المعلقين' : 'Follow up with pending leads') : (isAr ? 'زمن الاستجابة أقل من 12 ساعة' : 'All inquiries handled <12h')}
            </p>
          </div>
        </div>

      </div>

      {/* ─── 3. Strategic Executive Advisory Alert (Focused) ─── */}
      {topAdvisory && (
        <div style={{
          background: 'var(--admin-advisory-bg, #FFFFFF)',
          backdropFilter: 'blur(20px)',
          borderRadius: '14px',
          border: topAdvisory.severity === 'high' ? '1.5px solid rgba(244, 63, 94, 0.4)' : '1.5px solid var(--admin-advisory-border, #C5A059)',
          boxShadow: '0 4px 16px -2px rgba(197, 160, 89, 0.12), 0 1px 3px rgba(0, 0, 0, 0.04)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: topAdvisory.severity === 'high' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(229, 184, 105, 0.15)',
              color: topAdvisory.severity === 'high' ? '#FB7185' : '#C5A059',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Sparkles size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--admin-advisory-title, #0F172A)' }}>
                  {isAr ? topAdvisory.titleAr : topAdvisory.titleEn}
                </strong>
                {topAdvisory.metric && (
                  <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'rgba(197, 160, 89, 0.12)', color: 'var(--admin-gold-primary, #946F23)' }}>
                    {topAdvisory.metric}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--admin-advisory-text, #334155)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isAr ? topAdvisory.messageAr : topAdvisory.messageEn}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {topAdvisory.actionHref && (
              <Link
                href={topAdvisory.actionHref}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: topAdvisory.severity === 'high' ? '#FB7185' : 'var(--admin-gold-primary, #946F23)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'var(--admin-card-bg-subtle, #F8FAFC)',
                  border: '1px solid var(--admin-card-border, #CBD5E1)'
                }}
              >
                <span>{isAr ? topAdvisory.actionTextAr || 'متابعة الإجراء' : topAdvisory.actionTextEn || 'Take Action'}</span>
                <ArrowRight size={12} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ─── FIN-OS Executive Workstation Gateway ─── */}
      <div style={{
        background: 'var(--admin-card-bg, #FFFFFF)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid var(--admin-card-border, #D8D2C4)',
        boxShadow: 'var(--admin-card-shadow, 0 4px 20px rgba(0, 0, 0, 0.05))',
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(221, 167, 82, 0.2) 0%, rgba(148, 111, 35, 0.1) 100%)',
              border: '1px solid rgba(221, 167, 82, 0.4)',
              color: 'var(--admin-gold-primary, #946F23)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Landmark size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #0F172A)' }}>
                  {isAr ? 'محطة العمل المالية والمحاسبية FIN-OS' : 'FIN-OS Financial ERP Workstation'}
                </h2>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(221, 167, 82, 0.15)',
                  color: 'var(--admin-gold-primary, #946F23)',
                  border: '1px solid rgba(221, 167, 82, 0.35)'
                }}>
                  v2.4
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#047857',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}>
                  {isAr ? '● متصل بالدفتر العام' : '● Live Ledger Synced'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--admin-text-muted, #64748B)', margin: '3px 0 0', fontWeight: 500 }}>
                {isAr
                  ? 'إدارة متكاملة للخزينة والسيولة النقدية، دورة عقود البيع، أجندة الشيكات الآجلة، وتوزيعات أرباح الشركاء.'
                  : 'Sovereign financial engine for multi-tranche sales contracts, PDC lifecycle, and cash-gated equity distributions.'}
              </p>
            </div>
          </div>

          <Link
            href={`/fin-os/${adminLocale}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
              color: '#0A0C10',
              textDecoration: 'none',
              boxShadow: '0 3px 12px rgba(221, 167, 82, 0.25)',
              transition: 'all 150ms ease'
            }}
          >
            <span>{isAr ? 'فتح محطة FIN-OS الكاملة' : 'Launch Full FIN-OS'}</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Quick Module Launch Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          paddingTop: '8px',
          borderTop: '1px solid var(--admin-card-border, #D8D2C4)'
        }}>
          <Link
            href={`/fin-os/${adminLocale}?tab=operations`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'var(--admin-card-bg-subtle, #F8FAFC)',
              border: '1px solid var(--admin-card-border, #D8D2C4)',
              color: 'var(--admin-text-title, #0F172A)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
            <span>{isAr ? 'الخزينة والعمليات' : 'Treasury & Ops'}</span>
            <ArrowRight size={13} style={{ marginInlineStart: 'auto', color: 'var(--admin-gold-primary, #946F23)', transform: isAr ? 'scaleX(-1)' : 'none' }} />
          </Link>

          <Link
            href={`/fin-os/${adminLocale}?tab=contracts`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'var(--admin-card-bg-subtle, #F8FAFC)',
              border: '1px solid var(--admin-card-border, #D8D2C4)',
              color: 'var(--admin-text-title, #0F172A)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} />
            <span>{isAr ? 'عقود البيع والعملاء' : 'Contracts & Sales'}</span>
            <ArrowRight size={13} style={{ marginInlineStart: 'auto', color: 'var(--admin-gold-primary, #946F23)', transform: isAr ? 'scaleX(-1)' : 'none' }} />
          </Link>

          <Link
            href={`/fin-os/${adminLocale}?tab=pdc`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'var(--admin-card-bg-subtle, #F8FAFC)',
              border: '1px solid var(--admin-card-border, #D8D2C4)',
              color: 'var(--admin-text-title, #0F172A)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
            <span>{isAr ? 'أجندة الشيكات والأقساط' : 'PDC & Due Cheques'}</span>
            <ArrowRight size={13} style={{ marginInlineStart: 'auto', color: 'var(--admin-gold-primary, #946F23)', transform: isAr ? 'scaleX(-1)' : 'none' }} />
          </Link>

          <Link
            href={`/fin-os/${adminLocale}?tab=ledger`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'var(--admin-card-bg-subtle, #F8FAFC)',
              border: '1px solid var(--admin-card-border, #D8D2C4)',
              color: 'var(--admin-text-title, #0F172A)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B5CF6' }} />
            <span>{isAr ? 'الدفتر العام واليومية' : 'General Ledger'}</span>
            <ArrowRight size={13} style={{ marginInlineStart: 'auto', color: 'var(--admin-gold-primary, #946F23)', transform: isAr ? 'scaleX(-1)' : 'none' }} />
          </Link>
        </div>
      </div>

      {/* ─── 4. Live Inquiries & Portfolio Inventory ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        
        {/* Left: Recent Inbound Client Inquiries */}
        <div style={{
          background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid var(--admin-card-border, #CBD5E1)',
          boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C5A059' }} />
              <h2 style={{ fontSize: '14.5px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)' }}>
                {isAr ? 'أحدث استفسارات العملاء الواردة' : 'Recent Inbound Acquisition Leads'}
              </h2>
            </div>
            <Link
              href={`/admin/${adminLocale}/leads`}
              style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--admin-gold-primary, #C5A059)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>{isAr ? 'فتح CRM بالكامل' : 'View CRM'}</span>
              <ArrowRight size={12} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--admin-text-muted, #475569)', border: '1px dashed var(--admin-card-border, #CBD5E1)', borderRadius: '12px', fontSize: '12.5px' }}>
              {isAr ? 'لا توجد استفسارات عملاء جديدة حالياً' : 'No recent client inquiries found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentLeads.map((lead) => {
                const stageInfo = STAGE_CONFIG[lead.stage || 'new'] || STAGE_CONFIG.new;
                const initials = lead.name ? lead.name.slice(0, 2).toUpperCase() : 'CL';
                const cleanPhone = (lead.phone || '').replace(/[^0-9+]/g, '');
                const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                  isAr 
                    ? `أهلاً بك ${lead.name}، معك المكتب العقاري الخاص لفريد زكريا بخصوص استفسارك.`
                    : `Hello ${lead.name}, this is Farid Zakaria Private Client Office regarding your inquiry.`
                )}`;

                return (
                  <div
                    key={lead.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.02))',
                      border: '1px solid var(--admin-card-border-subtle, #CBD5E1)',
                      borderRadius: '10px',
                      transition: 'all 150ms ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(229, 184, 105, 0.12)',
                        color: 'var(--admin-gold-primary, #C5A059)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 800,
                        flexShrink: 0,
                        border: '1px solid rgba(229, 184, 105, 0.25)'
                      }}>
                        {initials}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '12.5px', color: 'var(--admin-text-title, #FFFFFF)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.name}
                          </strong>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: stageInfo.color,
                            background: stageInfo.bg,
                            border: `1px solid ${stageInfo.border}`
                          }}>
                            {isAr ? stageInfo.ar : stageInfo.en}
                          </span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: 'var(--admin-text-muted, #475569)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.property?.title_en || lead.property?.title_ar || (isAr ? 'استفسار عام' : 'General Inquiry')}
                          <span style={{ margin: '0 4px', color: 'var(--admin-divider, #CBD5E1)' }}>•</span>
                          <span style={{ color: 'var(--admin-text-body, #334155)', fontWeight: 600 }}>{formatTimeAgo(lead.created_at)}</span>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      {cleanPhone && (
                        <>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'var(--admin-success-bg, rgba(4, 120, 87, 0.08))',
                              border: '1px solid var(--admin-success-border, rgba(4, 120, 87, 0.25))',
                              color: 'var(--admin-success-text, #047857)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="WhatsApp"
                          >
                            <MessageCircle size={12} />
                          </a>
                          <a
                            href={`tel:${cleanPhone}`}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.04))',
                              border: '1px solid var(--admin-card-border, #CBD5E1)',
                              color: 'var(--admin-text-body, #334155)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Call Phone"
                          >
                            <Phone size={12} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Portfolio Estates Inventory Quick Access */}
        <div style={{
          background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid var(--admin-card-border, #CBD5E1)',
          boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C5A059' }} />
              <h2 style={{ fontSize: '14.5px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)' }}>
                {isAr ? 'محفظة العقارات الفاخرة' : 'Active Sovereign Inventory'}
              </h2>
            </div>
            <Link
              href={`/admin/${adminLocale}/properties`}
              style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--admin-gold-primary, #C5A059)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>{isAr ? 'إدارة الكتالوج' : 'All Properties'}</span>
              <ArrowRight size={12} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topProperties.map((prop) => {
              const photo = prop.property_images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';
              const title = isAr ? prop.title_ar || prop.title_en : prop.title_en;

              return (
                <div
                  key={prop.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.02))',
                    border: '1px solid var(--admin-card-border-subtle, #CBD5E1)',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <strong style={{ fontSize: '12.5px', color: 'var(--admin-text-title, #FFFFFF)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--admin-gold-primary, #C5A059)', fontWeight: 700 }}>
                        {formatPrice(prop.price_egp, adminLocale)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <Link
                      href={`/admin/${adminLocale}/properties/${prop.id}/edit`}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: 'rgba(229, 184, 105, 0.12)',
                        border: '1px solid rgba(229, 184, 105, 0.25)',
                        color: 'var(--admin-gold-primary, #C5A059)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={isAr ? 'تعديل' : 'Edit'}
                    >
                      <Pencil size={11} />
                    </Link>
                    {prop.slug && (
                      <Link
                        href={`/${adminLocale}/properties/${prop.slug}`}
                        target="_blank"
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.04))',
                          border: '1px solid var(--admin-card-border, #CBD5E1)',
                          color: 'var(--admin-text-body, #334155)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={isAr ? 'معاينة' : 'Preview'}
                      >
                        <ExternalLink size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ─── 5. Pipeline Conversion Funnel & Capital Distribution ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Deal Progression Funnel */}
        <div style={{
          background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid var(--admin-card-border, #CBD5E1)',
          boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)' }}>
              {isAr ? 'مسار تقدم الصفقات والمفاوضات' : 'Deal Progression Funnel'}
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-success-text, #047857)' }}>
              {conversionRate}% {isAr ? 'نسبة الإغلاق' : 'Win Rate'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['new', 'contacted', 'viewing_scheduled', 'negotiating', 'closed_won'].map((stageKey) => {
              const info = STAGE_CONFIG[stageKey];
              const count = stageCounts[stageKey] || 0;
              const pct = totalLeadsCount > 0 ? Math.round((count / totalLeadsCount) * 100) : 0;

              return (
                <div key={stageKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--admin-text-body, #334155)', fontWeight: 600 }}>
                      {isAr ? info.ar : info.en}
                    </span>
                    <strong style={{ color: info.color }}>
                      {count} ({pct}%)
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--admin-track-bg, #E2E8F0)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(count > 0 ? 6 : 0, pct)}%`, height: '100%', background: info.color, borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Capital Allocation */}
        <div style={{
          background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid var(--admin-card-border, #CBD5E1)',
          boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)' }}>
              {isAr ? 'توزيع القيمة حسب المناطق' : 'Regional Capital Allocation'}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--admin-gold-primary, #C5A059)', fontWeight: 700 }}>
              {Object.keys(districtRollup).length} {isAr ? 'مناطق رئيسية' : 'Districts'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(districtRollup).map(([district, data]) => {
              const pct = portfolioValue > 0 ? Math.round((data.value / portfolioValue) * 100) : 0;

              return (
                <div key={district} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--admin-text-body, #334155)', fontWeight: 600 }}>
                      {district} ({data.units} {isAr ? 'وحدات' : 'Units'})
                    </span>
                    <strong style={{ color: 'var(--admin-gold-primary, #C5A059)' }}>
                      {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { notation: 'compact' }).format(data.value)} EGP ({pct}%)
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--admin-track-bg, #E2E8F0)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(4, pct)}%`, height: '100%', background: 'linear-gradient(90deg, #C5A059, #E5B869)', borderRadius: '9999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Typology Capital Rollup */}
        <div style={{
          background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid var(--admin-card-border, #CBD5E1)',
          boxShadow: 'var(--admin-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05))',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)' }}>
              {isAr ? 'الأنماط المعمارية والقيمة' : 'Typology Capital Rollup'}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--admin-gold-primary, #C5A059)', fontWeight: 700 }}>
              {Object.keys(typeRollup).length} {isAr ? 'أنماط' : 'Types'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(typeRollup).map(([type, val]) => {
              const meta = TYPE_ICONS[type] || { labelEn: type, labelAr: type, icon: Building2 };
              const Icon = meta.icon;
              const pct = portfolioValue > 0 ? Math.round((val / portfolioValue) * 100) : 0;

              return (
                <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--admin-text-title, #FFFFFF)', fontWeight: 700 }}>
                      <Icon size={12} style={{ color: 'var(--admin-gold-primary, #C5A059)' }} />
                      <span>{isAr ? meta.labelAr : meta.labelEn}</span>
                    </span>
                    <strong style={{ color: 'var(--admin-text-title, #FFFFFF)' }}>
                      {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { notation: 'compact' }).format(val)} EGP ({pct}%)
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--admin-track-bg, #E2E8F0)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(4, pct)}%`, height: '100%', background: 'linear-gradient(90deg, #E5B869, #C5A059)', borderRadius: '9999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
