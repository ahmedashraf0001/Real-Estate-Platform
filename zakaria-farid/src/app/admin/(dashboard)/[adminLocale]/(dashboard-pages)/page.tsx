import { getAllPropertiesAdmin, getAllLeads } from '@/lib/supabase/queries';
import Link from 'next/link';
import {
  Building2, Users, TrendingUp, Plus, Crown, AlertTriangle,
  Sparkles, CheckCircle2, ArrowRight, DollarSign, PieChart, Clock, MessageCircle, Home, Castle, SunMedium, ShieldCheck
} from 'lucide-react';

interface Props {
  params: Promise<{ adminLocale: string }>;
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

const STAGE_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  new:               { en: 'New Inquiries',    ar: 'طلبات جديدة',       color: '#2563EB' },
  contacted:         { en: 'Contacted',        ar: 'تم التواصل',        color: '#7C3AED' },
  viewing_scheduled: { en: 'Viewing Scheduled',ar: 'معاينة مجدولة',     color: '#D97706' },
  negotiating:       { en: 'Negotiating',      ar: 'جاري التفاوض',       color: '#EA580C' },
  closed_won:        { en: 'Closed Won',       ar: 'تم التعاقد ✨',       color: '#059669' },
  closed_lost:       { en: 'Closed Lost',      ar: 'لم يتم التعاقد',     color: '#DC2626' },
};

const TYPE_ICONS: Record<string, { icon: any; labelEn: string; labelAr: string }> = {
  apartment: { icon: Building2, labelEn: 'Apartments', labelAr: 'شقق' },
  villa:     { icon: Castle,     labelEn: 'Villas',     labelAr: 'فيلات' },
  townhouse: { icon: Home,       labelEn: 'Townhouses', labelAr: 'تاون هاوس' },
  chalet:    { icon: SunMedium,  labelEn: 'Chalets',    labelAr: 'شاليهات' },
};

export default async function AdminDashboard({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';

  const [properties, leads] = await Promise.all([
    getAllPropertiesAdmin().catch(() => []),
    getAllLeads().catch(() => []),
  ]);

  const activeCount   = properties.filter((p) => p.listing_status === 'active').length;
  const featuredCount = properties.filter((p) => p.is_featured).length;
  
  const staleLeadsCount = leads.filter(isStale).length;
  const staleLeadsList  = leads.filter(isStale).slice(0, 4);

  const activeProperties = properties.filter((p) => p.listing_status === 'active');
  const portfolioValue   = activeProperties.reduce((sum, p) => sum + Number(p.price_egp || 0), 0);
  const avgPropertyPrice = activeCount > 0 ? Math.round(portfolioValue / activeCount) : 0;

  const typeRollup = activeProperties.reduce((acc, p) => {
    const type = p.type || 'other';
    acc[type] = (acc[type] || 0) + Number(p.price_egp || 0);
    return acc;
  }, {} as Record<string, number>);

  const stageCounts = Object.keys(STAGE_LABELS).reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => (l.stage || 'new') === stage).length;
    return acc;
  }, {} as Record<string, number>);

  const closedWonCount = stageCounts['closed_won'] || 0;
  const totalLeadsCount = leads.length;
  const conversionRate = totalLeadsCount > 0 ? Math.round((closedWonCount / totalLeadsCount) * 100) : 0;

  const stats = [
    {
      label:     isAr ? 'إجمالي العقارات' : 'Total Properties',
      value:     properties.length,
      icon:      Building2,
      color:     '#1E4D3D',
      bg:        'rgba(30, 77, 61, 0.06)',
      borderColor: '#E2E8F0',
      trend:     isAr ? 'المحفظة' : 'Inventory',
      href:      `/admin/${adminLocale}/properties`,
    },
    {
      label:     isAr ? 'المعروض حالياً' : 'Active Listings',
      value:     activeCount,
      icon:      TrendingUp,
      color:     '#059669',
      bg:        'rgba(5, 150, 105, 0.06)',
      borderColor: '#E2E8F0',
      trend:     isAr ? 'نشط' : 'Live',
      href:      `/admin/${adminLocale}/properties`,
    },
    {
      label:     isAr ? 'المميزة بالواجهة' : 'Featured Properties',
      value:     featuredCount,
      icon:      Crown,
      color:     '#D97706',
      bg:        'rgba(217, 119, 6, 0.06)',
      borderColor: '#E2E8F0',
      trend:     isAr ? 'الواجهة' : 'Featured',
      href:      `/admin/${adminLocale}/properties`,
    },
    {
      label:     isAr ? 'إجمالي الطلبات' : 'Total Leads',
      value:     totalLeadsCount,
      icon:      Users,
      color:     '#2563EB',
      bg:        'rgba(37, 99, 235, 0.06)',
      borderColor: '#E2E8F0',
      trend:     isAr ? 'الطلبات' : 'Pipeline',
      href:      `/admin/${adminLocale}/leads`,
    },
    {
      label:     isAr ? 'تتطلب متابعة' : 'Needs Attention',
      value:     staleLeadsCount,
      icon:      staleLeadsCount > 0 ? AlertTriangle : ShieldCheck,
      color:     staleLeadsCount > 0 ? '#DC2626' : '#059669',
      bg:        staleLeadsCount > 0 ? '#FEF2F2' : '#ECFDF5',
      borderColor: staleLeadsCount > 0 ? '#FCA5A5' : '#A7F3D0',
      trend:     staleLeadsCount > 0 ? '>24h' : 'Optimal',
      href:      `/admin/${adminLocale}/leads`,
      urgent:    staleLeadsCount > 0,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Executive Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: '#FFFFFF',
        padding: '16px 22px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", fontSize: '22px', fontWeight: 800, margin: 0, color: '#1E4D3D', letterSpacing: isAr ? 'normal' : '-0.02em' }}>
              {isAr ? 'لوحة قيادة الأعمال' : 'Executive Command Center'}
            </h1>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              {activeCount} {isAr ? 'عقار نشط' : 'Active Units'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', margin: 0 }}>
            {isAr
              ? 'نظرة شمولية على المبيعات، ومراقبة أولوية الاستجابة، وقيمة المحفظة العقارية'
              : 'Real-time sales velocity, lead response priorities & active portfolio valuation.'}
          </p>
        </div>

        <Link
          href={`/admin/${adminLocale}/properties/new`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            background: '#1E4D3D',
            color: '#FFFFFF',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(30,77,61,0.2)',
            transition: 'all 150ms ease'
          }}
        >
          <Plus size={15} />
          <span>{isAr ? 'إضافة عقار جديد' : 'Add New Property'}</span>
        </Link>
      </div>

      {/* 5 Compact Executive Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '12px' }}>
        {stats.map(({ label, value, icon: Icon, color, bg, borderColor, trend, href, urgent }) => (
          <Link
            key={label}
            href={href}
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              border: `1px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 150ms ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: bg, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={18} strokeWidth={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: color,
                  lineHeight: 1,
                  margin: 0,
                  fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: isAr ? 'normal' : '-0.02em'
                }}>
                  {value}
                </p>
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', fontWeight: 600, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </p>
              </div>
            </div>

            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              color: urgent ? '#DC2626' : '#64748B',
              background: urgent ? '#FEE2E2' : '#F1F5F9',
              padding: '2px 6px',
              borderRadius: '6px',
              flexShrink: 0
            }}>
              {trend}
            </span>
          </Link>
        ))}
      </div>

      {/* Middle Section: Active Portfolio Valuation & Pipeline Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '16px' }}>
        
        {/* Active Portfolio Valuation Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          border: '1px solid #E2E8F0',
          borderTop: '3px solid #C9A96A',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(201, 169, 106, 0.12)', color: '#C9A96A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={16} />
                </div>
                <h2 style={{ fontWeight: 800, fontSize: '15px', margin: 0, fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", color: '#1E4D3D' }}>
                  {isAr ? 'إجمالي قيمة المحفظة العقارية المعروضة' : 'Active Portfolio Inventory Value'}
                </h2>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#1E4D3D', background: '#F1F5F9', padding: '3px 8px', borderRadius: '6px' }}>
                {activeCount} {isAr ? 'عقار متاح' : 'Active Units'}
              </span>
            </div>

            {/* Price Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30,77,61,0.03) 0%, rgba(201,169,106,0.06) 100%)',
              border: '1px solid rgba(201,169,106,0.2)',
              borderRadius: '12px',
              padding: '14px 18px',
              margin: '10px 0'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#C9A96A', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>
                {isAr ? 'القيمة السوقية الإجمالية' : 'TOTAL LISTED MARKET VALUE'}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#C9A96A' }}>EGP</span>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#1E4D3D', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em' }}>
                  {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 0 }).format(portfolioValue)}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0', fontWeight: 500 }}>
                {isAr ? `متوسط قيمة العقار: ${new Intl.NumberFormat('en-EG', { notation: 'compact' }).format(avgPropertyPrice)} EGP` : `Average Listing Price: ${new Intl.NumberFormat('en-EG', { notation: 'compact' }).format(avgPropertyPrice)} EGP across live inventory.`}
              </p>
            </div>
          </div>

          {/* 4 Property Type Micro-Cards */}
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isAr ? 'توزيع المحفظة حسب نوع العقار' : 'Portfolio Value by Property Type'}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {Object.entries(typeRollup).map(([typeKey, val]) => {
                const typeInfo = TYPE_ICONS[typeKey] || { icon: Building2, labelEn: typeKey, labelAr: typeKey };
                const TypeIcon = typeInfo.icon;
                const pct = portfolioValue > 0 ? Math.round((val / portfolioValue) * 100) : 0;

                return (
                  <div key={typeKey} style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1E4D3D' }}>
                      <TypeIcon size={14} />
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748B' }}>{pct}%</span>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                        {isAr ? typeInfo.labelAr : typeInfo.labelEn}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E4D3D', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>
                        {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { notation: 'compact', compactDisplay: 'short' }).format(val)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pipeline Funnel & Conversion Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          border: '1px solid #E2E8F0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(30, 77, 61, 0.08)', color: '#1E4D3D', display: 'center', alignItems: 'center', justifyContent: 'center' }}>
                  <PieChart size={16} />
                </div>
                <h2 style={{ fontWeight: 800, fontSize: '15px', margin: 0, fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", color: '#1E4D3D' }}>
                  {isAr ? 'معدل التحول ومراحل الصف' : 'Pipeline Funnel & Conversion'}
                </h2>
              </div>
              <Link
                href={`/admin/${adminLocale}/leads`}
                style={{ fontSize: '11px', color: '#1E4D3D', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px' }}
              >
                <span>{isAr ? 'فتح اللوحة' : 'Open Pipeline'}</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {/* Performance Win Rate Gauge Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '12px'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                  {isAr ? 'نسبة التعاقد الناجح' : 'LEAD WIN CONVERSION RATE'}
                </span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#1E4D3D', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>
                  {conversionRate}%
                </span>
              </div>
              <div style={{ textAlign: isAr ? 'left' : 'right', fontSize: '11px', color: '#64748B' }}>
                <strong style={{ color: '#059669' }}>{closedWonCount}</strong> {isAr ? 'صفقة من إجمالي' : 'Closed Won out of'} <strong style={{ color: '#1E4D3D' }}>{totalLeadsCount}</strong> {isAr ? 'طلب' : 'Leads'}
              </div>
            </div>

            {/* Compact Progress Meters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(STAGE_LABELS).map(([stageKey, cfg]) => {
                const count = stageCounts[stageKey] || 0;
                const pct = totalLeadsCount > 0 ? Math.round((count / totalLeadsCount) * 100) : 0;

                return (
                  <div key={stageKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{isAr ? cfg.ar : cfg.en}</span>
                      <span style={{ fontWeight: 700, color: cfg.color }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: '3px', transition: 'width 300ms ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Beautiful Response Priority & Recent Properties */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Beautiful Response Priority Status Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 18px',
            background: staleLeadsCount > 0 ? '#FEF2F2' : '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {staleLeadsCount > 0 ? (
                <AlertTriangle size={17} style={{ color: '#DC2626' }} />
              ) : (
                <ShieldCheck size={17} style={{ color: '#059669' }} />
              )}
              <h2 style={{ fontWeight: 800, fontSize: '14px', margin: 0, color: staleLeadsCount > 0 ? '#991B1B' : '#1E4D3D', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>
                {isAr ? 'أولوية استجابة المبيعات' : 'Lead Response Priority Status'}
              </h2>
            </div>

            <Link href={`/admin/${adminLocale}/leads`} style={{ fontSize: '11px', color: staleLeadsCount > 0 ? '#DC2626' : '#1E4D3D', fontWeight: 700, textDecoration: 'none' }}>
              {isAr ? 'متابعة اللوحة ←' : 'Open Pipeline →'}
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {staleLeadsList.map((lead, i) => (
              <div
                key={lead.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '12px 18px',
                  borderBottom: i < staleLeadsList.length - 1 ? '1px solid #F1F5F9' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: '#FEE2E2', color: '#DC2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 800, flexShrink: 0
                  }}>
                    {lead.name ? lead.name.slice(0, 2).toUpperCase() : 'LD'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#1E293B', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>{lead.name}</p>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '1px 0 0' }}>{lead.phone}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', borderRadius: '6px', padding: '5px 12px', background: '#10B981', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700 }}
                  >
                    <MessageCircle size={12} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}

            {staleLeadsList.length === 0 && (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#065F46', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={18} />
                </div>
                <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <strong style={{ fontSize: '13px', color: '#065F46', display: 'block', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>
                    {isAr ? 'استجابة المبيعات ممتازة' : 'Response Speed Optimal'}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {isAr ? 'جميع الطلبات تم التعامل معها في الوقت المحدد.' : 'All customer inquiries have been contacted within 24 hours.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Inventory Properties */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 18px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={17} style={{ color: '#1E4D3D' }} />
              <h2 style={{ fontWeight: 800, fontSize: '14px', margin: 0, color: '#1E4D3D', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>
                {isAr ? 'أحدث العقارات في القائمة' : 'Recent Inventory Properties'}
              </h2>
            </div>
            <Link href={`/admin/${adminLocale}/properties`} style={{ fontSize: '11px', color: '#1E4D3D', fontWeight: 700, textDecoration: 'none' }}>
              {isAr ? 'عرض الكل ←' : 'View all →'}
            </Link>
          </div>

          <div>
            {properties.slice(0, 4).map((p, i) => (
              <Link
                key={p.id}
                href={`/admin/${adminLocale}/properties/${p.id}/edit`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '12px 18px',
                  borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", color: '#1E293B' }}>
                    {isAr && p.title_ar ? p.title_ar : p.title_en}
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                    {p.location} • {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { notation: 'compact' }).format(Number(p.price_egp || 0))} EGP
                  </p>
                </div>
                <span className="badge badge-active" style={{ flexShrink: 0, fontSize: '10px', textTransform: 'capitalize' }}>
                  {p.listing_status}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
