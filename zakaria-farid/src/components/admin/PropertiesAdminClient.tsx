'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Pencil, 
  Eye, 
  Building2, 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  X,
  Sparkles,
  Layers,
  MapPin,
  Crown
} from 'lucide-react';
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

  const STATUS_BADGE: Record<string, { bg: string; color: string; border: string }> = {
    active: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
    under_offer: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
    sold: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    archived: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' },
  };

  const statusLabel: Record<string, string> = {
    active: isAr ? 'متاح للبيع' : 'Active Listing',
    under_offer: isAr ? 'تحت العرض' : 'Under Offer',
    sold: isAr ? 'مُباع' : 'Sold',
    archived: isAr ? 'مؤرشف' : 'Archived',
  };

  const typeLabel: Record<string, string> = {
    villa: isAr ? 'فيلا فاخرة' : 'Mansion / Villa',
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
        toast.success(shouldArchive ? (isAr ? 'تم نقل العقار إلى الأرشيف' : 'Property archived') : (isAr ? 'تم استعادة العقار بنجاح' : 'Property restored'));
      } else {
        setProperties(initialProperties);
        toast.error(res.error || 'Failed to update property status');
      }
    } catch {
      setProperties(initialProperties);
      toast.error('Failed to update property status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (propertyId: string, title: string) => {
    const msg = isAr 
      ? `تحذير نهائي: هل أنت متأكد من رغبتك في حذف "${title}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة!`
      : `Permanent Action: Are you sure you want to permanently delete "${title}"? This cannot be undone!`;
    
    if (!window.confirm(msg)) return;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: "var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif)" }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header & View Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(16, 20, 29, 0.85)',
        backdropFilter: 'blur(20px)',
        padding: '18px 24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              {isAr ? 'محفظة العقارات الفاخرة' : 'Properties Portfolio'}
            </h1>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  border: 'none',
                  background: activeTab === 'active' ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'transparent',
                  color: activeTab === 'active' ? '#0A0C10' : 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {isAr ? 'العقارات النشطة' : 'Active Properties'} ({activeProps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  border: 'none',
                  background: activeTab === 'archived' ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'transparent',
                  color: activeTab === 'archived' ? '#0A0C10' : 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {isAr ? 'الأرشيف' : 'Archived'} ({archivedProps.length})
              </button>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '3px', margin: 0 }}>
            {activeTab === 'active'
              ? (isAr ? `يتم عرض ${activeProps.length} عقار فاخر معتمد على المنصة الحية` : `Displaying ${activeProps.length} active sovereign estate listings`)
              : (isAr ? `يتم عرض ${archivedProps.length} عقار مؤرشف` : `Displaying ${archivedProps.length} archived property listings`)}
          </p>
        </div>

        <Link 
          href={`/admin/${adminLocale}/properties/new`} 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)',
            color: '#0A0C10',
            textDecoration: 'none',
            boxShadow: '0 3px 14px rgba(229, 184, 105, 0.25)',
            transition: 'all 150ms ease'
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>{isAr ? 'إدراج عقار جديد' : 'New Property'}</span>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        background: 'rgba(16, 20, 29, 0.75)',
        backdropFilter: 'blur(16px)',
        padding: '10px 16px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        {/* Text Search */}
        <div style={{ flex: '1 1 260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '14px', color: '#E5B869', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'البحث بالعنوان، المنطقة، السعر...' : 'Search by title, district, price...'}
            style={{
              width: '100%',
              padding: isAr ? '9px 38px 9px 14px' : '9px 14px 9px 38px',
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              outline: 'none',
              background: 'rgba(10, 14, 24, 0.7)',
              color: '#FFFFFF',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', [isAr ? 'left' : 'right']: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.5)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Property Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SlidersHorizontal size={14} style={{ color: '#DDA752' }} />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '9px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              background: 'rgba(10, 14, 24, 0.7)',
              color: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">{isAr ? 'جميع الأنواع المعمارية' : 'All Typologies'}</option>
            <option value="villa">{isAr ? 'فيلات وقصور' : 'Villas & Mansions'}</option>
            <option value="apartment">{isAr ? 'شقق فاخرة' : 'Apartments'}</option>
            <option value="townhouse">{isAr ? 'تاون هاوس' : 'Townhouses'}</option>
            <option value="duplex">{isAr ? 'دوبلكس' : 'Duplexes'}</option>
            <option value="chalet">{isAr ? 'شاليهات' : 'Chalets'}</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} style={{ color: '#DDA752' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '9px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              background: 'rgba(10, 14, 24, 0.7)',
              color: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="newest">{isAr ? 'الأحدث إدراجاً' : 'Newest Listed'}</option>
            <option value="oldest">{isAr ? 'الأقدم' : 'Oldest First'}</option>
            <option value="price_asc">{isAr ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
            <option value="price_desc">{isAr ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
            <option value="area_desc">{isAr ? 'المساحة: الأكبر أولاً' : 'Area: Largest First'}</option>
          </select>
        </div>
      </div>

      {/* Properties Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
        {displayedProperties.map((p) => {
          const badgeStyle = STATUS_BADGE[p.listing_status] || STATUS_BADGE.active;
          const heroPhoto = p.property_images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';
          const zonesCount = Array.isArray(p.spec_layers) ? p.spec_layers.length : 0;

          return (
            <div
              key={p.id}
              style={{
                background: 'rgba(16, 20, 29, 0.75)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                opacity: p.is_archived || p.listing_status === 'archived' ? 0.85 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {/* Thumbnail Hero with Tags */}
              <div style={{ position: 'relative', width: '100%', height: '170px', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroPhoto} alt={p.title_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(10,13,20,0.9) 100%)' }} />

                {/* Status Badges */}
                <div style={{ position: 'absolute', top: '12px', left: isAr ? 'auto' : '12px', right: isAr ? '12px' : 'auto', display: 'flex', gap: '6px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: 800,
                    background: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`,
                    backdropFilter: 'blur(8px)'
                  }}>
                    {statusLabel[p.listing_status]}
                  </span>

                  {p.is_featured && (
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '7px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: 'rgba(229, 184, 105, 0.15)',
                      color: '#E5B869',
                      border: '1px solid rgba(229, 184, 105, 0.35)',
                      backdropFilter: 'blur(8px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Crown size={12} />
                      <span>{isAr ? 'مميز' : 'Featured'}</span>
                    </span>
                  )}
                </div>

                {/* CAD Layers Tag */}
                <div style={{ position: 'absolute', bottom: '10px', left: isAr ? 'auto' : '12px', right: isAr ? '12px' : 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    background: 'rgba(10, 13, 20, 0.85)',
                    color: '#E5B869',
                    border: '1px solid rgba(229, 184, 105, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Layers size={11} />
                    <span>{zonesCount} {isAr ? 'أجنحة CAD' : 'CAD Suites'}</span>
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h3 style={{
                    fontSize: '14.5px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: '0 0 4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {isAr ? p.title_ar : p.title_en}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <MapPin size={12} style={{ color: '#E5B869' }} />
                    <span>{p.location}</span>
                    <span>•</span>
                    <span>{typeLabel[p.type] ?? p.type}</span>
                  </div>

                  <p style={{ fontSize: '17px', fontWeight: 800, color: '#E5B869', margin: '8px 0 0' }}>
                    {formatPrice(p.price_egp, adminLocale)}
                  </p>
                </div>

                {/* Metrics Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  textAlign: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '9.5px', color: 'rgba(255, 255, 255, 0.45)', display: 'block' }}>{isAr ? 'غرف' : 'Beds'}</span>
                    <strong style={{ fontSize: '12.5px', color: '#FFFFFF' }}>{p.bedrooms}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9.5px', color: 'rgba(255, 255, 255, 0.45)', display: 'block' }}>{isAr ? 'حمامات' : 'Baths'}</span>
                    <strong style={{ fontSize: '12.5px', color: '#FFFFFF' }}>{p.bathrooms}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9.5px', color: 'rgba(255, 255, 255, 0.45)', display: 'block' }}>{isAr ? 'م²' : 'SQM'}</span>
                    <strong style={{ fontSize: '12.5px', color: '#FFFFFF' }}>{p.area_sqm}</strong>
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.07)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link
                      href={`/admin/${adminLocale}/properties/${p.id}/edit`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 11px',
                        borderRadius: '7px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(229, 184, 105, 0.12)',
                        border: '1px solid rgba(229, 184, 105, 0.25)',
                        color: '#E5B869',
                        textDecoration: 'none'
                      }}
                    >
                      <Pencil size={11} />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </Link>

                    {p.slug && (
                      <Link
                        href={`/${adminLocale}/properties/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 9px',
                          borderRadius: '7px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.75)',
                          textDecoration: 'none'
                        }}
                      >
                        <Eye size={11} />
                        <span>{isAr ? 'معاينة' : 'View'}</span>
                      </Link>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleToggleArchive(p.id, !p.is_archived)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer'
                      }}
                      title={p.is_archived ? (isAr ? 'استعادة من الأرشيف' : 'Restore') : (isAr ? 'أرشفة' : 'Archive')}
                    >
                      {p.is_archived ? <RotateCcw size={13} /> : <Archive size={13} />}
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDelete(p.id, isAr ? p.title_ar : p.title_en)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#F87171',
                        cursor: 'pointer'
                      }}
                      title={isAr ? 'حذف نهائي' : 'Delete Permanently'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
