'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Eye, Building2, Archive, RotateCcw, Trash2, Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils/formatting';
import { toggleArchiveProperty, deletePropertyPermanently } from '@/app/actions/properties';
import type { Property } from '@/lib/supabase/types';

interface PropertiesAdminClientProps {
  initialProperties: Property[];
  adminLocale: string;
}

export default function PropertiesAdminClient({ initialProperties, adminLocale }: PropertiesAdminClientProps) {
  const isAr = adminLocale === 'ar';
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'area_desc'>('newest');
  const [isProcessing, setIsProcessing] = useState(false);

  const STATUS_BADGE: Record<string, string> = {
    active: 'badge badge-active',
    under_offer: 'badge badge-offer',
    sold: 'badge badge-sold',
    archived: 'badge badge-sold',
  };

  const statusLabel: Record<string, string> = {
    active: isAr ? 'متاح' : 'Active',
    under_offer: isAr ? 'تحت العرض' : 'Under Offer',
    sold: isAr ? 'مُباع' : 'Sold',
    archived: isAr ? 'مؤرشف' : 'Archived',
  };

  const typeLabel: Record<string, string> = {
    villa: isAr ? 'فيلا' : 'Villa',
    apartment: isAr ? 'شقة' : 'Apartment',
    townhouse: isAr ? 'تاون هاوس' : 'Townhouse',
    duplex: isAr ? 'دوبلكس' : 'Duplex',
    chalet: isAr ? 'شاليه' : 'Chalet',
  };

  const activeProps = useMemo(
    () => properties.filter((p) => !p.is_archived && p.listing_status !== 'archived'),
    [properties]
  );

  const archivedProps = useMemo(
    () => properties.filter((p) => p.is_archived === true || p.listing_status === 'archived'),
    [properties]
  );

  const displayedProperties = useMemo(() => {
    const base = activeTab === 'active' ? activeProps : archivedProps;
    return base
      .filter((p) => {
        if (selectedType !== 'all' && p.type !== selectedType) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const titleEn = (p.title_en || '').toLowerCase();
        const titleAr = (p.title_ar || '').toLowerCase();
        const location = (p.location || '').toLowerCase();
        const type = (p.type || '').toLowerCase();
        const price = String(p.price_egp || '');
        return titleEn.includes(q) || titleAr.includes(q) || location.includes(q) || type.includes(q) || price.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'price_asc') {
          return a.price_egp - b.price_egp;
        }
        if (sortBy === 'price_desc') {
          return b.price_egp - a.price_egp;
        }
        if (sortBy === 'area_desc') {
          return (b.area_sqm || 0) - (a.area_sqm || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [activeTab, activeProps, archivedProps, searchQuery, selectedType, sortBy]);

  const handleToggleArchive = async (propertyId: string, shouldArchive: boolean) => {
    setIsProcessing(true);
    try {
      setProperties((current) =>
        current.map((p) =>
          p.id === propertyId
            ? { ...p, is_archived: shouldArchive }
            : p
        )
      );

      const res = await toggleArchiveProperty(propertyId, shouldArchive);
      if (res.success) {
        toast.success(
          shouldArchive
            ? isAr ? 'تم أرشفة العقار بنجاح' : 'Property archived successfully'
            : isAr ? 'تم استعادة العقار بنجاح' : 'Property restored to active listings'
        );
      } else {
        setProperties(initialProperties);
        toast.error(res.error || 'Failed to update property archive state');
      }
    } catch {
      setProperties(initialProperties);
      toast.error('Failed to update property archive state');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePermanent = async (propertyId: string) => {
    if (!confirm(isAr ? 'هل أنت تأكد من حذف هذا العقار نهائياً مع كافة الصوُر والمعلومات؟' : 'Are you sure you want to permanently delete this property and all associated data?')) {
      return;
    }

    setIsProcessing(true);
    try {
      setProperties((current) => current.filter((p) => p.id !== propertyId));
      const res = await deletePropertyPermanently(propertyId);
      if (res.success) {
        toast.success(isAr ? 'تم حذف العقار نهائياً' : 'Property permanently deleted');
      } else {
        setProperties(initialProperties);
        toast.error(res.error || 'Failed to delete property');
      }
    } catch {
      setProperties(initialProperties);
      toast.error('Failed to delete property');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 600, margin: 0 }}>
              {isAr ? 'العقارات' : 'Properties'}
            </h1>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--color-background)', padding: '4px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  background: activeTab === 'active' ? '#1E4D3D' : 'transparent',
                  color: activeTab === 'active' ? '#FFFFFF' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {isAr ? 'العقارات النشطة' : 'Active'} ({activeProps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  background: activeTab === 'archived' ? '#1E4D3D' : 'transparent',
                  color: activeTab === 'archived' ? '#FFFFFF' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {isAr ? 'الأرشيف' : 'Archived'} ({archivedProps.length})
              </button>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {activeTab === 'active'
              ? (isAr ? `يعرض ${activeProps.length} عقار نشط على الموقع` : `Showing ${activeProps.length} active property listings`)
              : (isAr ? `يعرض ${archivedProps.length} عقار مؤرشف` : `Showing ${archivedProps.length} archived property listings`)}
          </p>
        </div>

        <Link href={`/admin/${adminLocale}/properties/new`} className="btn btn-primary btn-sm">
          <Plus size={16} strokeWidth={2} />
          {isAr ? 'إضافة عقار' : 'Add Property'}
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        background: 'var(--color-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Text Search */}
        <div style={{ flex: '1 1 240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '12px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'البحث بالعنوان، الموقع، السعر...' : 'Search by title, location, price...'}
            style={{
              width: '100%',
              padding: '8px 36px 8px 36px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              outline: 'none',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', [isAr ? 'left' : 'right']: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Property Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SlidersHorizontal size={14} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            <option value="all">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            <option value="villa">{isAr ? 'فيلا' : 'Villa'}</option>
            <option value="apartment">{isAr ? 'شقة' : 'Apartment'}</option>
            <option value="townhouse">{isAr ? 'تاون هاوس' : 'Townhouse'}</option>
            <option value="duplex">{isAr ? 'دوبلكس' : 'Duplex'}</option>
            <option value="chalet">{isAr ? 'شاليه' : 'Chalet'}</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            <option value="newest">{isAr ? 'الأحدث أولاً' : 'Newest First'}</option>
            <option value="oldest">{isAr ? 'الأقدم أولاً' : 'Oldest First'}</option>
            <option value="price_asc">{isAr ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
            <option value="price_desc">{isAr ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
            <option value="area_desc">{isAr ? 'المساحة: الأكبر أولاً' : 'Area: Largest First'}</option>
          </select>
        </div>
      </div>

      {/* Properties Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {displayedProperties.map((p) => (
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
              opacity: p.is_archived || p.listing_status === 'archived' ? 0.85 : 1,
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

            {/* Spec Tags */}
            {(p.view || (p.floor_number !== null && p.floor_number !== undefined)) && (
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
            <div style={{ padding: '12px 16px', marginTop: 'auto', display: 'flex', gap: '6px' }}>
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
              <button
                type="button"
                onClick={() => void handleToggleArchive(p.id, !p.is_archived && p.listing_status !== 'archived')}
                disabled={isProcessing}
                className="btn btn-sm"
                title={p.is_archived || p.listing_status === 'archived' ? (isAr ? 'استعادة العقار' : 'Restore Property') : (isAr ? 'أرشفة العقار' : 'Archive Property')}
                style={{
                  background: p.is_archived || p.listing_status === 'archived' ? '#ECFDF5' : '#F1F5F9',
                  color: p.is_archived || p.listing_status === 'archived' ? '#059669' : '#475569',
                  border: '1px solid #CBD5E1',
                  padding: '0 10px'
                }}
              >
                {p.is_archived || p.listing_status === 'archived' ? <RotateCcw size={13} /> : <Archive size={13} />}
              </button>
              <button
                type="button"
                onClick={() => void handleDeletePermanent(p.id)}
                disabled={isProcessing}
                className="btn btn-sm"
                title={isAr ? 'حذف نهائي' : 'Delete Permanently'}
                style={{
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                  padding: '0 10px'
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {displayedProperties.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 32px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', marginBottom: '16px' }}>
            {activeTab === 'active'
              ? (isAr ? 'لا توجد عقارات نشطة حالياً.' : 'No active properties.')
              : (isAr ? 'لا توجد عقارات مؤرشفة.' : 'No archived properties.')}
          </p>
          <Link href={`/admin/${adminLocale}/properties/new`} className="btn btn-primary btn-sm">
            <Plus size={16} strokeWidth={2} />
            {isAr ? 'أضف عقاراً جديداً' : 'Add a property'}
          </Link>
        </div>
      )}
    </div>
  );
}
