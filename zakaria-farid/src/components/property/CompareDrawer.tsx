'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Property } from '@/types';
import { 
  Scale, 
  X, 
  ArrowUpRight, 
  Check, 
  Minus, 
  Bed, 
  Bath, 
  Maximize2, 
  Calendar, 
  MapPin, 
  Building2, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompareDrawerProps {
  selectedProperties: Property[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectProperty: (id: string) => void;
  locale?: string;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  selectedProperties,
  onRemove,
  onClear,
  onSelectProperty,
  locale = 'en'
}) => {
  const [mounted, setMounted] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const isAr = locale === 'ar';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpenModal) {
      // 1. Stop Lenis smooth scroll while modal is open
      if (typeof window !== 'undefined' && window.__masrLenis) {
        window.__masrLenis.stop();
      }

      // 2. Lock standard browser scroll
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      return () => {
        // Resume Lenis smooth scroll on modal close
        if (typeof window !== 'undefined' && window.__masrLenis) {
          window.__masrLenis.start();
        }
        document.documentElement.style.overflow = originalHtmlOverflow || '';
        document.body.style.overflow = originalBodyOverflow || '';
      };
    }
  }, [isOpenModal]);

  if (!mounted || selectedProperties.length === 0) return null;

  const maxSlots = 3;
  const canCompare = selectedProperties.length >= 2;

  // Aggregate all unique amenities from selected properties for comparison matrix
  const allAmenities = Array.from(
    new Set(
      selectedProperties.flatMap((p) => {
        if (p.amenities && Array.isArray(p.amenities)) {
          return p.amenities.map((a: any) => typeof a === 'string' ? a : (a?.title || ''));
        }
        if (p.property_amenities && Array.isArray(p.property_amenities)) {
          return p.property_amenities.map((a: any) => typeof a === 'string' ? a : (a?.amenity_en || a?.amenity_ar || ''));
        }
        return [];
      }).filter(Boolean)
    )
  );

  // Helper to extract finishing level and label
  const getFinishingInfo = (p: Property) => {
    const rawZones = (Array.isArray(p.spec_layers) ? p.spec_layers : []) as any[];
    if (rawZones.length > 0) {
      const badges = rawZones.map((z: any) => z?.trades?.every((t: any) => t.status === 'Completed') ? 'fully_finished' : 'semi_finished');
      if (badges.every((b) => b === 'fully_finished')) {
        return { en: 'Fully Finished Ultra Luxury', ar: 'تشطيب فاخر بالكامل (الترا لوكس)', badge: 'fully' };
      }
    }
    const fin = (p.finishing || (p as any).finishing_type || '').toLowerCase();
    if (fin.includes('full') || fin.includes('كامل') || fin.includes('ultra') || fin.includes('super')) {
      return { en: 'Fully Finished Ultra Luxury', ar: 'تشطيب فاخر بالكامل (الترا لوكس)', badge: 'fully' };
    }
    if (fin.includes('semi') || fin.includes('نصف') || fin.includes('shell')) {
      return { en: 'Semi-Finished (Shell & Core)', ar: 'نصف تشطيب (محارة وحلوق)', badge: 'semi' };
    }
    if (fin.includes('brick') || fin.includes('أحمر') || fin.includes('red')) {
      return { en: 'Red Brick Structure', ar: 'طوب أحمر خرساني', badge: 'brick' };
    }
    return { en: 'Super Lux Ready', ar: 'تشطيب سوبر لوكس جاهز', badge: 'fully' };
  };

  // Helper to extract trade engineering specs (Electrical, Plumbing, Flooring, HVAC, Smart Home)
  const getEngineeringSpecs = (p: Property) => {
    const specs: Array<{ icon: 'zap' | 'droplets' | 'layers' | 'shield' | 'sparkles' | 'home'; en: string; ar: string }> = [];
    const rawZones = (Array.isArray(p.spec_layers) ? p.spec_layers : []) as any[];
    const jsonStr = JSON.stringify(rawZones).toLowerCase();
    
    const hasSmart = jsonStr.includes('smart') || jsonStr.includes('automation') || (p.price && p.price > 15000000);
    const hasMarble = jsonStr.includes('marble') || jsonStr.includes('رخام') || (p.price && p.price > 20000000);
    const hasCentralAC = jsonStr.includes('hvac') || jsonStr.includes('تكييف') || (p.price && p.price > 18000000);
    
    specs.push({
      icon: 'zap',
      en: 'Schneider / Panasonic Electrical Infrastructure',
      ar: 'تأسيس وتجهيز كهرباء شنايدر وباناسونيك'
    });

    specs.push({
      icon: 'droplets',
      en: 'Grohe & Duravit Concealed Sanitary Ware',
      ar: 'أطقم وخلاطات سباكة جروهي وديورافيت مدفونة'
    });

    specs.push({
      icon: 'layers',
      en: hasMarble ? 'Imported Spanish Marble & Porcelain' : 'Imported Porcelain & HDF Flooring',
      ar: hasMarble ? 'أرضيات رخام إسباني مستورد وبورسلين فاخر' : 'بورسلين إسباني وأرضيات خشب HDF عازل'
    });

    specs.push({
      icon: 'shield',
      en: hasCentralAC ? 'Concealed VRV Central AC Infrastructure' : 'Concealed Split AC Pre-Installations',
      ar: hasCentralAC ? 'تأسيس تكييف مركزي VRV عالي الكفاءة' : 'تجهيزات وتمديدات تكييفات سبليت مدفونة'
    });

    if (hasSmart) {
      specs.push({
        icon: 'sparkles',
        en: 'Smart Home Lighting & Climate Automation',
        ar: 'نظام أتمتة وتحكم ذكي بالإنارة والتكييف'
      });
    }

    specs.push({
      icon: 'home',
      en: 'Jumbo Double-Glazed Soundproof Glass',
      ar: 'قطاعات ألوميتال جامبو بزجاج دبل عازل للصوت'
    });

    return specs;
  };



  // Helper for Floor Level & View
  const getFloorViewInfo = (p: Property) => {
    const floor = p.floor_number ?? (p as any).floor;
    let floorLabelEn = 'Typical Floor';
    let floorLabelAr = 'الدور المتكرر';
    if (floor === 0 || floor === '0') {
      floorLabelEn = 'Ground Floor + Private Garden';
      floorLabelAr = 'الدور الأرضي + حديقة خاصة';
    } else if (floor !== undefined && floor !== null) {
      floorLabelEn = `Floor ${floor}`;
      floorLabelAr = `الدور ${floor}`;
    } else if (p.propertyType?.toLowerCase().includes('penthouse') || p.type?.toLowerCase().includes('roof')) {
      floorLabelEn = 'Penthouse Sky Roof Floor';
      floorLabelAr = 'طابق الروف والبنثهاوس البانورامي';
    } else if (p.propertyType?.toLowerCase().includes('villa')) {
      floorLabelEn = 'Full Standalone Multi-Story Villa';
      floorLabelAr = 'فيلا مستقلة متعددة الطوابق';
    }

    const viewEn = p.view || (p.district?.includes('North Coast') || p.district?.includes('Sokhna') ? 'Direct Open Sea View' : 'Panoramic Landscape & Water Feature');
    const viewAr = p.view || (p.district?.includes('North Coast') || p.district?.includes('Sokhna') ? 'إطلالة بحرية مفتوحة ومباشرة' : 'فيو بانورامي على اللاندسكيب والبحيرات');

    return { floorLabelEn, floorLabelAr, viewEn, viewAr };
  };

  const getPropImage = (p: Property) => {
    return p.images?.[0] || (p.property_images?.[0] as any)?.url || '';
  };

  return createPortal(
    <>
      {/* 1. Floating Crystal Dock Bar at bottom of screen */}
      <div className="compare-dock-wrapper" dir={isAr ? 'rtl' : 'ltr'}>
        <motion.div
          className="compare-dock-container"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        >
          <div className="compare-dock-inner">
            <div className="compare-dock-info">
              <div className="compare-icon-wrap">
                <Scale size={18} className="dock-scale-icon" />
              </div>
              <div>
                <span className="dock-title">{isAr ? 'مقارنة العقارات' : 'Estate Comparison'}</span>
                <span className="dock-subtitle">
                  {isAr 
                    ? `تم اختيار ${selectedProperties.length} من ${maxSlots} ${canCompare ? '(جاهز للمقارنة)' : '(اختر عقاراً آخر)'}` 
                    : `${selectedProperties.length} of ${maxSlots} Selected ${canCompare ? '(Ready)' : '(Select 1 more)'}`}
                </span>
              </div>
            </div>

            <div className="dock-slots-row">
              {selectedProperties.map((p) => {
                const imgUrl = getPropImage(p);
                const priceNum = p.price || p.price_egp || 0;
                return (
                  <div key={p.id} className="dock-slot filled">
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.title || p.title_en || ''} className="dock-slot-img" />
                    ) : (
                      <div className="dock-slot-img-placeholder" />
                    )}
                    <div className="dock-slot-meta">
                      <span className="slot-title">{p.title || p.title_en || (isAr ? 'عقار فاخر' : 'Estate')}</span>
                      <span className="slot-price">
                        {new Intl.NumberFormat('en-US').format(priceNum)} {p.currency || (isAr ? 'ج.م' : 'EGP')}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(p.id);
                      }}
                      className="dock-remove-btn"
                      title={isAr ? 'إزالة من المقارنة' : 'Remove from comparison'}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}

              {Array.from({ length: maxSlots - selectedProperties.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className="dock-slot empty">
                  <span className="empty-text">{isAr ? '+ أضف عقاراً' : '+ Add Estate'}</span>
                </div>
              ))}
            </div>

            <div className="dock-actions-row">
              <button
                onClick={() => canCompare && setIsOpenModal(true)}
                disabled={!canCompare}
                className={`btn-gold dock-compare-btn ${!canCompare ? 'disabled' : ''}`}
                title={canCompare ? (isAr ? 'فتح جدول المقارنة التفصيلي' : 'Open Comparison Matrix') : (isAr ? 'اختر عقارين على الأقل' : 'Select at least 2 properties')}
              >
                <Scale size={15} />
                <span>{isAr ? `مقارنة (${selectedProperties.length})` : `Compare (${selectedProperties.length})`}</span>
              </button>
              <button onClick={onClear} className="dock-clear-btn" title={isAr ? 'مسح قائمة المقارنة' : 'Clear comparison list'}>
                {isAr ? 'مسح' : 'Clear'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2. Full Architectural Comparison Modal */}
      <AnimatePresence>
        {isOpenModal && (
          <motion.div 
            className="compare-modal-backdrop" 
            onClick={() => setIsOpenModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            data-lenis-prevent="true"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <motion.div
              className="compare-modal-window"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              data-lenis-prevent="true"
            >
              {/* Header */}
              <div className="modal-header">
                <div className="modal-title-wrap">
                  <div className="modal-icon-badge">
                    <Scale size={20} className="badge-gold-icon" />
                  </div>
                  <div>
                    <span className="eyebrow">{isAr ? 'مقارنة العقارات الفاخرة والمواصفات المعمارية' : 'ARCHITECTURAL & SPECIFICATION COMPARISON'}</span>
                    <h2 className="modal-heading">{isAr ? 'مقارنة تفصيلية للمواصفات والتشطيبات' : 'Detailed Specs & Finishes Comparison'}</h2>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpenModal(false)}
                  className="modal-close-btn"
                  title={isAr ? 'إغلاق المقارنة' : 'Close Comparison'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Comparison Matrix Table */}
              <div 
                className="compare-matrix-scroll" 
                data-lenis-prevent="true"
                onWheel={(e) => e.stopPropagation()}
              >
                <div
                  className="compare-matrix-grid"
                  style={{
                    gridTemplateColumns: `220px repeat(${selectedProperties.length}, minmax(280px, 1fr))`
                  }}
                >
                  {/* Row 1: Estate Header & Imagery */}
                  <div className="matrix-row-label header-label">{isAr ? 'نظرة عامة على العقار' : 'PROPERTY OVERVIEW'}</div>
                  {selectedProperties.map((p) => {
                    const imgUrl = getPropImage(p);
                    return (
                      <div key={`header-${p.id}`} className="matrix-card-cell header-cell">
                        <div className="cell-image-frame">
                          {imgUrl ? (
                            <img src={imgUrl} alt={p.title || p.title_en || ''} className="cell-img" />
                          ) : (
                            <div className="cell-img-placeholder" />
                          )}
                          <span className="cell-location-tag">
                            <MapPin size={11} />
                            <span>{p.district || p.location?.split(',')[0] || 'Egypt'}</span>
                          </span>
                        </div>
                        <h4 className="cell-title">{p.title || p.title_en || 'Estate'}</h4>
                        <span className="cell-type">{p.propertyType || p.type || 'Residence'}</span>
                      </div>
                    );
                  })}

                  {/* Row 2: Guide Price */}
                  <div className="matrix-row-label">{isAr ? 'السعر الاسترشادي' : 'GUIDE PRICE'}</div>
                  {selectedProperties.map((p) => {
                    const priceNum = p.price || p.price_egp || 0;
                    return (
                      <div key={`price-${p.id}`} className="matrix-cell highlight-cell">
                        <div className="cell-price-val">
                          {new Intl.NumberFormat('en-US').format(priceNum)}{' '}
                          <span className="cell-currency">{p.currency || (isAr ? 'ج.م' : 'EGP')}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Row 3: Price per sqm */}
                  <div className="matrix-row-label">{isAr ? 'سعر المتر المربع' : 'PRICE / SQM'}</div>
                  {selectedProperties.map((p) => {
                    const priceNum = p.price || p.price_egp || 0;
                    const sqmNum = p.sqm || (p as any).area_sqm || 1;
                    return (
                      <div key={`sqmrate-${p.id}`} className="matrix-cell">
                        <span className="cell-sub-val">
                          {Math.round(priceNum / sqmNum).toLocaleString('en-US')} {isAr ? 'ج.م / م²' : 'EGP / m²'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Row 4: Built-up Area */}
                  <div className="matrix-row-label">{isAr ? 'المساحة المبنية' : 'BUILT-UP AREA'}</div>
                  {selectedProperties.map((p) => {
                    const sqmNum = p.sqm || (p as any).area_sqm || 0;
                    return (
                      <div key={`sqm-${p.id}`} className="matrix-cell">
                        <span className="cell-metric-val">
                          <Maximize2 size={14} className="cell-spec-icon" />
                          <strong>{sqmNum}</strong> {isAr ? 'م²' : 'sqm'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Row 5: Bedrooms & Bathrooms */}
                  <div className="matrix-row-label">{isAr ? 'الغرف والحمامات' : 'BEDROOMS / BATHS'}</div>
                  {selectedProperties.map((p) => {
                    const bedsNum = p.beds ?? (p as any).bedrooms ?? 0;
                    const bathsNum = p.baths ?? (p as any).bathrooms ?? 0;
                    return (
                      <div key={`beds-${p.id}`} className="matrix-cell">
                        <span className="cell-metric-val">
                          <Bed size={14} className="cell-spec-icon" /> {bedsNum} {isAr ? 'غرف نوم' : 'Bedrooms'} •{' '}
                          <Bath size={14} className="cell-spec-icon" /> {bathsNum} {isAr ? 'حمامات' : 'Bathrooms'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Row 6: Finishing Level & Standard (مستوى وجودة التشطيب) */}
                  <div className="matrix-row-label">{isAr ? 'مستوى وجودة التشطيب' : 'FINISHING LEVEL'}</div>
                  {selectedProperties.map((p) => {
                    const fin = getFinishingInfo(p);
                    return (
                      <div key={`finishing-${p.id}`} className="matrix-cell">
                        <div className={`matrix-finishing-badge ${fin.badge}`}>
                          <Sparkles size={13} className="badge-sparkle" />
                          <span>{isAr ? fin.ar : fin.en}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Row 7: Detailed Engineering & Materials Specs (المواصفات الهندسية والخامات) */}
                  <div className="matrix-row-label">{isAr ? 'المواصفات والخامات الهندسية' : 'ENGINEERING SPECS'}</div>
                  {selectedProperties.map((p) => {
                    const specs = getEngineeringSpecs(p);
                    return (
                      <div key={`eng-${p.id}`} className="matrix-cell eng-specs-cell">
                        <div className="matrix-specs-list">
                          {specs.map((s, i) => (
                            <div key={i} className="matrix-spec-item">
                              <Check size={12} className="matrix-spec-check" />
                              <span className="matrix-spec-text">{isAr ? s.ar : s.en}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Row 8: Floor Level & Orientation (الدور والإطلالة) */}
                  <div className="matrix-row-label">{isAr ? 'الدور والإطلالة' : 'FLOOR & ORIENTATION'}</div>
                  {selectedProperties.map((p) => {
                    const fv = getFloorViewInfo(p);
                    return (
                      <div key={`floor-${p.id}`} className="matrix-cell">
                        <div className="matrix-floor-wrap">
                          <span className="matrix-floor-tag">
                            <Building2 size={13} />
                            <span>{isAr ? fv.floorLabelAr : fv.floorLabelEn}</span>
                          </span>
                          <span className="matrix-view-tag">
                            <ShieldCheck size={13} />
                            <span>{isAr ? fv.viewAr : fv.viewEn}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}



                  {/* Row 10: Delivery Year & Handover */}
                  <div className="matrix-row-label">{isAr ? 'موعد الاستلام' : 'DELIVERY YEAR'}</div>
                  {selectedProperties.map((p) => (
                    <div key={`built-${p.id}`} className="matrix-cell">
                      <span className="cell-metric-val">
                        <Calendar size={14} className="cell-spec-icon" />
                        {p.builtYear || (isAr ? 'استلام فوري جاهز' : 'Immediate Key Handover')}
                      </span>
                    </div>
                  ))}

                  {/* Row 11: Amenities Breakdown */}
                  <div className="matrix-row-label">{isAr ? 'المزايا والمرافق الحصرية' : 'KEY AMENITIES'}</div>
                  {selectedProperties.map((p) => {
                    const amList = ((p.amenities || p.property_amenities || []) as any[]);
                    return (
                      <div key={`amenities-${p.id}`} className="matrix-cell amenities-cell">
                        <div className="amenities-chips-wrap">
                          {amList.length > 0 ? amList.map((a, i) => {
                            const title = typeof a === 'string' ? a : (a?.title || a?.amenity_en || a?.amenity_ar || '');
                            if (!title) return null;
                            return (
                              <span key={i} className="matrix-amenity-chip">
                                <Check size={12} className="chip-check" />
                                <span>{title}</span>
                              </span>
                            );
                          }) : (
                            <span className="matrix-amenity-chip muted">
                              <span>{isAr ? 'مواصفات فاخرة قياسية' : 'Standard Luxury Inclusions'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Row 12: Action CTA */}
                  <div className="matrix-row-label">{isAr ? 'معاينة العقار' : 'ACQUISITION ACTION'}</div>
                  {selectedProperties.map((p) => (
                    <div key={`cta-${p.id}`} className="matrix-cell action-cell">
                      <button
                        onClick={() => {
                          setIsOpenModal(false);
                          onSelectProperty(p.id);
                        }}
                        className="btn-gold cell-explore-btn"
                      >
                        <span>{isAr ? 'معاينة الملف الكامل' : 'View Dossier'}</span>
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* Floating Dock Wrapper & Bar */
        .compare-dock-wrapper {
          position: fixed;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
          z-index: 9999;
          padding: 0 1.25rem;
        }

        .compare-dock-container {
          width: 100%;
          max-width: 1100px;
          pointer-events: auto;
        }

        .compare-dock-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border-radius: 24px;
          padding: 0.65rem 1rem;
          gap: 0.75rem;
          width: 100%;
          box-sizing: border-box;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .compare-dock-inner {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.28) 0%,
            rgba(255, 255, 255, 0.08) 25%,
            rgba(18, 24, 38, 0.42) 60%,
            rgba(10, 14, 24, 0.65) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.32);
          box-shadow: 
            0 24px 60px rgba(0, 0, 0, 0.45),
            0 0 30px rgba(252, 211, 77, 0.2),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.15);
        }

        [data-theme="light"] .compare-dock-inner {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.70) 0%,
            rgba(255, 255, 255, 0.35) 35%,
            rgba(255, 255, 255, 0.55) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 
            0 20px 50px rgba(15, 23, 42, 0.10),
            0 0 30px rgba(184, 133, 48, 0.12),
            inset 0 1.5px 2px #FFFFFF;
        }

        .compare-dock-info {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }

        .compare-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(197, 142, 54, 0.18);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 14px rgba(197, 142, 54, 0.3);
          flex-shrink: 0;
        }

        .dock-scale-icon {
          color: var(--gold-primary);
        }

        .dock-title {
          font-family: var(--font-heading);
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
          line-height: 1.2;
        }

        .dock-subtitle {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          display: block;
          white-space: nowrap;
        }

        .dock-slots-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex: 1 1 auto;
          min-width: 0;
          justify-content: center;
        }

        .dock-slot {
          display: flex;
          align-items: center;
          gap: 7px;
          border-radius: 12px;
          padding: 3px 8px 3px 3px;
          min-width: 80px;
          max-width: 165px;
          flex: 1 1 0px;
          height: 42px;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }

        [data-theme="dark"] .dock-slot.filled {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(221, 167, 82, 0.4);
        }

        [data-theme="light"] .dock-slot.filled {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--gold-border);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .dock-slot.empty {
          justify-content: center;
          max-width: 110px;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .dock-slot.empty {
          border: 1px dashed rgba(221, 167, 82, 0.35);
          background: rgba(255, 255, 255, 0.03);
        }

        [data-theme="light"] .dock-slot.empty {
          border: 1.5px dashed rgba(197, 154, 69, 0.45);
          background: rgba(197, 154, 69, 0.05);
        }

        .empty-text {
          font-size: 0.72rem;
          white-space: nowrap;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .empty-text {
          color: rgba(221, 167, 82, 0.9);
          font-weight: 600;
        }

        [data-theme="light"] .empty-text {
          color: var(--gold-primary);
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .dock-slot-img {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .dock-slot-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .slot-title {
          font-family: var(--font-heading);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .slot-price {
          font-size: 0.65rem;
          color: var(--gold-primary);
          font-weight: 600;
          white-space: nowrap;
        }

        .dock-remove-btn {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .dock-remove-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        .dock-actions-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-shrink: 0;
        }

        .dock-compare-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0.52rem 0.95rem;
          font-size: 0.8125rem;
          font-weight: 700;
          border-radius: 11px;
          white-space: nowrap;
        }

        .dock-compare-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.6);
        }

        .dock-clear-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.48rem 0.75rem;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: 1px solid var(--border-subtle);
          white-space: nowrap;
        }

        [data-theme="dark"] .dock-clear-btn {
          background: rgba(255, 255, 255, 0.06);
          color: #C7D2DF;
          border-color: rgba(255, 255, 255, 0.14);
        }

        [data-theme="dark"] .dock-clear-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .dock-clear-btn {
          background: rgba(0, 0, 0, 0.04);
          color: #1E293B;
          border-color: rgba(0, 0, 0, 0.10);
        }

        [data-theme="light"] .dock-clear-btn:hover {
          background: rgba(0, 0, 0, 0.08);
          color: #0D1117;
          border-color: rgba(0, 0, 0, 0.18);
        }

        @media (max-width: 860px) {
          .dock-slot.empty {
            display: none;
          }
          .dock-subtitle {
            display: none;
          }
        }

        /* Full Comparison Modal Backdrop */
        .compare-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.45);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          overflow: hidden;
        }

        .compare-modal-window {
          backdrop-filter: blur(28px) saturate(210%) brightness(1.04);
          -webkit-backdrop-filter: blur(28px) saturate(210%) brightness(1.04);
          border-radius: 28px;
          width: 100%;
          max-width: 1200px;
          height: min(88vh, 840px);
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        [data-theme="dark"] .compare-modal-window {
          background: linear-gradient(
            140deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(18, 24, 38, 0.85) 45%,
            rgba(10, 14, 24, 0.94) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 32px 80px rgba(0, 0, 0, 0.6),
            0 0 35px rgba(252, 211, 77, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65);
        }

        [data-theme="light"] .compare-modal-window {
          background: linear-gradient(
            140deg,
            rgba(255, 255, 255, 0.94) 0%,
            rgba(255, 255, 255, 0.84) 45%,
            rgba(255, 255, 255, 0.92) 100%
          );
          backdrop-filter: blur(24px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(24px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 32px 80px rgba(15, 23, 42, 0.12),
            0 0 35px rgba(184, 133, 48, 0.12),
            inset 0 2px 2.5px #FFFFFF;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.75rem 2rem;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .modal-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(197, 142, 54, 0.18);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(197, 142, 54, 0.25);
        }

        .badge-gold-icon {
          color: var(--gold-primary);
        }

        .modal-heading {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .modal-close-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .modal-close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--border-subtle);
          color: #ffffff;
        }

        [data-theme="light"] .modal-close-btn {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #0D1117;
        }

        .modal-close-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        /* Matrix Table Scroll */
        .compare-matrix-scroll {
          overflow-y: auto;
          overflow-x: auto;
          padding: 1.5rem 2rem 2.5rem;
          flex: 1 1 auto;
          min-height: 0;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .compare-matrix-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .compare-matrix-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
        }

        .compare-matrix-scroll::-webkit-scrollbar-thumb {
          background: rgba(221, 167, 82, 0.35);
          border-radius: 4px;
        }

        .compare-matrix-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(221, 167, 82, 0.65);
        }

        .compare-matrix-grid {
          display: grid;
          gap: 1rem 1.5rem;
          align-items: center;
        }

        .matrix-row-label {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.75rem 0;
        }

        [data-theme="dark"] .matrix-row-label {
          color: #94A3B8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .matrix-row-label {
          color: #64748B;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .matrix-row-label.header-label {
          border-bottom: none;
        }

        .matrix-card-cell {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cell-image-frame {
          position: relative;
          width: 100%;
          height: 170px;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .cell-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cell-location-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(10, 14, 22, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          padding: 0.25rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #ffffff;
        }

        .cell-title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.25;
        }

        [data-theme="dark"] .cell-title {
          color: #ffffff;
        }

        [data-theme="light"] .cell-title {
          color: #0D1117;
        }

        .cell-type {
          font-size: 0.75rem;
          color: var(--gold-primary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .matrix-cell {
          padding: 0.75rem 0;
          display: flex;
          align-items: center;
        }

        [data-theme="dark"] .matrix-cell {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .matrix-cell {
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .cell-price-val {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        .cell-currency {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gold-light);
        }

        .cell-sub-val {
          font-size: 0.9375rem;
          font-weight: 600;
        }

        [data-theme="dark"] .cell-sub-val {
          color: #CBD5E1;
        }

        [data-theme="light"] .cell-sub-val {
          color: #334155;
        }

        .cell-metric-val {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        [data-theme="dark"] .cell-metric-val {
          color: #ffffff;
        }

        .matrix-finishing-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 700;
        }

        .matrix-finishing-badge.fully {
          background: rgba(221, 167, 82, 0.14);
          border: 1px solid rgba(221, 167, 82, 0.4);
          color: var(--gold-primary);
        }

        .matrix-finishing-badge.semi {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.35);
          color: #60A5FA;
        }

        .matrix-finishing-badge.brick {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #F87171;
        }

        .badge-sparkle {
          color: var(--gold-primary);
        }

        .eng-specs-cell {
          align-items: flex-start;
        }

        .matrix-specs-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .matrix-spec-item {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          font-size: 0.78rem;
          line-height: 1.35;
        }

        .matrix-spec-check {
          color: var(--gold-primary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .matrix-spec-text {
          font-weight: 500;
        }

        [data-theme="dark"] .matrix-spec-text {
          color: #CBD5E1;
        }

        [data-theme="light"] .matrix-spec-text {
          color: #334155;
        }

        .matrix-floor-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .matrix-floor-tag, .matrix-view-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 8px;
          width: fit-content;
        }

        [data-theme="dark"] .matrix-floor-tag {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #F1F5F9;
        }

        [data-theme="light"] .matrix-floor-tag {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #0F172A;
        }

        [data-theme="dark"] .matrix-view-tag {
          background: rgba(221, 167, 82, 0.08);
          border: 1px solid rgba(221, 167, 82, 0.25);
          color: var(--gold-light);
        }

        [data-theme="light"] .matrix-view-tag {
          background: rgba(184, 134, 11, 0.08);
          border: 1px solid rgba(184, 134, 11, 0.25);
          color: #8C6826;
        }

        .amenities-cell {
          align-items: flex-start;
        }

        .amenities-chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .matrix-amenity-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 8px;
          padding: 0.25rem 0.55rem;
          font-size: 0.75rem;
        }

        [data-theme="dark"] .matrix-amenity-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #E2E8F0;
        }

        [data-theme="light"] .matrix-amenity-chip {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #0D1117;
        }

        .chip-check {
          color: var(--gold-primary);
        }

        .action-cell {
          border-bottom: none;
          padding-top: 1rem;
        }

        .cell-explore-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
        }

        @media (max-width: 768px) {
          .compare-dock-inner {
            flex-direction: column;
            gap: 0.75rem;
          }

          .dock-slots-row {
            width: 100%;
            overflow-x: auto;
            justify-content: flex-start;
          }

          .modal-header {
            padding: 1rem 1.25rem;
          }

          .compare-modal-backdrop {
            padding: 0;
            align-items: flex-end;
          }

          .compare-modal-window {
            width: 100% !important;
            max-width: 100% !important;
            height: 92dvh !important;
            max-height: 92dvh !important;
            border-radius: 24px 24px 0 0 !important;
          }

          .compare-matrix-scroll {
            padding: 0.75rem;
          }
        }
      `}</style>
    </>,
    document.body
  );
};
