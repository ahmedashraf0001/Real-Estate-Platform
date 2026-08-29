'use client';
import React from 'react';
import { Property } from '@/types';
import { Bed, Bath, Maximize2, MapPin, Bookmark, ArrowUpRight, Calendar, Scale } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { decodeHtmlEntities, cleanHtmlToPlainText } from '@/lib/utils/propertyAdapter';
import { useFavorites } from '@/lib/context/FavoritesContext';
import { toast } from 'sonner';

import { useParams } from 'next/navigation';

interface PropertyCardProps {
  property: Property;
  onSelect: (propertyId: string) => void;
  index?: number;
  viewMode?: 'grid' | 'compact' | 'list';
  onToggleCompare?: (propertyId: string) => void;
  isCompared?: boolean;
  locale?: string;
}

const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.98,
    filter: 'blur(3px)'
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 24,
      mass: 0.8
    }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    filter: 'blur(4px)',
    transition: { duration: 0.2 }
  }
};

const KNOWN_AR_TITLES: Record<string, string> = {
  'the obsidian pavilion': 'قصر الأوبسيديان المعماري',
  'sodic east prime residence': 'شقة فاخرة بمشروع سوديك إيست – التجمع الخامس',
  'zayed central park garden residence': 'شقة أرضي بحديقة خاصة – الشيخ زايد',
  'aurum tower sky duplex': 'شقة دوبلكس سماوية ببرج أوروم – التجمع الخامس',
  'al-narges prime residential building (عمارة كاملة)': 'عمارة سكنية كاملة فاخرة – حي النرجس التجمع الخامس',
  'zayed horizon mixed-use building (عمارة تجارية وسكنية)': 'عمارة تجارية وسكنية متكاملة – الشيخ زايد',
  'madinaty privado roof suite & sky slab': 'شقة رووف كاملة مع السطح – مدينتي بريفادو',
  'new cairo automated parking facility & garage bays': 'جراج تجاري واستثماري خاص – التجمع الخامس',
  'monte galala cliffside apartment': 'شقة ساحلية بإطلالة جبلية وبحرية – العين السخنة',
  'hacienda waters luxury residence (off-plan)': 'شقة فاخرة قيد الإنشاء – هاسيندا ووترز الساحل الشمالي',
  'el gouna marina residential building (عمارة شقق بالجونة)': 'عمارة سكنية فاخرة مطلة على اللاجون – الجونة البحر الأحمر',
  'sokhna sea-cliff mansion': 'قصر جرف السخنة البانورامي',
  'the sky palace penthouse': 'بنتهاوس قصر السحاب بالشيخ زايد',
  'north coast seaside sanctuary': 'قصر هاسيندا الساحلي الفاخر',
  'gouna water sanctuary': 'فيلا الملاذ المائي بالجونة',
  'madinaty four seasons mansion': 'قصر فورسيزونز مدينتي الفاخر',
  'palatial neoclassical villa in beverly hills': 'فيلا مستقلة طراز متوسطي فاخر في بيفرلي هيلز',
  'ultra-luxury modern mansion in allegria': 'قصر عصري نقي فائق الفخامة في كمبوند أليجريا',
  'prime beachfront chalet in sidi abdel rahman': 'شاليه فاخر صف أول على البحر في سيدي عبد الرحمن',
  'panoramic luxury penthouse in katameya dunes': 'بنتهاوس فاخر بإطلالة بانورامية في قطامية ديونز'
};

const DISTRICT_AR_MAP: Record<string, string> = {
  'Abu Tig Marina': 'مارينا أبو تيج',
  'abu tig marina': 'مارينا أبو تيج',
  'Al-Narges Sector 2': 'النرجس الجديدة',
  'Al-Narges': 'حي النرجس',
  'Narges': 'حي النرجس',
  'Choueifat': 'الشويفات',
  'Fifth Settlement': 'التجمع الخامس',
  'Diplomats': 'حي الدبلوماسيين',
  'Tagamoa': 'التجمع الخامس',
  'New Cairo': 'القاهرة الجديدة',
  'Sheikh Zayed': 'الشيخ زايد',
  'North Coast': 'الساحل الشمالي',
  'North Coast (Sahel)': 'الساحل الشمالي',
  'Sidi Abdel Rahman': 'سيدي عبد الرحمن',
  'El Gouna': 'الجونة',
  'Gouna': 'الجونة',
  'Ain Sokhna': 'العين السخنة',
  'Madinaty': 'مدينتي',
  'Westown': 'ويست تاون',
  'Golden Square': 'المربع الذهبي',
  'Beverly Hills': 'بيفرلي هيلز',
  'Allegria': 'أليجريا',
  'Katameya Dunes': 'قطامية ديونز',
  'Sodic East': 'سوديك إيست',
  'Sodic East Estate': 'سوديك إيست',
  'Privado': 'بريفادو',
  'Zayed Dunes': 'زايد ديونز',
  'Palm Hills': 'بالم هيلز',
  'Hacienda Bay': 'هاسيندا باي',
  'Hacienda White': 'هاسيندا وايت',
  'Hacienda Waters': 'هاسيندا واترز',
  'Hacienda': 'هاسيندا',
  'hacienda waters': 'هاسيندا واترز',
  'hacienda bay': 'هاسيندا باي',
  'hacienda white': 'هاسيندا وايت',
  'Abu Tig Marina Estates': 'مارينا أبو تيج',
  'Monte Galala': 'المونت جلالة',
  'Monte Galala Estate': 'المونت جلالة',
  'Zayed Central Park': 'زايد سنترال بارك',
  'Four Seasons Privado': 'فورسيزونز بريفادو',
  'Marassi': 'مراسي',
  'Almaza Bay': 'ألماظة باي',
  'Silver Sands': 'سيلفر ساندز',
  'Ras El Hekma': 'رأس الحكمة',
  'Somabay': 'سوما باي',
  'Makadi Heights': 'مكادي هايتس',
  'Red Sea': 'البحر الأحمر',
  'South Sinai': 'جنوب سيناء',
  'Giza': 'الجيزة',
  'Cairo': 'القاهرة',
  'Alexandria': 'الإسكندرية',
  'Smart Village': 'القرية الذكية',
  'New Capital': 'العاصمة الإدارية',
  'Mostakbal City': 'مدينة المستقبل',
  'Al Shorouk': 'الشروق',
  'Al Rehab': 'الرحاب',
  'October': '٦ أكتوبر',
  '6th of October': 'مدينة ٦ أكتوبر',
};

export const getArabicDistrict = (rawDistrict: string): string => {
  if (!rawDistrict) return '';
  const trimmed = rawDistrict.trim();
  if (DISTRICT_AR_MAP[trimmed]) return DISTRICT_AR_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(DISTRICT_AR_MAP)) {
    if (key.toLowerCase() === lower || lower.includes(key.toLowerCase())) {
      return val;
    }
  }
  return trimmed;
};

const TYPE_AR_MAP: Record<string, string> = {
  'apartment': 'شقة سكنية',
  'building': 'عمارة كاملة',
  'garage': 'جراج وباكية',
  'Apartment': 'شقة سكنية',
  'Building (عمارة)': 'عمارة كاملة',
  'Building': 'عمارة كاملة',
  'Garage': 'جراج وباكية',
  'Duplex': 'شقة دوبلكس',
  'duplex': 'شقة دوبلكس',
  'Roof': 'شقة روف',
  'Ground': 'أرضي بحديقة',
};

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  index = 0,
  viewMode = 'grid',
  onToggleCompare,
  isCompared = false,
  locale: propLocale
}) => {
  const params = useParams();
  const currentLocale = (propLocale || (params?.locale as string) || 'en');
  const isAr = currentLocale === 'ar';

  const { isFavorite, toggleFavorite, setIsDrawerOpen } = useFavorites();
  const isSaved = isFavorite(property.id) || (property.slug ? isFavorite(property.slug) : false);



  const normalizedKey = (property.title || property.title_en || '').toLowerCase().trim();
  const rawTitle = isAr
    ? (property.title_ar || KNOWN_AR_TITLES[normalizedKey] || property.title || property.title_en || '')
    : (property.title_en || property.title || property.title_ar || '');
  const formattedTitle = decodeHtmlEntities(rawTitle);

  const rawDistrict = property.district || property.location?.split(',')[0]?.trim() || '';
  const formattedDistrict = isAr ? getArabicDistrict(rawDistrict) : rawDistrict;

  const rawType = property.propertyType || property.type || '';
  const formattedType = isAr ? (TYPE_AR_MAP[rawType] || rawType) : rawType;

  const formattedNarrative = cleanHtmlToPlainText(
    (isAr ? (property.description_ar || property.narrative || property.description) : (property.description_en || property.narrative || property.description)) || ''
  ) || (isAr ? 'صرح معماري استثنائي يجمع بين الفخامة الإنشائية والإطلالات البانورامية الخلابة.' : 'An exceptional luxury residence exhibiting bespoke architectural craftsmanship and panoramic landscaped vistas.');
  
  const formattedPrice = new Intl.NumberFormat('en-US').format(property.price);
  const pricePerSqm = new Intl.NumberFormat('en-US').format(Math.round(property.price / (property.sqm || 1)));

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowSaved = toggleFavorite(property);
    if (isNowSaved) {
      toast.success(isAr ? 'تم الحفظ في المحفظة المفضلة' : 'Saved to Private Portfolio Shortlist', {
        description: formattedTitle,
        action: {
          label: isAr ? 'عرض المحفظة' : 'View Shortlist',
          onClick: () => setIsDrawerOpen(true),
        },
      });
    } else {
      toast.info(isAr ? 'تمت الإزالة من المحفظة' : 'Removed from Saved Portfolio', {
        description: formattedTitle,
      });
    }
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        className="property-card-list"
        onClick={() => onSelect(property.id)}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Left Visual Media */}
        <div className="list-media-wrapper">
          <img src={property.images[0]} alt={formattedTitle} className="list-card-image" loading="lazy" />
          <div className="list-media-overlay" />

          {/* Top Location Badge */}
          <span className="location-badge list-badge">
            <MapPin size={15} className="badge-pin" />
            <span>{formattedDistrict}</span>
          </span>

          <div className="list-top-actions">
            {onToggleCompare && (
              <button
                className={`action-pill-btn ${isCompared ? 'compared' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompare(property.id);
                }}
                title={isCompared ? (isAr ? 'إزالة من المقارنة' : 'Remove from Comparison Matrix') : (isAr ? 'إضافة للمقارنة جنباً إلى جنب' : 'Add to Side-by-Side Comparison')}
              >
                <Scale size={16} />
              </button>
            )}

            <button
              className={`action-pill-btn ${isSaved ? 'saved' : ''}`}
              onClick={handleToggleSave}
              title={isSaved ? (isAr ? 'محفوظ في المفضلة' : 'Saved to Private Portfolio Shortlist') : (isAr ? 'حفظ في المفضلة' : 'Save to Shortlist')}
            >
              <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Center Architectural Details */}
        <div className="list-content-body">
          <div className="list-meta-tag">
            <span>{formattedDistrict}</span>
            <span className="tag-dot">•</span>
            <span className="gold-type">{formattedType}</span>
          </div>

          <h3 className="list-card-title">{formattedTitle}</h3>

          <p className="list-narrative">
            {formattedNarrative}
          </p>

          <div className="list-specs-row">
            <div className="list-spec-item">
              <Bed size={17} strokeWidth={2.2} className="list-spec-icon" />
              <span className="list-spec-text">
                <span className="list-spec-num">{property.beds}</span>
                <span className="list-spec-unit">{isAr ? 'غرف نوم' : 'Beds'}</span>
              </span>
            </div>

            <div className="list-spec-divider" />

            <div className="list-spec-item">
              <Bath size={17} strokeWidth={2.2} className="list-spec-icon" />
              <span className="list-spec-text">
                <span className="list-spec-num">{property.baths}</span>
                <span className="list-spec-unit">{isAr ? 'حمامات' : 'Baths'}</span>
              </span>
            </div>

            <div className="list-spec-divider" />

            <div className="list-spec-item">
              <Maximize2 size={16} strokeWidth={2.2} className="list-spec-icon" />
              <span className="list-spec-text">
                <span className="list-spec-num">{new Intl.NumberFormat('en-US').format(property.sqm)}</span>
                <span className="list-spec-unit">{isAr ? 'م²' : 'sqm'}</span>
              </span>
            </div>

            {property.builtYear && (
              <>
                <div className="list-spec-divider" />
                <div className="list-spec-item">
                  <Calendar size={16} strokeWidth={2.2} className="list-spec-icon" />
                  <span className="list-spec-text">
                    <span className="list-spec-unit">{isAr ? 'الاستلام' : 'Delivery'}</span>
                    <span className="list-spec-num">{property.builtYear}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Financials & Action Column */}
        <div className="list-actions-col">
          <div className="list-pricing-wrap">
            <span className="list-price-label">{isAr ? 'السعر الاسترشادي' : 'GUIDE PRICE'}</span>
            <div className="list-price-val">
              {formattedPrice} <span className="currency-unit">{isAr ? 'ج.م' : property.currency}</span>
            </div>
            <span className="list-sqm-rate">{pricePerSqm} {isAr ? 'ج.م / م²' : 'EGP / sqm'}</span>
          </div>

          <button className="btn-gold list-cta-btn">
            <span>{isAr ? 'معاينة الصرح' : 'Explore Estate'}</span>
            <ArrowUpRight size={15} />
          </button>
        </div>

        <style>{`
          .property-card-list {
            display: flex;
            align-items: center;
            backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
            -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
            border-radius: 22px;
            overflow: hidden;
            cursor: pointer;
            padding: 1.35rem 1.65rem;
            gap: 1.65rem;
            transition: all var(--transition-smooth);
          }

          [data-theme="dark"] .property-card-list {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.22) 0%,
              rgba(255, 255, 255, 0.06) 25%,
              rgba(18, 24, 38, 0.42) 60%,
              rgba(10, 14, 24, 0.65) 100%
            );
            border: 1px solid rgba(255, 255, 255, 0.28);
            box-shadow: 
              0 20px 48px rgba(0, 0, 0, 0.38),
              0 4px 14px rgba(0, 0, 0, 0.18),
              inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
              inset 0 -1px 1px rgba(255, 255, 255, 0.12);
          }

          [data-theme="light"] .property-card-list {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.65) 0%,
              rgba(255, 255, 255, 0.30) 35%,
              rgba(255, 255, 255, 0.48) 100%
            );
            border: 1px solid rgba(255, 255, 255, 0.75);
            box-shadow: 
              0 18px 44px rgba(15, 23, 42, 0.08), 
              inset 0 1.5px 2px #FFFFFF,
              inset 0 -1px 1px rgba(255, 255, 255, 0.25);
          }

          .property-card-list:hover {
            border-color: rgba(252, 211, 77, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 24px 56px rgba(0, 0, 0, 0.45);
          }

          .list-media-wrapper {
            position: relative;
            width: 240px;
            height: 165px;
            flex-shrink: 0;
            border-radius: 16px;
            overflow: hidden;
          }

          .list-card-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .list-media-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to bottom,
              rgba(10, 12, 16, 0.1) 0%,
              rgba(10, 12, 16, 0.45) 100%
            );
            pointer-events: none;
          }

          .list-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 2;
            padding: 0.35rem 0.85rem;
            font-size: 0.75rem;
            border-radius: var(--radius-full);
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-weight: 700;
          }

          [data-theme="dark"] .list-badge {
            background: rgba(10, 14, 22, 0.70);
            backdrop-filter: blur(28px) saturate(210%);
            -webkit-backdrop-filter: blur(28px) saturate(210%);
            border: 1px solid rgba(255, 255, 255, 0.24);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            color: #ffffff;
          }

          [data-theme="light"] .list-badge {
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(20px) saturate(190%);
            -webkit-backdrop-filter: blur(20px) saturate(190%);
            border: 1px solid rgba(255, 255, 255, 0.90);
            color: #0D1117;
            box-shadow: 0 4px 16px rgba(30, 24, 16, 0.08), inset 0 1.5px 1.5px #FFFFFF;
          }

          .list-top-actions {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 2;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .action-pill-btn {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
            cursor: pointer;
          }

          [data-theme="dark"] .action-pill-btn {
            background: rgba(10, 14, 22, 0.70);
            backdrop-filter: blur(28px) saturate(210%);
            -webkit-backdrop-filter: blur(28px) saturate(210%);
            border: 1px solid rgba(255, 255, 255, 0.24);
            color: #ffffff;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          }

          [data-theme="light"] .action-pill-btn {
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(20px) saturate(190%);
            -webkit-backdrop-filter: blur(20px) saturate(190%);
            border: 1px solid rgba(255, 255, 255, 0.90);
            color: #0D1117;
            box-shadow: 0 4px 16px rgba(30, 24, 16, 0.08), inset 0 1.5px 1.5px #FFFFFF;
          }

          .action-pill-btn:hover {
            color: var(--gold-primary);
            border-color: var(--gold-border);
            transform: translateY(-2px);
          }

          .action-pill-btn.saved, .action-pill-btn.compared {
            color: #0A0C10;
            background: linear-gradient(135deg, #FFF4D4 0%, var(--gold-primary) 50%, var(--gold-dark) 100%);
            border-color: var(--gold-primary);
            box-shadow: 0 0 12px var(--gold-glow);
          }

          .list-content-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
            min-width: 0;
          }

          .list-meta-tag {
            font-family: var(--font-heading);
            font-size: 0.6875rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .list-meta-tag {
            font-family: var(--font-heading);
            font-size: 0.6875rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 2px;
          }

          .tag-dot {
            opacity: 0.4;
          }

          .gold-type {
            color: #FCD34D;
          }

          [data-theme="light"] .gold-type {
            color: #B8860B;
          }

          .list-card-title {
            font-family: var(--font-heading);
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1.25;
            letter-spacing: -0.015em;
            margin-bottom: 0.35rem;
          }

          .list-narrative {
            font-size: 0.84rem;
            color: var(--text-secondary);
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin: 0 0 0.85rem;
          }

          /* Detail List Specs Row matching exact radiant aesthetic */
          .list-specs-row {
            display: flex;
            align-items: center;
            gap: 1.25rem;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
            padding-top: 0.75rem;
            border-top: 1px solid rgba(255, 255, 255, 0.14);
          }

          [data-theme="light"] .list-specs-row {
            border-top: 1px solid rgba(0, 0, 0, 0.08);
          }

          .list-spec-item {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
            white-space: nowrap;
          }

          .list-spec-icon {
            flex-shrink: 0;
            color: #FCD34D;
            filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
          }

          [data-theme="light"] .list-spec-icon {
            color: #B8860B;
            filter: none;
          }

          .list-spec-text {
            display: inline-flex;
            align-items: baseline;
            gap: 4px;
            white-space: nowrap;
            line-height: 1;
          }

          .list-spec-num {
            font-family: var(--font-heading);
            font-size: 0.875rem;
            font-weight: 700;
            color: var(--text-primary);
          }

          .list-spec-unit {
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--text-secondary);
          }

          .list-spec-divider {
            width: 1px;
            height: 14px;
            background: rgba(255, 255, 255, 0.2);
            flex-shrink: 0;
            margin: 0 2px;
          }

          [data-theme="light"] .list-spec-divider {
            background: rgba(0, 0, 0, 0.12);
          }

          .list-actions-col {
            width: 185px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: space-between;
            padding-left: 1.4rem;
            border-left: 1px solid rgba(255, 255, 255, 0.14);
            gap: 1rem;
          }

          [data-theme="light"] .list-actions-col {
            border-left: 1px solid rgba(0, 0, 0, 0.08);
          }

          .list-pricing-wrap {
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .list-price-label {
            font-family: var(--font-heading);
            font-size: 0.625rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            color: var(--text-muted);
            text-transform: uppercase;
          }

          .list-price-val {
            font-family: var(--font-heading);
            font-size: 1.3rem;
            font-weight: 800;
            line-height: 1.15;
            letter-spacing: -0.01em;
            color: #E5B869;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
          }

          [data-theme="light"] .list-price-val {
            color: #8C6826;
            text-shadow: none;
          }

          .list-sqm-rate {
            font-size: 0.75rem;
            color: var(--text-muted);
            font-weight: 600;
          }

          .list-cta-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 0.65rem 0.85rem;
            font-size: 0.8125rem;
            font-weight: 700;
            border-radius: 12px;
          }

          @media (max-width: 900px) {
            .property-card-list {
              flex-direction: column;
              align-items: stretch;
            }

            .list-media-wrapper {
              width: 100%;
              height: 220px;
            }

            .list-actions-col {
              width: 100%;
              border-left: none;
              border-top: 1px solid var(--border-subtle);
              padding-left: 0;
              padding-top: 1rem;
              flex-direction: row;
              align-items: center;
            }

            .list-pricing-wrap {
              text-align: left;
            }

            .list-cta-btn {
              width: auto;
            }
          }
        `}</style>
      </motion.div>
    );
  }

  // Default: Gallery Grid Card
  return (
    <motion.div 
      className={`property-card ${viewMode === 'compact' ? 'compact-card' : ''}`}
      onClick={() => onSelect(property.id)}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ 
        y: -6, 
        transition: { type: 'spring', stiffness: 350, damping: 24 } 
      }}
    >
      <div className="card-image-wrapper">
        <motion.img 
          src={property.images[0]} 
          alt={formattedTitle} 
          className="card-image"
          loading="lazy"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Top Badges */}
        <div className="card-top-bar">
          <span className="location-badge">
            <MapPin size={15} className="badge-pin" />
            <span>{formattedDistrict}</span>
          </span>

          <div className="card-top-actions">
            {onToggleCompare && (
              <button
                className={`action-pill-btn ${isCompared ? 'compared' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompare(property.id);
                }}
                title={isCompared ? (isAr ? 'إزالة من المقارنة' : 'Remove from Comparison Matrix') : (isAr ? 'إضافة للمقارنة جنباً إلى جنب' : 'Add to Side-by-Side Comparison')}
              >
                <Scale size={16} />
              </button>
            )}

            <button 
              className={`action-pill-btn ${isSaved ? 'saved' : ''}`}
              onClick={handleToggleSave}
              title={isSaved ? (isAr ? 'محفوظ في المفضلة' : 'Saved to Private Portfolio Shortlist') : (isAr ? 'حفظ في المفضلة' : 'Save to Shortlist')}
            >
              <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Floating Frosted Glass Panel */}
        <div className="card-content-overlay" dir={isAr ? 'rtl' : 'ltr'}>
          <h3 className="card-title">{formattedTitle}</h3>
          <div className="card-price" dir="ltr">
            <span className="price-amount">{formattedPrice}</span>
            <span className="currency-unit">{isAr ? 'ج.م' : property.currency}</span>
          </div>

          <div className="card-specs">
            <div className="spec-item">
              <Bed size={16} strokeWidth={2.2} className="spec-icon" />
              <span className="spec-label">{property.beds} {isAr ? 'غرف' : 'Beds'}</span>
            </div>

            <div className="spec-item">
              <Bath size={16} strokeWidth={2.2} className="spec-icon" />
              <span className="spec-label">{property.baths} {isAr ? 'حمامات' : 'Baths'}</span>
            </div>

            <div className="spec-item">
              <Maximize2 size={15} strokeWidth={2.2} className="spec-icon" />
              <span className="spec-label">{new Intl.NumberFormat('en-US').format(property.sqm)} {isAr ? 'م²' : 'sqm'}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .property-card {
          position: relative;
          background: #0E121B;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          overflow: hidden;
          cursor: pointer;
          height: 480px;
          display: flex;
          flex-direction: column;
          transition: all var(--transition-smooth);
        }

        [data-theme="light"] .property-card {
          background: #0E121B;
          border: 1px solid rgba(184, 133, 48, 0.2);
          box-shadow: 0 10px 30px rgba(30, 24, 16, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .property-card:hover {
          border-color: var(--gold-primary);
          box-shadow: var(--shadow-lg);
          transform: translateY(-4px);
        }

        [data-theme="light"] .property-card:hover {
          border-color: #B8934A;
          box-shadow: 0 20px 48px rgba(30, 24, 16, 0.14), 0 0 20px rgba(184, 133, 48, 0.18);
        }

        .card-image-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-bottom: 0.85rem;
        }

        .card-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card-top-bar {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1rem 0;
        }

        .location-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: var(--radius-full);
          padding: 0.35rem 0.85rem;
          font-size: 0.8125rem;
          font-weight: 700;
          background: rgba(10, 14, 22, 0.72);
          backdrop-filter: blur(20px) saturate(200%);
          -webkit-backdrop-filter: blur(20px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #ffffff;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4);
          transition: all var(--transition-fast);
        }

        .badge-pin {
          color: #E5B869;
        }

        .card-top-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-pill-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 14, 22, 0.72);
          backdrop-filter: blur(20px) saturate(200%);
          -webkit-backdrop-filter: blur(20px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #ffffff;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .action-pill-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          transform: translateY(-2px);
        }

        .action-pill-btn.saved, .action-pill-btn.compared {
          color: #0A0C10;
          background: linear-gradient(135deg, #FFF4D4 0%, var(--gold-primary) 50%, var(--gold-dark) 100%);
          border-color: var(--gold-primary);
          box-shadow: 0 0 12px var(--gold-glow);
        }

        /* Unified Smoked Liquid Glass Overlay (Consistent across Light & Dark modes) */
        .card-content-overlay {
          position: relative;
          z-index: 3;
          margin: 0 0.85rem;
          padding: 1.35rem 1.35rem 1.15rem;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(18, 24, 38, 0.55) 45%,
            rgba(10, 14, 24, 0.78) 100%
          );
          backdrop-filter: blur(24px) saturate(210%) contrast(108%) brightness(105%);
          -webkit-backdrop-filter: blur(24px) saturate(210%) contrast(108%) brightness(105%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 18px;
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.45),
            0 4px 14px rgba(0, 0, 0, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.15);
          transition: all var(--transition-smooth);
        }

        .card-title {
          font-family: var(--font-heading);
          font-size: 1.0625rem;
          font-weight: 700;
          color: #FFFFFF;
          line-height: 1.35;
          margin: 0 0 0.4rem 0;
          height: 2.85rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
          letter-spacing: -0.015em;
        }

        .card-price {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 1.15rem;
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          letter-spacing: -0.015em;
          line-height: 1.15;
        }

        .price-amount {
          color: #E5B869;
          font-weight: 800;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
        }

        .currency-unit {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #E5B869;
          opacity: 0.85;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        .card-specs {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.95rem;
          border-top: 1px solid rgba(255, 255, 255, 0.22);
        }

        .spec-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .spec-icon {
          flex-shrink: 0;
          color: #E5B869;
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
        }

        .spec-divider {
          width: 1px;
          height: 14px;
          flex-shrink: 0;
          margin: 0 2px;
          background: rgba(255, 255, 255, 0.22);
        }

        .spec-label {
          font-size: 0.8125rem;
          font-weight: 600;
          white-space: nowrap;
          letter-spacing: -0.01em;
          line-height: 1;
          color: #FFFFFF;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
        }

        /* Compact High-Density Card Mode */
        .property-card.compact-card {
          height: 380px;
          border-radius: 18px;
        }

        .property-card.compact-card .card-image-wrapper {
          height: 100%;
          padding-bottom: 0.65rem;
        }

        .property-card.compact-card .card-top-bar {
          padding: 0.75rem 0.75rem 0;
        }

        .property-card.compact-card .location-badge {
          padding: 0.25rem 0.65rem;
          font-size: 0.75rem;
        }

        .property-card.compact-card .action-pill-btn {
          width: 30px;
          height: 30px;
        }

        .property-card.compact-card .card-content-overlay {
          margin: 0 0.65rem;
          padding: 0.85rem 0.85rem;
          border-radius: 14px;
        }

        .property-card.compact-card .card-title {
          font-size: 0.9375rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .property-card.compact-card .card-price {
          font-size: 1.05rem;
          margin-bottom: 0.65rem;
        }

        .property-card.compact-card .card-specs {
          padding-top: 0.55rem;
        }

        .property-card.compact-card .spec-label {
          font-size: 0.72rem;
        }

        .property-card.compact-card .spec-icon {
          width: 13px;
          height: 13px;
        }

        @media (max-width: 640px) {
          .property-card {
            height: 440px;
            border-radius: 20px;
          }
          .card-top-bar {
            padding: 0.75rem 0.75rem 0;
          }
          .location-badge {
            padding: 0.25rem 0.65rem;
            font-size: 0.75rem;
          }
          .action-pill-btn {
            width: 32px;
            height: 32px;
          }
          .card-content-overlay {
            margin: 0 0.65rem;
            padding: 1.1rem 1rem 0.95rem;
            border-radius: 16px;
          }
          .card-title {
            font-size: 0.98rem;
            height: 2.7rem;
            margin-bottom: 0.35rem;
          }
          .card-price {
            font-size: 1.15rem;
            margin-bottom: 0.85rem;
          }
          .card-specs {
            padding-top: 0.75rem;
          }
          .spec-label {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </motion.div>
  );
};
