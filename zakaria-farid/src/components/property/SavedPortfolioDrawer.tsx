'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, ExternalLink, Trash2, ArrowRight, Building2, Bed, Bath, Maximize2, Loader2 } from 'lucide-react';
import { useFavorites } from '@/lib/context/FavoritesContext';
import { Property } from '@/types';
import { useRouter } from 'next/navigation';

interface SavedPortfolioDrawerProps {
  properties?: Property[];
  locale?: string;
}

export const SavedPortfolioDrawer: React.FC<SavedPortfolioDrawerProps> = ({
  properties = [],
  locale = 'en'
}) => {
  const isAr = locale === 'ar';
  const router = useRouter();
  const { favoriteIds, savedProperties, removeFavorite, clearFavorites, isDrawerOpen, setIsDrawerOpen, isLoading } = useFavorites();

  // Robust merge: context saved properties + passed properties, deduped by ID/slug
  const allCandidates = [...(savedProperties || []), ...(properties || [])];
  const seenIds = new Set<string>();
  const savedList: Property[] = [];

  for (const p of allCandidates) {
    const canonicalId = p.slug || p.id;
    if (!canonicalId || seenIds.has(canonicalId)) continue;

    const isMatch = (favoriteIds && (favoriteIds.includes(p.id) || (p.slug ? favoriteIds.includes(p.slug) : false))) || 
                    (savedProperties && savedProperties.some(sp => (sp.id && sp.id === p.id) || (sp.slug && p.slug && sp.slug === p.slug)));

    if (isMatch) {
      seenIds.add(canonicalId);
      savedList.push(p);
    }
  }

  const handleSelect = (property: Property) => {
    setIsDrawerOpen(false);
    router.push(`/${locale}/properties/${property.slug || property.id}`);
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="saved-portfolio-backdrop" onClick={() => setIsDrawerOpen(false)} dir={isAr ? 'rtl' : 'ltr'}>
          <motion.div
            className="saved-portfolio-drawer"
            initial={{ x: 480, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 480, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="drawer-header">
              <div className="drawer-title-row">
                <div className="drawer-icon-wrap">
                  <Bookmark size={18} className="gold-icon" fill="currentColor" />
                </div>
                <div>
                  <span className="drawer-eyebrow">{isAr ? 'المجموعة الخاصة' : 'PRIVATE SHORTLIST'}</span>
                  <h3 className="drawer-title">
                    {isAr ? 'محفظة العقارات المحفوظة' : 'Saved Portfolio Shortlist'}
                  </h3>
                  <span className="drawer-subtitle">
                    {isAr 
                      ? `${savedList.length || favoriteIds.length} عقارات محفوظة` 
                      : `${savedList.length || favoriteIds.length} estates saved in browser`}
                  </span>
                </div>
              </div>

              <div className="drawer-header-actions">
                {(savedList.length > 0 || favoriteIds.length > 0) && (
                  <button
                    className="drawer-clear-btn"
                    onClick={clearFavorites}
                    title={isAr ? 'مسح الكل' : 'Clear all'}
                    type="button"
                  >
                    <Trash2 size={13} />
                    <span>{isAr ? 'مسح' : 'Clear'}</span>
                  </button>
                )}
                <button
                  className="drawer-close-btn"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="drawer-body">
              {isLoading && savedList.length === 0 && favoriteIds.length > 0 ? (
                <div className="drawer-loading-state">
                  <Loader2 size={30} className="spinner gold-spinner" />
                  <p className="loading-label">{isAr ? 'جاري مزامنة العقارات المحفوظة...' : 'Syncing your saved portfolio...'}</p>
                </div>
              ) : savedList.length === 0 ? (
                <div className="drawer-empty-state">
                  <div className="empty-bookmark-box">
                    <Bookmark size={32} strokeWidth={1.5} />
                  </div>
                  <h4 className="empty-title">
                    {isAr ? 'لا توجد عقارات محفوظة بعد' : 'No saved estates yet'}
                  </h4>
                  <p className="empty-desc">
                    {isAr 
                      ? 'انقر على أيقونة الحفظ في أي بطاقة عقار لإضافته إلى محفظتك الخاصة والوصول إليه في أي وقت.'
                      : 'Click the bookmark icon on any property card to curate your private selection for easy review.'}
                  </p>
                  <button
                    className="btn-gold empty-browse-btn"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      router.push(`/${locale}/properties`);
                    }}
                    type="button"
                  >
                    <span>{isAr ? 'استعراض العقارات المتاحة' : 'Browse Available Estates'}</span>
                    <ArrowRight size={15} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                  </button>
                </div>
              ) : (
                <div className="drawer-cards-list">
                  {savedList.map((item) => {
                    const propImg = (item.images && item.images.length > 0 ? item.images[0] : null) || 
                                    (item as any).image_url || 
                                    ((item as any).property_images && (item as any).property_images.length > 0 ? (item as any).property_images[0].url : null) ||
                                    '/images/hero-modern-villa.png';
                    const propTitle = isAr ? (item.title_ar || item.title || 'عقار فاخر') : (item.title_en || item.title || 'Luxury Estate');
                    const propDistrict = item.district || (item as any).location || (isAr ? 'موقع مميز' : 'Prime District');
                    const formattedPrice = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US').format(item.price || item.price_egp || 0);

                    return (
                      <div key={item.id || item.slug} className="drawer-prop-card" onClick={() => handleSelect(item)}>
                        <div className="drawer-prop-img-wrap">
                          <img src={propImg} alt={propTitle} className="drawer-prop-img" />
                        </div>
                        <div className="drawer-prop-meta">
                          <div className="drawer-prop-top">
                            <span className="drawer-prop-district">{propDistrict}</span>
                            <button
                              className="drawer-remove-item-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFavorite(item.id);
                                if (item.slug) removeFavorite(item.slug);
                              }}
                              title={isAr ? 'إزالة من المحفوظات' : 'Remove from shortlist'}
                              type="button"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <h4 className="drawer-prop-title">{propTitle}</h4>
                          <div className="drawer-prop-specs">
                            <span>{item.beds || (item as any).bedrooms || 0} {isAr ? 'غرف' : 'Beds'}</span>
                            <span>•</span>
                            <span>{item.baths || (item as any).bathrooms || 0} {isAr ? 'حمام' : 'Baths'}</span>
                            <span>•</span>
                            <span>{item.sqm || (item as any).area_sqm || 0} m²</span>
                          </div>
                          <div className="drawer-prop-price">
                            {formattedPrice} {isAr ? 'ج.م' : 'EGP'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {savedList.length > 0 && (
              <div className="drawer-footer">
                <button
                  className="btn-gold drawer-compare-btn"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push(`/${locale}/properties`);
                  }}
                  type="button"
                >
                  <Building2 size={16} />
                  <span>{isAr ? 'استكشاف المزيد في الكتالوج' : 'Explore Full Catalog'}</span>
                </button>
              </div>
            )}
          </motion.div>

          <style>{`
            .saved-portfolio-backdrop {
              position: fixed;
              inset: 0;
              z-index: 99999;
              background: rgba(8, 11, 19, 0.55);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              display: flex;
              align-items: center;
              justify-content: flex-end;
              padding: 1.5rem;
            }

            /* Drawer is anchored to the right edge in both languages
               (dir="rtl" flips flex, so flex-start = right in Arabic)
               and always slides in from the right to match. */
            .saved-portfolio-backdrop[dir="rtl"],
            [dir="rtl"] .saved-portfolio-backdrop {
              justify-content: flex-start !important;
            }

            /* Floating Glass Island Drawer */
            .saved-portfolio-drawer {
              width: min(430px, calc(100vw - 3rem));
              height: calc(100vh - 3rem);
              max-height: 940px;
              border-radius: 28px;
              backdrop-filter: blur(36px) saturate(220%) contrast(108%);
              -webkit-backdrop-filter: blur(36px) saturate(220%) contrast(108%);
              display: flex;
              flex-direction: column;
              overflow: hidden;
              transition: all var(--transition-smooth);
            }

            [data-theme="dark"] .saved-portfolio-drawer {
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.18) 0%,
                rgba(255, 255, 255, 0.04) 20%,
                rgba(18, 24, 38, 0.60) 50%,
                rgba(10, 14, 24, 0.88) 100%
              );
              border: 1px solid rgba(229, 184, 105, 0.28);
              box-shadow: 
                0 24px 64px rgba(0, 0, 0, 0.65),
                inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
                inset 0 -1px 1px rgba(255, 255, 255, 0.10);
            }

            [data-theme="light"] .saved-portfolio-drawer {
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.94) 0%,
                rgba(250, 248, 243, 0.85) 100%
              );
              border: 1px solid rgba(184, 147, 74, 0.32);
              box-shadow: 0 20px 50px rgba(30, 24, 16, 0.12), inset 0 1.5px 2px #FFFFFF;
            }

            @media (max-width: 640px) {
              .saved-portfolio-backdrop {
                padding: 0.75rem;
              }

              .saved-portfolio-drawer {
                width: 100%;
                height: calc(100vh - 1.5rem);
                border-radius: 20px;
              }
            }

            .drawer-header {
              padding: 1.5rem 1.6rem 1.25rem;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid rgba(255, 255, 255, 0.12);
            }

            .drawer-eyebrow {
              font-family: var(--font-heading);
              font-size: 0.625rem;
              font-weight: 800;
              letter-spacing: 0.14em;
              color: #E5B869;
              text-transform: uppercase;
              display: block;
              margin-bottom: 1px;
            }

            [data-theme="light"] .drawer-eyebrow {
              color: #8C6826;
            }

            [data-theme="light"] .drawer-header {
              border-bottom-color: rgba(184, 147, 74, 0.2);
            }

            .drawer-title-row {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .drawer-icon-wrap {
              width: 42px;
              height: 42px;
              border-radius: 12px;
              background: rgba(229, 184, 105, 0.15);
              border: 1px solid rgba(229, 184, 105, 0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
            }

            [data-theme="light"] .drawer-icon-wrap {
              background: rgba(184, 147, 74, 0.12);
              border-color: rgba(184, 147, 74, 0.3);
            }

            .gold-icon {
              color: #E5B869;
            }

            [data-theme="light"] .gold-icon {
              color: #8C6826;
            }

            .drawer-title {
              font-family: var(--font-heading);
              font-size: 1.08rem;
              font-weight: 800;
              color: #FFFFFF;
              margin: 0;
              letter-spacing: -0.01em;
            }

            [data-theme="light"] .drawer-title {
              color: #141210;
            }

            .drawer-subtitle {
              font-size: 0.75rem;
              color: rgba(255, 255, 255, 0.65);
              display: block;
              margin-top: 2px;
            }

            [data-theme="light"] .drawer-subtitle {
              color: #64748B;
            }

            .drawer-header-actions {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .drawer-clear-btn {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 9999px;
              padding: 0.4rem 0.75rem;
              font-size: 0.75rem;
              font-weight: 700;
              color: rgba(255, 255, 255, 0.7);
              cursor: pointer;
              transition: all var(--transition-fast);
              backdrop-filter: blur(10px);
            }

            [data-theme="light"] .drawer-clear-btn {
              background: rgba(0, 0, 0, 0.04);
              border-color: rgba(0, 0, 0, 0.08);
              color: #475569;
            }

            .drawer-clear-btn:hover {
              color: #EF4444;
              border-color: rgba(239, 68, 68, 0.4);
              background: rgba(239, 68, 68, 0.12);
            }

            .drawer-close-btn {
              width: 36px;
              height: 36px;
              border-radius: 9999px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.12);
              color: rgba(255, 255, 255, 0.75);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all var(--transition-fast);
              backdrop-filter: blur(10px);
            }

            [data-theme="light"] .drawer-close-btn {
              background: rgba(0, 0, 0, 0.04);
              border-color: rgba(0, 0, 0, 0.08);
              color: #475569;
            }

            .drawer-close-btn:hover {
              color: #FFFFFF;
              border-color: #E5B869;
              background: rgba(229, 184, 105, 0.15);
              transform: scale(1.05);
            }

            [data-theme="light"] .drawer-close-btn:hover {
              color: #141210;
              border-color: #8C6826;
            }

            .drawer-body {
              flex: 1;
              overflow-y: auto;
              padding: 1.25rem;
            }

            .drawer-loading-state {
              padding: 4rem 1rem;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 14px;
            }

            .gold-spinner {
              color: #E5B869;
              animation: spin 1s linear infinite;
            }

            .loading-label {
              font-size: 0.85rem;
              color: rgba(255, 255, 255, 0.7);
              font-weight: 600;
            }

            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            .drawer-empty-state {
              padding: 3.5rem 1rem;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .empty-bookmark-box {
              width: 68px;
              height: 68px;
              border-radius: 50%;
              background: rgba(229, 184, 105, 0.12);
              border: 1px solid rgba(229, 184, 105, 0.3);
              color: #E5B869;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 1.25rem;
              box-shadow: 0 0 20px rgba(229, 184, 105, 0.15);
            }

            .empty-title {
              font-family: var(--font-heading);
              font-size: 1.15rem;
              font-weight: 700;
              color: #FFFFFF;
              margin: 0 0 0.5rem 0;
            }

            [data-theme="light"] .empty-title {
              color: #141210;
            }

            .empty-desc {
              font-size: 0.85rem;
              color: rgba(255, 255, 255, 0.65);
              line-height: 1.6;
              margin: 0 0 1.5rem 0;
              max-width: 300px;
            }

            [data-theme="light"] .empty-desc {
              color: #64748B;
            }

            .empty-browse-btn {
              padding: 0.85rem 1.4rem;
              font-size: 0.875rem;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              border-radius: 14px;
            }

            .drawer-cards-list {
              display: flex;
              flex-direction: column;
              gap: 0.95rem;
            }

            .drawer-prop-card {
              display: flex;
              gap: 12px;
              padding: 0.95rem;
              border-radius: 16px;
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
              cursor: pointer;
              transition: all var(--transition-fast);
            }

            [data-theme="dark"] .drawer-prop-card {
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.08) 0%,
                rgba(255, 255, 255, 0.02) 40%,
                rgba(18, 24, 38, 0.55) 100%
              );
              border: 1px solid rgba(255, 255, 255, 0.12);
              box-shadow: 
                0 6px 20px rgba(0, 0, 0, 0.3),
                inset 0 1.5px 2px rgba(255, 255, 255, 0.25);
            }

            [data-theme="light"] .drawer-prop-card {
              background: rgba(255, 255, 255, 0.8);
              border: 1px solid rgba(184, 147, 74, 0.2);
              box-shadow: 0 4px 16px rgba(30, 24, 16, 0.04), inset 0 1px 1px #FFFFFF;
            }

            [data-theme="dark"] .drawer-prop-card:hover {
              border-color: rgba(229, 184, 105, 0.5);
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.12) 0%,
                rgba(229, 184, 105, 0.08) 40%,
                rgba(18, 24, 38, 0.65) 100%
              );
              transform: translateY(-2px);
              box-shadow: 
                0 10px 28px rgba(0, 0, 0, 0.4),
                0 0 16px rgba(229, 184, 105, 0.15),
                inset 0 1.5px 2px rgba(255, 255, 255, 0.4);
            }

            [data-theme="light"] .drawer-prop-card:hover {
              border-color: rgba(184, 147, 74, 0.45);
              background: #FFFFFF;
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(30, 24, 16, 0.08);
            }

            .drawer-prop-img-wrap {
              width: 90px;
              height: 75px;
              border-radius: 12px;
              overflow: hidden;
              flex-shrink: 0;
              border: 1px solid rgba(255, 255, 255, 0.15);
            }

            [data-theme="light"] .drawer-prop-img-wrap {
              border-color: rgba(0, 0, 0, 0.06);
            }

            .drawer-prop-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.4s ease;
            }

            .drawer-prop-card:hover .drawer-prop-img {
              transform: scale(1.06);
            }

            .drawer-prop-meta {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .drawer-prop-top {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }

            .drawer-prop-district {
              font-size: 0.6875rem;
              font-weight: 800;
              color: #E5B869;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }

            [data-theme="light"] .drawer-prop-district {
              color: #8C6826;
            }

            .drawer-remove-item-btn {
              background: transparent;
              border: none;
              color: rgba(255, 255, 255, 0.5);
              cursor: pointer;
              padding: 3px;
              transition: color var(--transition-fast);
            }

            [data-theme="light"] .drawer-remove-item-btn {
              color: #94A3B8;
            }

            .drawer-remove-item-btn:hover {
              color: #EF4444;
            }

            .drawer-prop-title {
              font-family: var(--font-heading);
              font-size: 0.875rem;
              font-weight: 700;
              color: #FFFFFF;
              margin: 2px 0 4px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            [data-theme="light"] .drawer-prop-title {
              color: #141210;
            }

            .drawer-prop-specs {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.72rem;
              color: rgba(255, 255, 255, 0.65);
            }

            [data-theme="light"] .drawer-prop-specs {
              color: #64748B;
            }

            .drawer-prop-price {
              font-family: var(--font-heading);
              font-size: 0.95rem;
              font-weight: 800;
              color: #E5B869;
              margin-top: 4px;
              text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
            }

            [data-theme="light"] .drawer-prop-price {
              color: #8C6826;
              text-shadow: none;
            }

            .drawer-footer {
              padding: 1.25rem 1.5rem;
              border-top: 1px solid rgba(255, 255, 255, 0.12);
            }

            [data-theme="light"] .drawer-footer {
              border-top-color: rgba(184, 147, 74, 0.2);
            }

            .drawer-compare-btn {
              width: 100%;
              padding: 0.9rem 1.25rem;
              border-radius: 14px;
              font-size: 0.875rem;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              box-shadow: 0 4px 18px rgba(229, 184, 105, 0.35);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
};
