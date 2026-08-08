'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bed, Bath, Maximize2, MapPin, CheckCircle2, Phone, MessageCircle,
  ChevronLeft, ChevronRight, X, Grid, Paintbrush, Sofa, Eye, Building2,
  Layers, Image as ImageIcon, Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';
import { formatPrice, formatNumber, whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import ContactForm from '@/components/forms/ContactForm';
import PropertyCard from './PropertyCard';
import DynamicMiniMap from '@/components/map/DynamicMiniMap';
import type { Property, SpecLayer } from '@/lib/supabase/types';
import type { ZoneInstance } from '@/lib/layering/instances';
import FinishingDetailsDisplay from './FinishingDetailsDisplay';
import styles from './PropertyDetailClient.module.css';

interface PropertyDetailClientProps {
  property: Property;
  locale: string;
  similar: Property[];
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active',
  under_offer: 'badge-offer',
  sold: 'badge-sold',
};

const LAYER_ICONS: Record<string, React.ReactNode> = {
  bedrooms: <Bed size={22} strokeWidth={1.5} />,
  bathrooms: <Bath size={22} strokeWidth={1.5} />,
  floor_layout: <Building2 size={22} strokeWidth={1.5} />,
  finishing_view: <Paintbrush size={22} strokeWidth={1.5} />,
};

const LOCATION_TRANSLATIONS: Record<string, string> = {
  'Sheikh Zayed': 'الشيخ زايد',
  'New Cairo': 'القاهرة الجديدة',
  'Fifth Settlement': 'التجمع الخامس',
  'Beverly Hills': 'بيفرلي هيلز',
  'North Coast': 'الساحل الشمالي',
  'Sidi Abdel Rahman': 'سيدي عبد الرحمن',
  '6th of October': '٦ أكتوبر',
};

export default function PropertyDetailClient({ property, locale, similar }: PropertyDetailClientProps) {
  const t = useTranslations('property');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // Interactive Spec Modal State
  const [activeSpecModal, setActiveSpecModal] = useState<SpecLayer | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [activeModalPhotoIndex, setActiveModalPhotoIndex] = useState<number>(0);

  const images = property.property_images ?? [];
  const title = locale === 'ar' ? property.title_ar : property.title_en;
  const description = locale === 'ar' ? property.description_ar : property.description_en;

  const isAr = locale === 'ar';

  let displayLocation = property.location;
  if (isAr) {
    displayLocation = displayLocation.replace(/\./g, '،').replace(/,/g, '،');
    Object.entries(LOCATION_TRANSLATIONS).forEach(([en, ar]) => {
      displayLocation = displayLocation.replace(new RegExp(en, 'gi'), ar);
    });
  }

  // Detect data format: new ZoneInstance[] vs legacy SpecLayer[]
  const rawLayers = property.spec_layers ?? [];
  const isNewFormat = rawLayers.length > 0 && 'zone_template_id' in (rawLayers[0] as any);
  const zoneInstances: ZoneInstance[] = isNewFormat ? (rawLayers as unknown as ZoneInstance[]) : [];
  // Valid legacy layers that have items (backward compat for old SpecLayer[] format)
  const validLayers = isNewFormat ? [] : (rawLayers as any[]).filter((l: any) => l.items && l.items.length > 0);

  const tProperties = useTranslations('properties');
  const statusLabel: Record<string, string> = {
    active: tProperties('status_active'),
    under_offer: tProperties('status_under_offer'),
    sold: tProperties('status_sold'),
  };

  const typeLabel: Record<string, string> = {
    villa: isAr ? 'فيلا' : 'Villa',
    apartment: isAr ? 'شقة' : 'Apartment',
    townhouse: isAr ? 'تاون هاوس' : 'Townhouse',
    duplex: isAr ? 'دوبلكس' : 'Duplex',
    chalet: isAr ? 'شاليه' : 'Chalet',
  };

  function prevImg() { setActiveImg((i) => (i - 1 + images.length) % images.length); }
  function nextImg() { setActiveImg((i) => (i + 1) % images.length); }

  const waMessage = isAr
    ? `مرحباً، أنا مهتم بـ: ${title}`
    : `Hello, I am interested in: ${title}`;

  const openSpecModal = (layer: SpecLayer) => {
    setActiveSpecModal(layer);
    setActiveItemIndex(0);
    setActiveModalPhotoIndex(0);
  };

  const closeSpecModal = () => {
    setActiveSpecModal(null);
  };

  const handleOpenLightboxWithImg = (imgUrl: string) => {
    const index = images.findIndex((img) => img.url === imgUrl);
    if (index !== -1) {
      setActiveImg(index);
    } else {
      setActiveImg(0);
    }
    closeSpecModal();
    setLightboxOpen(true);
  };

  // Gallery rendering logic
  const renderGallery = () => {
    if (images.length === 0) {
      return (
        <div className={styles.noImgContainer}>
          <ImageIcon size={48} strokeWidth={1} style={{ opacity: 0.4 }} />
          <span>{isAr ? 'لا توجد صور متاحة لهذا العقار' : 'No photos available for this property'}</span>
        </div>
      );
    }

    if (images.length === 1) {
      return (
        <div className={styles.singleHero} onClick={() => { setActiveImg(0); setLightboxOpen(true); }}>
          <Image src={images[0].url} alt={title} fill sizes="100vw" className={styles.galleryImg} priority />
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className={styles.splitGallery}>
          {images.map((img, i) => (
            <div key={img.id} className={styles.splitHalf} onClick={() => { setActiveImg(i); setLightboxOpen(true); }}>
              <Image src={img.url} alt={`${title} - ${i + 1}`} fill sizes="50vw" className={styles.galleryImg} priority={i === 0} />
            </div>
          ))}
        </div>
      );
    }

    const displayCount = Math.min(images.length, 5);
    const rightSideImages = images.slice(1, displayCount);

    return (
      <div className={styles.bentoGallery}>
        <div className={styles.bentoMain} onClick={() => { setActiveImg(0); setLightboxOpen(true); }}>
          <Image src={images[0].url} alt={title} fill sizes="(max-width: 768px) 100vw, 60vw" className={styles.galleryImg} priority />
        </div>
        <div className={`${styles.bentoRight} ${rightSideImages.length === 1 ? styles.bentoRight1 : rightSideImages.length === 2 ? styles.bentoRight2 : rightSideImages.length === 3 ? styles.bentoRight3 : ''}`}>
          {rightSideImages.map((img, index) => (
            <div key={img.id} className={styles.bentoSub} onClick={() => { setActiveImg(index + 1); setLightboxOpen(true); }}>
              <Image src={img.url} alt={`${title} - ${index + 2}`} fill sizes="(max-width: 768px) 100vw, 20vw" className={styles.galleryImg} />
            </div>
          ))}
        </div>
        
        <button className={styles.showAllBtn} onClick={() => { setActiveImg(0); setLightboxOpen(true); }}>
          <Grid size={16} />
          <span>{isAr ? 'عرض جميع الصور' : 'Show all photos'}</span>
        </button>
      </div>
    );
  };

  return (
    <div className={styles.root}>
      {/* ─── Bento Hero Gallery ──────────────────────────── */}
      <div className={styles.galleryWrapper}>
        <div className="container">
          {renderGallery()}
        </div>
      </div>

      {/* ─── Content + Sidebar ─────────────────────── */}
      <div className={`container ${styles.layout}`}>
        {/* Main content */}
        <div className={styles.content}>
          {/* Title + Status Header Block */}
          {/* Title + Status Header Block */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={styles.heroHeaderBlock}
          >
            <div className={styles.statusRow}>
              <span className={`badge ${STATUS_BADGE[property.listing_status]} ${styles.statusBadge}`}>
                {statusLabel[property.listing_status]}
              </span>
              <span className={styles.typeBadge}>
                {typeLabel[property.type]}
              </span>
              <span className={styles.guaranteeChip}>
                <ShieldCheck size={14} />
                <span>{isAr ? 'عقار موثق ومسجل' : 'Verified Legal Title'}</span>
              </span>
            </div>

            <h1 className={styles.titleText}>{title}</h1>

            <div className={styles.locationRow}>
              <MapPin size={16} strokeWidth={1.5} className={styles.locIcon} />
              <span>{displayLocation}</span>
            </div>

            {/* Feature Highlights Pills */}
            <div className={styles.headerHighlights}>
              <span className={styles.highlightPill}>{isAr ? '٠٪ عمولات وساطة' : '0% Commission'}</span>
              <span className={styles.highlightPill}>{isAr ? 'من المالك مباشرة' : 'Direct Owner'}</span>
              <span className={styles.highlightPill}>{isAr ? 'معاينة فورية' : 'Immediate Viewing'}</span>
            </div>

            {/* Price Box */}
            <div className={styles.heroPriceBox}>
              <div className={styles.priceMeta}>
                <span className={styles.heroPriceLabel}>{isAr ? 'السعر الكلي المطلوب' : 'Total Asking Price'}</span>
                <p className={styles.heroPriceVal}>{formatPrice(property.price_egp, locale)}</p>
              </div>
            </div>
          </motion.div>

          {/* Key Facts Cards */}
          <div className={styles.factsGrid}>
            <div className={styles.factCard}>
              <div className={styles.factIconCircle}>
                <Building2 size={20} strokeWidth={1.5} />
              </div>
              <div className={styles.factMeta}>
                <span className={styles.factVal}>{typeLabel[property.type]}</span>
                <span className={styles.factLabel}>{isAr ? 'نوع العقار' : 'Property Type'}</span>
              </div>
            </div>

            <div className={styles.factCard}>
              <div className={styles.factIconCircle}>
                <Maximize2 size={20} strokeWidth={1.5} />
              </div>
              <div className={styles.factMeta}>
                <span className={styles.factVal}>{formatNumber(property.area_sqm, locale)} {isAr ? 'م²' : 'sqm'}</span>
                <span className={styles.factLabel}>{isAr ? 'المساحة الكلية' : 'Total Area'}</span>
              </div>
            </div>

            <div className={styles.factCard}>
              <div className={styles.factIconCircle}>
                <Bed size={20} strokeWidth={1.5} />
              </div>
              <div className={styles.factMeta}>
                <span className={styles.factVal}>{property.bedrooms}</span>
                <span className={styles.factLabel}>{isAr ? 'غرف النوم' : 'Bedrooms'}</span>
              </div>
            </div>

            <div className={styles.factCard}>
              <div className={styles.factIconCircle}>
                <Bath size={20} strokeWidth={1.5} />
              </div>
              <div className={styles.factMeta}>
                <span className={styles.factVal}>{property.bathrooms}</span>
                <span className={styles.factLabel}>{isAr ? 'الحمامات' : 'Bathrooms'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('description')}</h2>
            <div className={styles.description} dangerouslySetInnerHTML={{ __html: description }} />
          </section>

          {/* ─── Finishing Details Display — 3-layer system per specdesignimplemnetation.md §7.2 ─── */}
          {zoneInstances.length > 0 ? (
            <section className={styles.section} id="finishing-details">
              <FinishingDetailsDisplay
                zones={zoneInstances}
                propertyTitle={title}
                locale={locale}
                propertyImages={property.property_images?.map(img => img.url)}
              />
            </section>
          ) : validLayers.length > 0 ? (
            /* ─── Legacy SpecLayer[] format fallback ─── */
            <section className={styles.section}>
              <div className={styles.layerHeader}>
                <h2 className={styles.sectionTitle}>
                  {isAr ? 'استكشاف التوزيع والمواصفات التفصيلية' : 'Bespoke Layered Specifications'}
                </h2>
                <p className={styles.layerSub}>
                  {isAr ? 'انقر فوق أي قسم لفتح المستكشف التفصيلي' : 'Click any card to open the interactive inspector'}
                </p>
              </div>
              <div className={styles.specShowcaseGrid}>
                {validLayers.map((layer: any) => {
                  const layerTitle = isAr ? layer.layer_label_ar : layer.layer_label_en;
                  return (
                    <motion.div
                      key={layer.layer_key}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className={styles.specCardWrapper}
                      onClick={() => openSpecModal(layer)}
                    >
                      <div className={styles.specCardContent}>
                        <div className={styles.specCardTop}>
                          <div className={styles.specCardIcon}>
                            {LAYER_ICONS[layer.layer_key] ?? <Layers size={22} />}
                          </div>
                          <span className={styles.specCountBadge}>
                            {layer.items.length} {isAr ? 'تفاصيل' : 'Specs'}
                          </span>
                        </div>
                        <div className={styles.specCardBody}>
                          <h3 className={styles.specCardTitle}>{layerTitle}</h3>
                          <div className={styles.specChipsRow}>
                            {layer.items.slice(0, 3).map((item: any) => (
                              <span key={item.id} className={styles.specChip}>
                                {isAr ? item.label_ar : item.label_en}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={styles.specCardFooter}>
                          <span className={styles.inspectBtnText}>
                            {isAr ? 'فتح التفاصيل' : 'Inspect'}
                          </span>
                          <div className={styles.inspectArrowWrap}>
                            <ArrowRight size={16} className={isAr ? styles.arrowRtl : ''} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ) : (
            /* ─── Basic specs fallback (no finishing data yet) ─── */
            (property.view || (property.floor_number !== undefined && property.floor_number !== null)) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{isAr ? 'المواصفات الرئيسية' : 'Specifications'}</h2>
                <div className={styles.specsGrid}>
                  {property.view && (
                    <div className={styles.specCard}>
                      <div className={styles.specIconWrap}><Eye size={20} /></div>
                      <div className={styles.specCardMeta}>
                        <span className={styles.specCardLabel}>{t('view')}</span>
                        <span className={styles.specCardVal}>{property.view}</span>
                      </div>
                    </div>
                  )}
                  {(property.floor_number !== undefined && property.floor_number !== null) && (
                    <div className={styles.specCard}>
                      <div className={styles.specIconWrap}><Building2 size={20} /></div>
                      <div className={styles.specCardMeta}>
                        <span className={styles.specCardLabel}>{t('floor')}</span>
                        <span className={styles.specCardVal}>
                          {property.floor_number === 0
                            ? (isAr ? 'أرضي' : 'Ground Floor')
                            : (isAr ? `الطابق ${property.floor_number}` : `Floor ${property.floor_number}`)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )
          )}

          {/* Amenities */}
          {property.property_amenities && property.property_amenities.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('amenities')}</h2>
              <div className={styles.amenitiesGrid}>
                {property.property_amenities.map((a) => (
                  <div key={a.id} className={styles.amenity}>
                    <CheckCircle2 size={16} strokeWidth={1.5} className={styles.amenityIcon} />
                    <span>{isAr ? a.amenity_ar : a.amenity_en}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Location Map */}
          {property.latitude && property.longitude && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isAr ? 'الموقع على الخريطة' : 'Location & Map'}</h2>
              <div className={styles.locationMeta}>
                <MapPin size={16} strokeWidth={1.5} className={styles.locMetaIcon} />
                <span>{property.location}</span>
              </div>
              <div className={styles.mapContainer}>
                <DynamicMiniMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  title={title}
                  price={property.price_egp}
                  location={property.location}
                  locale={locale}
                />
              </div>
            </section>
          )}
        </div>

        {/* ─── Executive Sticky Agent Sidebar ─────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarAgentHeader}>
              <div className={styles.agentAvatar}>ZF</div>
              <div>
                <h4 className={styles.agentName}>Zakaria Farid</h4>
                <span className={styles.agentRole}>{isAr ? 'مستشار العقارات الفاخرة' : 'Luxury Real Estate Advisor'}</span>
              </div>
            </div>

            <div className={styles.sidebarActionHeading}>
              {isAr ? 'حجز معاينة أو استفسار' : 'Schedule Viewing & Inquire'}
            </div>

            <div className={styles.sidebarBtns}>
              <a href={`tel:+${WHATSAPP_NUMBER}`} className={`btn btn-outline ${styles.callBtn}`}>
                <Phone size={16} strokeWidth={1.5} />
                {t('call')}
              </a>
              <a
                href={whatsappUrl(WHATSAPP_NUMBER, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn ${styles.waBtn}`}
              >
                <MessageCircle size={16} strokeWidth={1.5} />
                {t('whatsapp')}
              </a>
            </div>

            <hr className="divider" />
            <ContactForm propertyId={property.id} propertyTitle={title} locale={locale} compact />
          </div>
        </aside>
      </div>

      {/* ─── Similar Properties ─────────────────────── */}
      {similar.length > 0 && (
        <div className={styles.similar}>
          <div className="container">
            <h2 className={styles.similarTitle}>{t('similar')}</h2>
            <div className={styles.similarGrid}>
              {similar.map((p) => (
                <PropertyCard key={p.id} property={p} locale={locale} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Spec Showcase Modal ─────────────── */}
      <AnimatePresence>
        {activeSpecModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalBackdrop}
            onClick={closeSpecModal}
          >
            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 24, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={styles.specModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderTitleWrap}>
                  <div className={styles.modalIconBox}>
                    {LAYER_ICONS[activeSpecModal.layer_key] ?? <Layers size={22} />}
                  </div>
                  <div>
                    <h3 className={styles.modalTitle}>
                      {isAr ? activeSpecModal.layer_label_ar : activeSpecModal.layer_label_en}
                    </h3>
                    <p className={styles.modalSub}>
                      {title}
                    </p>
                  </div>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeSpecModal}>
                  <X size={20} />
                </button>
              </div>

              {/* Item Navigation Tabs */}
              {activeSpecModal.items.length > 1 && (
                <div className={styles.modalTabsRow}>
                  {activeSpecModal.items.map((item, index) => (
                    <button
                      key={item.id}
                      className={`${styles.modalTabBtn} ${activeItemIndex === index ? styles.modalTabActive : ''}`}
                      onClick={() => {
                        setActiveItemIndex(index);
                        setActiveModalPhotoIndex(0);
                      }}
                    >
                      <span>{isAr ? item.label_ar : item.label_en}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Item Showcase View */}
              {(() => {
                const currentItem = activeSpecModal.items[activeItemIndex] || activeSpecModal.items[0];
                if (!currentItem) return null;

                const itemTitle = isAr ? currentItem.label_ar : currentItem.label_en;
                const itemDetails = isAr ? currentItem.details_ar : currentItem.details_en;
                const itemFinishing = isAr ? currentItem.finishing_ar : currentItem.finishing_en;
                const itemPhotos = currentItem.image_ids ?? [];
                const currentPhoto = itemPhotos[activeModalPhotoIndex] || itemPhotos[0] || images[0]?.url;

                const itemWaMsg = isAr
                  ? `مرحباً، أستفسر عن: ${itemTitle} في ${title}`
                  : `Hello, I have an inquiry regarding ${itemTitle} in ${title}`;

                return (
                  <div className={styles.modalBodyGrid}>
                    {/* Left Column: Photo Showcase */}
                    <div className={styles.modalPhotoCol}>
                      {currentPhoto ? (
                        <div className={styles.modalHeroPhotoWrap} onClick={() => handleOpenLightboxWithImg(currentPhoto)}>
                          <Image src={currentPhoto} alt={itemTitle} fill sizes="600px" className={styles.modalHeroPhoto} priority />
                          <div className={styles.modalPhotoExpandBadge}>
                            <ImageIcon size={14} />
                            <span>{isAr ? 'عرض في المعرض الكامل' : 'Open in Full Lightbox'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.modalNoPhoto}>
                          <Building2 size={36} strokeWidth={1} />
                        </div>
                      )}

                      {itemPhotos.length > 1 && (
                        <div className={styles.modalThumbsBar}>
                          {itemPhotos.map((url, pIdx) => (
                            <div
                              key={pIdx}
                              className={`${styles.modalThumbItem} ${activeModalPhotoIndex === pIdx ? styles.modalThumbActive : ''}`}
                              onClick={() => setActiveModalPhotoIndex(pIdx)}
                            >
                              <Image src={url} alt={`thumb ${pIdx}`} fill sizes="80px" className={styles.modalThumbImg} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Spec Details */}
                    <div className={styles.modalInfoCol}>
                      <div className={styles.modalInfoBadge}>
                        <Sparkles size={13} />
                        <span>{isAr ? activeSpecModal.layer_label_ar : activeSpecModal.layer_label_en}</span>
                      </div>
                      <h4 className={styles.modalInfoTitle}>{itemTitle}</h4>
                      {itemDetails && (
                        <div className={styles.modalInfoDescBox}>
                          <p>{itemDetails}</p>
                        </div>
                      )}
                      
                      {itemFinishing && (
                        <div className={styles.modalInfoFinishingBox} style={{ marginTop: 12, padding: 12, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 8, borderLeft: isAr ? 'none' : '3px solid #d4af37', borderRight: isAr ? '3px solid #d4af37' : 'none' }}>
                          <h5 style={{ fontSize: 11, fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                            {isAr ? 'حالة التشطيب' : 'Finishing Quality'}
                          </h5>
                          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            {itemFinishing}
                          </p>
                        </div>
                      )}

                      <div className={styles.modalActionsRow}>
                        <a
                          href={whatsappUrl(WHATSAPP_NUMBER, itemWaMsg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.modalWaBtn}
                        >
                          <MessageCircle size={16} />
                          <span>{isAr ? `استفسر عن ${itemTitle}` : `Inquire about ${itemTitle}`}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Full-screen Lightbox Modal ─────────────── */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.lightbox}
          >
            <button className={styles.closeBtn} onClick={() => setLightboxOpen(false)}>
              <X size={24} />
            </button>
            <div className={styles.lightboxCounter}>
              {activeImg + 1} / {images.length}
            </div>
            <div className={styles.lightboxContent}>
              <button className={styles.navBtn} onClick={prevImg}>
                <ChevronLeft size={28} />
              </button>
              <div className={styles.lightboxImgWrap}>
                <Image
                  src={images[activeImg].url}
                  alt={`${title} - ${activeImg + 1}`}
                  fill
                  sizes="90vw"
                  className={styles.lightboxImg}
                />
              </div>
              <button className={styles.navBtn} onClick={nextImg}>
                <ChevronRight size={28} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
