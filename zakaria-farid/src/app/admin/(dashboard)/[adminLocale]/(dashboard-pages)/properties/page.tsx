import { getAllPropertiesAdmin } from '@/lib/supabase/queries';
import Link from 'next/link';
import { Plus, Pencil, Paintbrush, Sofa, Eye, Building2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export default async function AdminPropertiesPage({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  const properties = await getAllPropertiesAdmin().catch(() => []);

  const STATUS_BADGE: Record<string, string> = {
    active: 'badge badge-active',
    under_offer: 'badge badge-offer',
    sold: 'badge badge-sold',
  };

  const statusLabel: Record<string, string> = {
    active: isAr ? 'متاح' : 'Active',
    under_offer: isAr ? 'تحت العرض' : 'Under Offer',
    sold: isAr ? 'مُباع' : 'Sold',
  };


  const typeLabel: Record<string, string> = {
    villa: isAr ? 'فيلا' : 'Villa',
    apartment: isAr ? 'شقة' : 'Apartment',
    townhouse: isAr ? 'تاون هاوس' : 'Townhouse',
    duplex: isAr ? 'دوبلكس' : 'Duplex',
    chalet: isAr ? 'شاليه' : 'Chalet',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 600 }}>
            {isAr ? 'العقارات' : 'Properties'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {isAr ? `${properties.length} عقار في قاعدة البيانات` : `${properties.length} properties in database`}
          </p>
        </div>
        <Link href={`/admin/${adminLocale}/properties/new`} className="btn btn-primary btn-sm">
          <Plus size={16} strokeWidth={2} />
          {isAr ? 'إضافة عقار' : 'Add Property'}
        </Link>
      </div>

      {/* Properties Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {properties.map((p) => (
          <div
            key={p.id}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Card Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {isAr ? p.title_ar : p.title_en}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {p.location} · {typeLabel[p.type] ?? p.type}
                  </p>
                </div>
                <span className={STATUS_BADGE[p.listing_status] ?? 'badge badge-active'} style={{ flexShrink: 0 }}>
                  {statusLabel[p.listing_status]}
                </span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '10px' }}>
                {formatPrice(p.price_egp, adminLocale)}
              </p>
            </div>

            {/* Core Stats */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--color-border)' }}>
              {[
                { label: isAr ? 'غرف' : 'Beds', value: p.bedrooms },
                { label: isAr ? 'حمامات' : 'Baths', value: p.bathrooms },
                { label: isAr ? 'م²' : 'sqm', value: p.area_sqm },
              ].map(({ label, value }, i) => (
                <div key={label} style={{
                  flex: 1,
                  padding: '10px 16px',
                  textAlign: 'center',
                  borderRight: i < 2 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>{value}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* New Spec Tags */}
            {(p.view || p.floor_number !== null && p.floor_number !== undefined) && (
              <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid var(--color-border)' }}>
                {p.view && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                    borderRadius: '20px', background: 'rgba(107,107,107,0.08)',
                    color: 'var(--color-text-muted)', border: '1px solid var(--color-border)'
                  }}>
                    <Eye size={10} strokeWidth={2} />
                    {p.view}
                  </span>
                )}
                {(p.floor_number !== null && p.floor_number !== undefined) && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                    borderRadius: '20px', background: 'rgba(107,107,107,0.08)',
                    color: 'var(--color-text-muted)', border: '1px solid var(--color-border)'
                  }}>
                    <Building2 size={10} strokeWidth={2} />
                    {p.floor_number === 0 ? (isAr ? 'أرضي' : 'Ground') : (isAr ? `ط ${p.floor_number}` : `Floor ${p.floor_number}`)}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '12px 16px', marginTop: 'auto', display: 'flex', gap: '8px' }}>
              <Link
                href={`/admin/${adminLocale}/properties/${p.id}/edit`}
                className="btn btn-outline btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Pencil size={13} strokeWidth={1.5} />
                {isAr ? 'تعديل' : 'Edit'}
              </Link>
              <Link
                href={`/${adminLocale}/properties/${p.slug}`}
                target="_blank"
                className="btn btn-sm"
                style={{
                  flex: 1, justifyContent: 'center',
                  background: 'rgba(30,77,61,0.07)', color: 'var(--color-primary)',
                  border: '1px solid rgba(30,77,61,0.2)'
                }}
              >
                {isAr ? 'معاينة' : 'Preview'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {properties.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 32px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', marginBottom: '16px' }}>
            {isAr ? 'لا توجد عقارات مضافة بعد.' : 'No properties yet.'}
          </p>
          <Link href={`/admin/${adminLocale}/properties/new`} className="btn btn-primary btn-sm">
            <Plus size={16} strokeWidth={2} />
            {isAr ? 'أضف عقاراً جديداً' : 'Add your first property'}
          </Link>
        </div>
      )}
    </div>
  );
}
