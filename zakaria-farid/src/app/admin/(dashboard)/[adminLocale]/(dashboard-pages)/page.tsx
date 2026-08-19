import { getAllPropertiesAdmin, getAllLeads } from '@/lib/supabase/queries';
import Link from 'next/link';
import {
  Building2, Users, TrendingUp, Plus, Crown, AlertTriangle,
  Sparkles, CheckCircle2, ArrowRight, DollarSign, PieChart, Clock, MessageCircle, Home, Castle, SunMedium, ShieldCheck, Compass, Eye
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
  new:               { en: 'New Inquiries',    ar: 'طلبات جديدة',       color: '#38BDF8' },
  contacted:         { en: 'Contacted',        ar: 'تم التواصل',        color: '#A855F7' },
  viewing_scheduled: { en: 'Viewing Scheduled',ar: 'معاينة مجدولة',     color: '#DDA752' },
  negotiating:       { en: 'Negotiating',      ar: 'جاري التفاوض',       color: '#FB923C' },
  closed_won:        { en: 'Closed Won ✨',    ar: 'تم التعاقد ✨',       color: '#10B981' },
  closed_lost:       { en: 'Closed Lost',      ar: 'لم يتم التعاقد',     color: '#F87171' },
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
      label:     isAr ? 'إجمالي المحفظة' : 'Total Inventory',
      value:     properties.length,
      icon:      Building2,
      color:     '#DDA752',
      bg:        'rgba(221, 167, 82, 0.12)',
      borderColor: 'rgba(221, 167, 82, 0.25)',
      trend:     isAr ? 'المحفظة' : 'Inventory',
      href:      `/admin/${adminLocale}/properties`,
    },
    {
      label:     isAr ? 'المعروض حالياً' : 'Active Listings',
      value:     activeCount,
      icon:      TrendingUp,
      color:     '#10B981',
      bg:        'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
      trend:     isAr ? 'نشط' : 'Live',
      href:      `/admin/${adminLocale}/properties`,
    },
    {
      label:     isAr ? 'المميزة بالواجهة' : 'Featured Mansions',
      value:     featuredCount,
      icon:      Crown,
      color:     '#F59E0B',
      bg:        'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.25)',
      trend:     isAr ? 'الواجهة' : 'Featured',
      href:      `/admin/${adminLocale}/properties`,
    },
    {
      label:     isAr ? 'طلبات العملاء' : 'Total Inquiries',
      value:     totalLeadsCount,
      icon:      Users,
      color:     '#38BDF8',
      bg:        'rgba(56, 189, 248, 0.12)',
      borderColor: 'rgba(56, 189, 248, 0.25)',
      trend:     isAr ? 'الطلبات' : 'Pipeline',
      href:      `/admin/${adminLocale}/leads`,
    },
    {
      label:     isAr ? 'تتطلب استجابة' : 'Needs Response',
      value:     staleLeadsCount,
      icon:      staleLeadsCount > 0 ? AlertTriangle : ShieldCheck,
      color:     staleLeadsCount > 0 ? '#F87171' : '#10B981',
      bg:        staleLeadsCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
      borderColor: staleLeadsCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.25)',
      trend:     staleLeadsCount > 0 ? '>24h' : 'Optimal',
      href:      `/admin/${adminLocale}/leads`,
      urgent:    staleLeadsCount > 0,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Executive Command Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: 'rgba(13, 19, 34, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '20px 28px',
        borderRadius: '20px',
        border: '1px solid rgba(221, 167, 82, 0.22)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {isAr ? 'لوحة القيادة المركزية' : 'Executive Command Center'}
            </h1>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(221, 167, 82, 0.15)', color: '#DDA752', border: '1px solid rgba(221, 167, 82, 0.3)' }}>
              {activeCount} {isAr ? 'عقار معروض للبيع' : 'Active Units'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px', margin: 0 }}>
            {isAr
              ? 'مراقبة حركة المبيعات، وتوزيع استجابة العملاء، والقيمة السوقية لمحفظة العقارات الفاخرة'
              : 'Real-time sales velocity, lead response priorities & luxury portfolio valuation.'}
          </p>
        </div>

        <Link
          href={`/admin/${adminLocale}/properties/new`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 20px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
            color: '#0A0E18',
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(221, 167, 82, 0.35)',
            transition: 'all 150ms ease'
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{isAr ? 'إدراج عقار جديد' : 'Add New Property'}</span>
        </Link>
      </div>

      {/* 5 Compact Executive Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {stats.map(({ label, value, icon: Icon, color, bg, borderColor, trend, href, urgent }) => (
          <Link
            key={label}
            href={href}
            style={{
              background: 'rgba(13, 19, 34, 0.75)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '16px 18px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              border: `1px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 150ms ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: bg, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={20} strokeWidth={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: color,
                  lineHeight: 1,
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}>
                  {value}
                </p>
                <p style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px', fontWeight: 600, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </p>
              </div>
            </div>

            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              color: urgent ? '#F87171' : '#DDA752',
              background: urgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(221, 167, 82, 0.12)',
              border: `1px solid ${urgent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(221, 167, 82, 0.25)'}`,
              padding: '3px 7px',
              borderRadius: '6px',
              flexShrink: 0
            }}>
              {trend}
            </span>
          </Link>
        ))}
      </div>

      {/* Middle Section: Active Portfolio Valuation & Pipeline Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '18px' }}>
        
        {/* Active Portfolio Valuation Card */}
        <div style={{
          background: 'rgba(13, 19, 34, 0.75)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(221, 167, 82, 0.2)',
          borderTop: '3px solid #DDA752',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(221, 167, 82, 0.15)', color: '#DDA752', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={18} strokeWidth={2.5} />
                </div>
                <h2 style={{ fontWeight: 800, fontSize: '16px', margin: 0, color: '#FFFFFF' }}>
                  {isAr ? 'القيمة السوقية للمحفظة المعروضة' : 'Active Portfolio Valuation'}
                </h2>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#DDA752', background: 'rgba(221, 167, 82, 0.1)', border: '1px solid rgba(221, 167, 82, 0.25)', padding: '3px 9px', borderRadius: '8px' }}>
                {activeCount} {isAr ? 'عقار نشط' : 'Active Units'}
              </span>
            </div>

            {/* Price Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(221, 167, 82, 0.08) 0%, rgba(10, 14, 24, 0.6) 100%)',
              border: '1px solid rgba(221, 167, 82, 0.3)',
              borderRadius: '16px',
              padding: '18px 22px',
              margin: '12px 0'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#DDA752', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '4px' }}>
                {isAr ? 'القيمة السوقية الإجمالية الحالية' : 'TOTAL LISTED MARKET VALUE'}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#DDA752' }}>EGP</span>
                <span style={{ fontSize: '34px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
                  {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 0 }).format(portfolioValue)}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', margin: '4px 0 0', fontWeight: 500 }}>
                {isAr ? `متوسط قيمة العقار: ${new Intl.NumberFormat('en-EG', { notation: 'compact' }).format(avgPropertyPrice)} EGP` : `Average Listing Price: ${new Intl.NumberFormat('en-EG', { notation: 'compact' }).format(avgPropertyPrice)} EGP across live inventory.`}
              </p>
            </div>
          </div>

          {/* 4 Property Type Micro-Cards */}
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {isAr ? 'توزيع المحفظة حسب التصنيف المعماري' : 'Portfolio Value by Property Typology'}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px' }}>
              {Object.entries(typeRollup).map(([typeKey, val]) => {
                const conf = TYPE_ICONS[typeKey] || { icon: Building2, labelEn: typeKey, labelAr: typeKey };
                const Icon = conf.icon;
                return (
                  <div key={typeKey} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    textAlign: 'center'
                  }}>
                    <Icon size={14} style={{ color: '#DDA752', margin: '0 auto 4px', display: 'block' }} />
                    <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', display: 'block', fontWeight: 600 }}>
                      {isAr ? conf.labelAr : conf.labelEn}
                    </span>
                    <strong style={{ fontSize: '11.5px', color: '#FFFFFF', display: 'block', marginTop: '2px' }}>
                      {new Intl.NumberFormat('en-EG', { notation: 'compact' }).format(val)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lead Pipeline Conversion Funnel Card */}
        <div style={{
          background: 'rgba(13, 19, 34, 0.75)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(221, 167, 82, 0.2)',
          borderTop: '3px solid #38BDF8',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PieChart size={18} strokeWidth={2.5} />
                </div>
                <h2 style={{ fontWeight: 800, fontSize: '16px', margin: 0, color: '#FFFFFF' }}>
                  {isAr ? 'مؤشرات قمع المبيعات (CRM)' : 'Sales Funnel & Conversion'}
                </h2>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '3px 9px', borderRadius: '8px' }}>
                {conversionRate}% {isAr ? 'نسبة الإغلاق' : 'Win Rate'}
              </span>
            </div>

            {/* Stages Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(STAGE_LABELS).map(([stageKey, data]) => {
                const count = stageCounts[stageKey] || 0;
                const pct = totalLeadsCount > 0 ? Math.round((count / totalLeadsCount) * 100) : 0;
                return (
                  <div key={stageKey} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: isAr ? '90px' : '110px', fontSize: '11.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.75)', flexShrink: 0 }}>
                      {isAr ? data.ar : data.en}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: data.color, borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ width: '28px', fontSize: '11.5px', fontWeight: 800, color: data.color, textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)' }}>
              {isAr ? `إجمالي العملاء المسجلين: ${totalLeadsCount}` : `Total Inquiries: ${totalLeadsCount}`}
            </span>
            <Link href={`/admin/${adminLocale}/leads`} style={{ fontSize: '12px', fontWeight: 800, color: '#DDA752', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>{isAr ? 'عرض خط الأنابيب ←' : 'Open Pipeline →'}</span>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
