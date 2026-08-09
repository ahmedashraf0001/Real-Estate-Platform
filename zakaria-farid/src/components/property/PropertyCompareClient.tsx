'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Bed, Bath, Maximize2, MapPin, Check, ArrowLeft, Download,
  Eye, Building2, Layers, Star, Sparkles, MessageCircle, ArrowRight,
  DollarSign, Award, CheckCircle2, ShieldCheck, Home, Sofa, Wrench, X, ChevronLeft, ChevronRight, Images, ZoomIn
} from 'lucide-react';
import { formatPrice, formatNumber, whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import type { Property } from '@/lib/supabase/types';
import type { ZoneInstance } from '@/lib/layering/instances';
import { getZoneBadge, getZoneTemplateLabels } from '@/lib/layering/instances';
import styles from '@/app/[locale]/properties/compare/compare.module.css';

interface PropertyCompareClientProps {
  properties: Property[];
  locale: string;
  tProps: Record<string, string>;
}

export default function PropertyCompareClient({ properties, locale }: PropertyCompareClientProps) {
  const isAr = locale === 'ar';
  const [showDock, setShowDock] = useState(true);

  // Gallery Modal State
  const [activeGalleryProp, setActiveGalleryProp] = useState<Property | null>(null);
  const [galleryTab, setGalleryTab] = useState<'overview' | 'sections'>('overview');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Find best metrics across compare set
  const minPrice = Math.min(...properties.map((p) => Number(p.price_egp)));
  const pricesPerSqm = properties.map((p) => ({
    id: p.id,
    rate: p.area_sqm ? Number(p.price_egp) / Number(p.area_sqm) : Infinity,
  }));
  const minRatePerSqm = Math.min(...pricesPerSqm.map((r) => r.rate));
  const maxArea = Math.max(...properties.map((p) => Number(p.area_sqm)));
  const maxBeds = Math.max(...properties.map((p) => Number(p.bedrooms)));

  const statusLabel: Record<string, string> = {
    active: isAr ? 'عقار نشط متاح' : 'Active Available',
    under_offer: isAr ? 'تحت التفاوض' : 'Under Offer',
    sold: isAr ? 'تم البيع' : 'Sold',
  };

  const typeLabel: Record<string, string> = {
    villa: isAr ? 'فيلا مستقلة' : 'Standalone Villa',
    apartment: isAr ? 'شقة سكنية' : 'Apartment',
    townhouse: isAr ? 'تاون هاوس' : 'Townhouse',
    duplex: isAr ? 'دوبلكس' : 'Duplex',
    chalet: isAr ? 'شاليه شاطئي' : 'Beachfront Chalet',
  };

  const completionLabel: Record<string, string> = {
    ready: isAr ? 'جاهز للتسليم والسكن' : 'Ready to Move In',
    off_plan: isAr ? 'تحت الإنشاء (أوف بلان)' : 'Off-Plan Development',
  };

  const badgeFinishingMap: Record<string, { en: string; ar: string }> = {
    fully_finished: { en: 'Fully Finished Ultra Luxury', ar: 'تشطيب فاخر بالكامل' },
    semi_finished:  { en: 'Semi-Finished (Shell & Core)', ar: 'نصف تشطيب' },
    red_brick:      { en: 'Red Brick', ar: 'طوب أحمر' },
    mixed:          { en: 'Custom Mixed Finishing', ar: 'تشطيبات متنوعة حسب الغرف' },
    unknown:        { en: 'Standard Finishing', ar: 'تشطيب قياسي' },
  };

  // Helper to extract zone insights
  function getSpecInsights(p: Property) {
    const rawZones = (Array.isArray(p.spec_layers) ? p.spec_layers : []) as ZoneInstance[];
    const totalZones = rawZones.length;

    const badges = rawZones.map((z) => (z && typeof z === 'object' && 'trades' in z ? getZoneBadge(z) : 'unknown'));
    let finishingBadge = 'unknown';
    if (badges.length > 0 && badges.every((b) => b === 'fully_finished')) finishingBadge = 'fully_finished';
    else if (badges.length > 0 && badges.every((b) => b === 'semi_finished')) finishingBadge = 'semi_finished';
    else if (badges.length > 0 && badges.every((b) => b === 'red_brick')) finishingBadge = 'red_brick';
    else if (badges.length > 0) finishingBadge = 'mixed';

    const roomNames = rawZones.map((z) => {
      if (!z || typeof z !== 'object' || !('zone_template_id' in z)) return 'Zone';
      const labels = getZoneTemplateLabels(z.zone_template_id);
      const name = isAr ? labels?.ar : labels?.en;
      return z.instance_label ? `${name || z.zone_template_id} (${z.instance_label})` : (name || z.zone_template_id);
    });

    return {
      totalZones,
      finishingBadge,
      roomNames: roomNames.slice(0, 5),
    };
  }

  // Extract photos for active property in gallery modal
  function getGalleryPhotos(p: Property, tab: 'overview' | 'sections') {
    if (tab === 'overview') {
      const overviewImgs = p.property_images?.map((img) => ({ url: img.url, label: isAr ? 'صورة عامة' : 'Overview Photo' })) || [];
      if (overviewImgs.length === 0) {
        return [{ url: '/images/about-hero.png', label: isAr ? 'صورة العقار' : 'Property Photo' }];
      }
      return overviewImgs;
    } else {
      const rawZones = (Array.isArray(p.spec_layers) ? p.spec_layers : []) as ZoneInstance[];
      const sectionImgs: { url: string; label: string }[] = [];
      rawZones.forEach((z) => {
        if (z.images && z.images.length > 0) {
          const labels = getZoneTemplateLabels(z.zone_template_id);
          const name = (isAr ? labels?.ar : labels?.en) || z.zone_template_id;
          const fullLabel = z.instance_label ? `${name} (${z.instance_label})` : name;
          z.images.forEach((imgUrl) => {
            sectionImgs.push({ url: imgUrl, label: fullLabel });
          });
        }
      });
      if (sectionImgs.length === 0) {
        return [{ url: p.property_images?.[0]?.url || '/images/about-hero.png', label: isAr ? 'المواصفات العامة' : 'General Specification Photo' }];
      }
      return sectionImgs;
    }
  }

  function openGallery(p: Property) {
    setActiveGalleryProp(p);
    setGalleryTab('overview');
    setActivePhotoIdx(0);
  }

  // ─── Section 1: Financial & Core Investment Metrics ──────────────
  const section1Rows = [
    {
      label: isAr ? 'السعر الإجمالي (جنيه)' : 'Total Asking Price',
      icon: <DollarSign size={15} />,
      isKey: true,
      getValue: (p: Property) => {
        const isLowest = Number(p.price_egp) === minPrice;
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span className={styles.priceVal}>{formatPrice(p.price_egp, locale)}</span>
            {isLowest && (
              <span className={styles.bestValueBadge}>
                <Award size={11} />
                {isAr ? 'أقل سعر كلي' : 'Best Overall Price'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: isAr ? 'سعر المتر المربع' : 'Price / m²',
      icon: <Star size={15} />,
      isKey: true,
      getValue: (p: Property) => {
        const rate = p.area_sqm ? Number(p.price_egp) / Number(p.area_sqm) : 0;
        const isBestRate = rate === minRatePerSqm && rate > 0;
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>{formatPrice(Math.round(rate), locale)} / m²</span>
            {isBestRate && (
              <span className={styles.bestValueBadge}>
                <Sparkles size={11} />
                {isAr ? 'أفضل قيمة للمتر' : 'Lowest Rate / m²'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: isAr ? 'نوع العقار' : 'Property Type',
      icon: <Building2 size={15} />,
      getValue: (p: Property) => typeLabel[p.type] ?? p.type,
    },
    {
      label: isAr ? 'حالة القيد في السوق' : 'Listing Status',
      icon: <CheckCircle2 size={15} />,
      getValue: (p: Property) => (
        <span className={styles.highlightPill}>
          {statusLabel[p.listing_status] ?? p.listing_status}
        </span>
      ),
    },
  ];

  // ─── Section 2: Location, Compound & Ownership ─────────────────────
  const section2Rows = [
    {
      label: isAr ? 'الموقع والمجمع السكني' : 'Location & District',
      icon: <MapPin size={15} />,
      getValue: (p: Property) => p.location,
    },
    {
      label: isAr ? 'حالة الاستلام والتسليم' : 'Completion Status',
      icon: <Home size={15} />,
      getValue: (p: Property) => completionLabel[p.completion_status] ?? p.completion_status,
    },
    {
      label: isAr ? 'ملكية وسند العقار' : 'Ownership & Title',
      icon: <ShieldCheck size={15} />,
      getValue: () => (
        <span style={{ color: '#059669', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={14} />
          {isAr ? 'من المالك مباشرة (بدون عمولة)' : 'Direct Owner (0% Commission)'}
        </span>
      ),
    },
  ];

  // ─── Section 3: Layout & Architectural Dimensions ─────────────────
  const section3Rows = [
    {
      label: isAr ? 'المساحة الإجمالية' : 'Total Built Area',
      icon: <Maximize2 size={15} />,
      getValue: (p: Property) => {
        const isLargest = Number(p.area_sqm) === maxArea;
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>{formatNumber(p.area_sqm, locale)} m²</span>
            {isLargest && (
              <span className={styles.bestValueBadge}>
                <Maximize2 size={10} />
                {isAr ? 'الأكبر مساحة' : 'Largest Estate'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: isAr ? 'عدد غرف النوم' : 'Bedrooms & Suites',
      icon: <Bed size={15} />,
      getValue: (p: Property) => {
        const isMostBeds = p.bedrooms === maxBeds;
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>{p.bedrooms} {isAr ? 'غرف نوم' : 'Bedrooms'}</span>
            {isMostBeds && (
              <span className={styles.bestValueBadge}>
                <Bed size={10} />
                {isAr ? 'الأكثر غرفاً' : 'Most Bedrooms'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: isAr ? 'عدد الحمامات' : 'Bathrooms',
      icon: <Bath size={15} />,
      getValue: (p: Property) => `${p.bathrooms} ${isAr ? 'حمامات' : 'Bathrooms'}`,
    },
    {
      label: isAr ? 'الطابق / المستوى' : 'Floor Level',
      icon: <Layers size={15} />,
      getValue: (p: Property) => (p.floor_number != null ? (p.floor_number === 0 ? (isAr ? 'أرضي' : 'Ground') : `${p.floor_number}`) : '—'),
    },
    {
      label: isAr ? 'الإطلالة البانورامية' : 'Panoramic View',
      icon: <Eye size={15} />,
      getValue: (p: Property) => p.view ?? '—',
    },
  ];

  // ─── Section 4: Finishing & Zone Breakdown (Spec Layers) ──────────
  const section4Rows = [
    {
      label: isAr ? 'درجة وتفاصيل التشطيب' : 'Finishing Grade',
      icon: <Wrench size={15} />,
      getValue: (p: Property) => {
        const insights = getSpecInsights(p);
        const badge = badgeFinishingMap[insights.finishingBadge] || badgeFinishingMap.unknown;
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(30, 77, 61, 0.08)',
            border: '1px solid rgba(30, 77, 61, 0.2)',
            padding: '4px 10px',
            borderRadius: '12px',
            color: '#1E4D3D',
            fontSize: '12px',
            fontWeight: 700
          }}>
            <Wrench size={12} />
            {isAr ? badge.ar : badge.en}
          </span>
        );
      },
    },
    {
      label: isAr ? 'إجمالي المناطق والمساحات' : 'Zones & Rooms Count',
      icon: <Sofa size={15} />,
      getValue: (p: Property) => {
        const insights = getSpecInsights(p);
        return insights.totalZones > 0 ? (
          <span style={{ fontWeight: 700, color: '#1E4D3D' }}>
            {insights.totalZones} {isAr ? 'مناطق مسجلة تفصيلياً' : 'Configured Zones'}
          </span>
        ) : (
          isAr ? 'غير مخصص تفصيلياً' : 'Standard Layout'
        );
      },
    },
    {
      label: isAr ? 'المناطق الرئيسية المعرفة' : 'Configured Zone Highlights',
      icon: <Home size={15} />,
      getValue: (p: Property) => {
        const insights = getSpecInsights(p);
        return insights.roomNames.length > 0 ? (
          <div className={styles.zonePillGrid}>
            {insights.roomNames.map((r, i) => (
              <span key={i} className={styles.zoneBadgeItem}>
                <CheckCircle2 size={11} style={{ color: '#059669' }} />
                {r}
              </span>
            ))}
          </div>
        ) : (
          '—'
        );
      },
    },
  ];

  // ─── Section 5: Verified Amenities ─────────────────────
  const section5Rows = [
    {
      label: isAr ? 'المرافق والتجهيزات المتوفرة' : 'Amenities & Facilities',
      icon: <Sparkles size={15} />,
      getValue: (p: Property) =>
        p.property_amenities?.length ? (
          <div className={styles.amenityGrid}>
            {p.property_amenities.map((a) => (
              <span key={a.id} className={styles.amenityChip}>
                <Check size={11} strokeWidth={2.5} />
                {isAr ? a.amenity_ar : a.amenity_en}
              </span>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
  ];

  const activePhotos = activeGalleryProp ? getGalleryPhotos(activeGalleryProp, galleryTab) : [];
  const currentPhoto = activePhotos[activePhotoIdx] || activePhotos[0] || { url: '/images/about-hero.png', label: '' };

  return (
    <div className={styles.page}>
      {/* Page Header Banner */}
      <div className={styles.pageHeader}>
        <div className={`container ${styles.headerInner}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <Link href={`/${locale}/properties`} className={styles.backBtn}>
              <ArrowLeft size={15} strokeWidth={2.5} className={isAr ? styles.arrowRtl : ''} />
              {isAr ? 'العودة إلى محفظة العقارات' : 'Back to Portfolio'}
            </Link>

            <button
              type="button"
              onClick={handlePrintPdf}
              className={styles.headerWaBtn}
              style={{ background: '#1E4D3D', border: '1px solid rgba(201, 169, 106, 0.4)' }}
            >
              <Download size={15} />
              <span>{isAr ? 'تحميل جدول المقارنة (PDF)' : 'Download Comparison PDF'}</span>
            </button>
          </div>

          <div>
            <div className={styles.labelBadge}>
              <Sparkles size={13} />
              {isAr ? 'مصفوفة التقييم والتحليل المقارن' : 'Side-by-Side Estate Matrix'}
            </div>
            <h1 className={styles.pageTitle}>
              {isAr ? 'مقارنة العقارات الفاخرة' : 'Luxury Property Comparison Matrix'}
            </h1>
            <p className={styles.pageSub}>
              {isAr
                ? `مقارنة ${properties.length} عقارات فاخرة بمواصفات تفصيلية كاملة ومعاينة الصور والقطاعات.`
                : `Comprehensive breakdown of ${properties.length} luxury estates covering price metrics, layout specs & image galleries.`}
            </p>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Comparison Matrix Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.labelHeader}>
                  <div className={styles.matrixGroupTitle}>
                    <Building2 size={16} />
                    <span>{isAr ? 'العقارات المقارنة' : 'Compared Estates'}</span>
                  </div>
                </th>

                {properties.map((p) => {
                  const cover = p.property_images?.[0]?.url || '/images/about-hero.png';
                  const title = isAr ? p.title_ar : p.title_en;
                  const totalImages = p.property_images?.length || 1;
                  const waMsg = isAr
                    ? `مرحباً، أود الاستفسار عن ${p.title_ar} بسعر ${formatPrice(p.price_egp, 'ar')}`
                    : `Hello, I am interested in ${p.title_en} priced at ${formatPrice(p.price_egp, 'en')}`;

                  return (
                    <th key={p.id} className={styles.propHeader}>
                      <div className={styles.propCard}>
                        {/* Larger Clickable Image Container */}
                        <div
                          className={styles.propImgWrap}
                          onClick={() => openGallery(p)}
                          title={isAr ? 'اضغط لمشاهدة كافة الصور والقطاعات' : 'Click to open full photo gallery'}
                          style={{ cursor: 'pointer' }}
                        >
                          <Image src={cover} alt={title} fill sizes="33vw" className={styles.propImg} priority />
                          <span className={styles.propTypeTag}>{typeLabel[p.type] || p.type}</span>

                          {/* Hover Zoom & Photo Count Badge */}
                          <div className={styles.galleryBadge}>
                            <Images size={13} />
                            <span>{totalImages} {isAr ? 'صور' : 'Photos'}</span>
                            <ZoomIn size={13} style={{ marginLeft: '4px' }} />
                          </div>
                        </div>

                        <div className={styles.propMeta}>
                          <Link href={`/${locale}/properties/${p.slug}`} className={styles.propTitle}>
                            {title}
                          </Link>
                          <p className={styles.propLoc}>
                            <MapPin size={13} strokeWidth={1.5} />
                            {p.location}
                          </p>
                          <div className={styles.propPriceHero}>{formatPrice(p.price_egp, locale)}</div>
                        </div>

                        <div className={styles.propHeaderActions}>
                          <button
                            type="button"
                            onClick={() => openGallery(p)}
                            className={styles.headerGalleryBtn}
                          >
                            <Images size={14} />
                            {isAr ? 'الصور والقطاعات' : 'View Gallery'}
                          </button>
                          <Link href={`/${locale}/properties/${p.slug}`} className={styles.headerViewBtn}>
                            {isAr ? 'التفاصيل' : 'Details'}
                            <ArrowRight size={13} className={isAr ? styles.arrowRtl : ''} />
                          </Link>
                          <a
                            href={whatsappUrl(WHATSAPP_NUMBER, waMsg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.headerWaBtn}
                            title={isAr ? 'استفسر عبر واتساب' : 'Inquire via WhatsApp'}
                          >
                            <MessageCircle size={16} />
                          </a>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* SECTION 1: Financial & Investment Metrics */}
              <tr className={styles.sectionHeaderRow}>
                <td colSpan={properties.length + 1}>
                  <div className={styles.sectionTitle}>
                    <DollarSign size={18} className={styles.sectionTitleIcon} />
                    <span>{isAr ? '١. المؤشرات المالية وقيمة العقار' : '1. Financial & Property Value Metrics'}</span>
                  </div>
                </td>
              </tr>
              {section1Rows.map((row, idx) => (
                <tr key={idx} className={`${styles.row} ${row.isKey ? styles.rowKey : ''}`}>
                  <td className={styles.labelCell}>
                    <span className={styles.rowIcon}>{row.icon}</span>
                    {row.label}
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} className={styles.dataCell}>
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* SECTION 2: Location & Ownership */}
              <tr className={styles.sectionHeaderRow}>
                <td colSpan={properties.length + 1}>
                  <div className={styles.sectionTitle}>
                    <MapPin size={18} className={styles.sectionTitleIcon} />
                    <span>{isAr ? '٢. الموقع والمجمع السكني وحالة سند الملكية' : '2. Location, Compound & Ownership'}</span>
                  </div>
                </td>
              </tr>
              {section2Rows.map((row, idx) => (
                <tr key={idx} className={styles.row}>
                  <td className={styles.labelCell}>
                    <span className={styles.rowIcon}>{row.icon}</span>
                    {row.label}
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} className={styles.dataCell}>
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* SECTION 3: Layout & Dimensions */}
              <tr className={styles.sectionHeaderRow}>
                <td colSpan={properties.length + 1}>
                  <div className={styles.sectionTitle}>
                    <Maximize2 size={18} className={styles.sectionTitleIcon} />
                    <span>{isAr ? '٣. المساحات والتخطيط المعماري' : '3. Layout & Architectural Dimensions'}</span>
                  </div>
                </td>
              </tr>
              {section3Rows.map((row, idx) => (
                <tr key={idx} className={styles.row}>
                  <td className={styles.labelCell}>
                    <span className={styles.rowIcon}>{row.icon}</span>
                    {row.label}
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} className={styles.dataCell}>
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* SECTION 4: Finishing & Zone Breakdown (Spec Layers) */}
              <tr className={styles.sectionHeaderRow}>
                <td colSpan={properties.length + 1}>
                  <div className={styles.sectionTitle}>
                    <Wrench size={18} className={styles.sectionTitleIcon} />
                    <span>{isAr ? '٤. درجة التشطيب وتفاصيل المناطق (Spec Layers)' : '4. Finishing & Zone Breakdown (Spec Layers)'}</span>
                  </div>
                </td>
              </tr>
              {section4Rows.map((row, idx) => (
                <tr key={idx} className={styles.row}>
                  <td className={styles.labelCell}>
                    <span className={styles.rowIcon}>{row.icon}</span>
                    {row.label}
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} className={styles.dataCell}>
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* SECTION 5: Verified Amenities */}
              <tr className={styles.sectionHeaderRow}>
                <td colSpan={properties.length + 1}>
                  <div className={styles.sectionTitle}>
                    <Sparkles size={18} className={styles.sectionTitleIcon} />
                    <span>{isAr ? '٥. المرافق والخدمات الموثقة' : '5. Verified Amenities & Facilities'}</span>
                  </div>
                </td>
              </tr>
              {section5Rows.map((row, idx) => (
                <tr key={idx} className={styles.row}>
                  <td className={styles.labelCell}>
                    <span className={styles.rowIcon}>{row.icon}</span>
                    {row.label}
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} className={styles.dataCell}>
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Quick Action Dock */}
      {showDock && (
        <div className={styles.stickyDock}>
          <div className={`container ${styles.dockInner}`}>
            <div className={styles.dockInfo}>
              <Sparkles size={16} style={{ color: '#C9A96A' }} />
              <span className={styles.dockTitle}>
                {isAr ? 'هل اخترت عقارك المناسب؟ استفسر مباشرة من المالك:' : 'Found your ideal estate? Inquire direct from owner:'}
              </span>
            </div>

            <div className={styles.dockButtons}>
              <a
                href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحباً، أود الاستفسار عن العقارات المقارنة' : 'Hello, I would like to inquire about the compared properties')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.dockBtnPrimary}
              >
                <MessageCircle size={15} />
                {isAr ? 'تواصل مع المالك عبر واتساب' : 'Direct WhatsApp Inquiry'}
              </a>

              <button
                type="button"
                className={styles.closeDockBtn}
                onClick={() => setShowDock(false)}
                title={isAr ? 'إغلاق الشريط' : 'Dismiss Bar'}
                aria-label="Dismiss Bar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Gallery Lightbox Modal ───────────────────────────────── */}
      {activeGalleryProp && (
        <div className={styles.modalBackdrop} onClick={() => setActiveGalleryProp(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalTypeBadge}>{typeLabel[activeGalleryProp.type] || activeGalleryProp.type}</span>
                <h3 className={styles.modalTitle}>
                  {isAr ? activeGalleryProp.title_ar : activeGalleryProp.title_en}
                </h3>
                <p className={styles.modalSub}>
                  <MapPin size={12} /> {activeGalleryProp.location} • <strong style={{ color: '#C9A96A' }}>{formatPrice(activeGalleryProp.price_egp, locale)}</strong>
                </p>
              </div>

              <button type="button" className={styles.closeModalBtn} onClick={() => setActiveGalleryProp(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Gallery Tabs (Overview vs Room/Section Images) */}
            <div className={styles.modalTabs}>
              <button
                type="button"
                className={`${styles.tabBtn} ${galleryTab === 'overview' ? styles.tabActive : ''}`}
                onClick={() => {
                  setGalleryTab('overview');
                  setActivePhotoIdx(0);
                }}
              >
                <Images size={15} />
                {isAr ? 'صور العقار الرئيسية (Overview)' : 'Overview Photos'}
                <span className={styles.tabCountPill}>
                  {getGalleryPhotos(activeGalleryProp, 'overview').length}
                </span>
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${galleryTab === 'sections' ? styles.tabActive : ''}`}
                onClick={() => {
                  setGalleryTab('sections');
                  setActivePhotoIdx(0);
                }}
              >
                <Sofa size={15} />
                {isAr ? 'صور الغرف والقطاعات (Section Specs)' : 'Room & Section Photos'}
                <span className={styles.tabCountPill}>
                  {getGalleryPhotos(activeGalleryProp, 'sections').length}
                </span>
              </button>
            </div>

            {/* Main Featured Photo Viewfinder */}
            <div className={styles.viewfinderContainer}>
              <div className={styles.viewfinderImgWrap}>
                <Image
                  src={currentPhoto.url}
                  alt={currentPhoto.label}
                  fill
                  className={styles.viewfinderImg}
                  sizes="900px"
                  priority
                />

                {currentPhoto.label && (
                  <div className={styles.photoCaptionTag}>
                    <Sparkles size={12} style={{ color: '#C9A96A' }} />
                    <span>{currentPhoto.label}</span>
                  </div>
                )}

                <div className={styles.photoCounterBadge}>
                  {activePhotoIdx + 1} / {activePhotos.length}
                </div>

                {/* Nav Arrows */}
                {activePhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={`${styles.navArrow} ${styles.navArrowLeft}`}
                      onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : activePhotos.length - 1))}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.navArrow} ${styles.navArrowRight}`}
                      onClick={() => setActivePhotoIdx((prev) => (prev < activePhotos.length - 1 ? prev + 1 : 0))}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnail Navigation Strip */}
            {activePhotos.length > 1 && (
              <div className={styles.thumbStrip}>
                {activePhotos.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.thumbBtn} ${idx === activePhotoIdx ? styles.thumbActive : ''}`}
                    onClick={() => setActivePhotoIdx(idx)}
                  >
                    <Image src={photo.url} alt={photo.label} fill sizes="80px" className={styles.thumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
