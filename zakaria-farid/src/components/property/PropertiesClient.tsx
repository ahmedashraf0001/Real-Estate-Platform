'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ArrowUpDown, LayoutGrid, List, Search, RotateCcw, MapPin, Building2, Bed, Tag, Sparkles } from 'lucide-react';
import SmartSearchDock from '@/components/search/SmartSearchDock';
import PropertyCard from './PropertyCard';
import ComparisonTray from './ComparisonTray';
import PropertyGridSkeleton from './PropertyGridSkeleton';
import type { Property } from '@/lib/supabase/types';
import styles from './PropertiesClient.module.css';

const PROPERTY_TYPES = ['villa', 'apartment', 'townhouse', 'duplex', 'chalet'] as const;
const LISTING_STATUSES = ['active', 'under_offer', 'sold'] as const;
const BED_OPTIONS = [1, 2, 3, 4, 5, 6];
const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'sort_newest' },
  { value: 'price_asc', labelKey: 'sort_price_asc' },
  { value: 'price_desc', labelKey: 'sort_price_desc' },
] as const;

interface PropertiesClientProps {
  properties: Property[];
  locale: string;
  initialParams: Record<string, string | undefined>;
}

export default function PropertiesClient({ properties, locale, initialParams }: PropertiesClientProps) {
  const t = useTranslations('properties');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareList, setCompareList] = useState<Property[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isAr = locale === 'ar';

  const [filters, setFilters] = useState({
    location: initialParams.location ?? '',
    type: initialParams.type ?? '',
    status: initialParams.status ?? '',
    bedrooms: initialParams.bedrooms ?? '',
    sort: initialParams.sort ?? 'newest',
  });

  function applyFilters(newFilters: typeof filters) {
    const params = new URLSearchParams();
    if (newFilters.location) params.set('location', newFilters.location);
    if (newFilters.type) params.set('type', newFilters.type);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.bedrooms) params.set('bedrooms', newFilters.bedrooms);
    if (newFilters.sort && newFilters.sort !== 'newest') params.set('sort', newFilters.sort);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    applyFilters(next);
  }

  function clearFilters() {
    const reset = { location: '', type: '', status: '', bedrooms: '', sort: 'newest' };
    setFilters(reset);
    startTransition(() => router.push(pathname));
  }

  const activeFilterChips = [
    filters.location && { key: 'location', label: filters.location },
    filters.type && { key: 'type', label: t(`type_${filters.type}` as Parameters<typeof t>[0]) },
    filters.status && { key: 'status', label: t(`status_${filters.status}` as Parameters<typeof t>[0]) },
    filters.bedrooms && { key: 'bedrooms', label: `${filters.bedrooms}+ ${t('beds')}` },
  ].filter(Boolean) as { key: string; label: string }[];

  function handleCompare(property: Property) {
    setCompareList((prev) => {
      if (prev.find((p) => p.id === property.id)) return prev.filter((p) => p.id !== property.id);
      if (prev.length >= 3) return prev;
      return [...prev, property];
    });
  }

  return (
    <div className={styles.root}>
      {/* ─── Hero Banner ──────────────────────────── */}
      <div className={styles.heroHeader}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={styles.heroOverlay} aria-hidden="true" />
        
        <div className={`container ${styles.heroContent}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.heroLabelRow}>
              <Sparkles size={14} className={styles.goldSparkle} />
              <span className={styles.heroLabel}>
                {isAr ? 'المحفظة العقارية الحصرية' : 'Curated Property Portfolio'}
              </span>
            </div>
            <h1 className={styles.heroTitle}>{t('title')}</h1>
            <p className={styles.heroSub}>
              {isAr
                ? `تصفح ${properties.length} عقار فاخر متاح مباشرة من المالك وبدون أي عمولات.`
                : `Explore ${properties.length} verified luxury properties directly from the owner with zero commission.`}
            </p>
          </motion.div>

          {/* Real-Time Smart Search Dock */}
          <motion.div
            className={styles.heroSearchWrapper}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <SmartSearchDock
              locale={locale}
              initialQuery={filters.location}
              initialType={filters.type}
              onFilterChange={(loc, type) => {
                const next = { ...filters, location: loc, type: type };
                setFilters(next);
                applyFilters(next);
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* ─── Main Content Layout ────────────────────── */}
      <div className={`container ${styles.layout}`}>
        {/* Desktop Filter Panel */}
        <aside className={styles.filterRail}>
          <FilterPanel
            filters={filters}
            updateFilter={(k, v) => updateFilter(k as keyof typeof filters, v)}
            clearFilters={clearFilters}
            hasActive={activeFilterChips.length > 0}
            t={t}
            isAr={isAr}
          />
        </aside>

        {/* Results Column */}
        <div className={styles.results}>
          {/* Toolbar Bar */}
          <div className={styles.toolbar}>
            {/* Active Chips */}
            <div className={styles.chips}>
              {activeFilterChips.map((chip) => (
                <motion.button
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={styles.activeChip}
                  onClick={() => updateFilter(chip.key as keyof typeof filters, '')}
                >
                  <span>{chip.label}</span>
                  <X size={12} strokeWidth={2.5} />
                </motion.button>
              ))}
              {activeFilterChips.length > 0 && (
                <button className={styles.resetLink} onClick={clearFilters}>
                  <RotateCcw size={12} />
                  <span>{t('clear_filters')}</span>
                </button>
              )}
            </div>

            {/* Right Controls (View Toggle + Sort) */}
            <div className={styles.controlsRight}>
              {/* View Switcher */}
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('grid')}
                  title={isAr ? 'عرض شبكي' : 'Grid View'}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('list')}
                  title={isAr ? 'عرض قائمة' : 'List View'}
                >
                  <List size={16} />
                </button>
              </div>

              {/* Sort Select */}
              <div className={styles.sortWrapper}>
                <ArrowUpDown size={14} className={styles.sortIcon} />
                <select
                  className={styles.sortSelect}
                  value={filters.sort}
                  onChange={(e) => updateFilter('sort', e.target.value)}
                >
                  {SORT_OPTIONS.map(({ value, labelKey }) => (
                    <option key={value} value={value}>{t(labelKey)}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Filter Button */}
              <button className={styles.mobileFilterBtn} onClick={() => setDrawerOpen(true)}>
                <SlidersHorizontal size={15} />
                <span>{t('filters')}</span>
                {activeFilterChips.length > 0 && (
                  <span className={styles.badgeCount}>{activeFilterChips.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* Result Content */}
          {isPending ? (
            <PropertyGridSkeleton />
          ) : properties.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🏢</div>
              <h3 className={styles.emptyTitle}>{t('no_results_title')}</h3>
              <p className={styles.emptyDesc}>{t('no_results_desc')}</p>
              <button className={styles.clearAllBtn} onClick={clearFilters}>
                <RotateCcw size={14} />
                {t('clear_filters')}
              </button>
            </div>
          ) : (
            <motion.div
              className={viewMode === 'grid' ? styles.grid : styles.listGrid}
              layout
            >
              <AnimatePresence mode="popLayout">
                {properties.map((property) => (
                  <motion.div
                    key={property.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    <PropertyCard
                      property={property}
                      locale={locale}
                      onCompare={handleCompare}
                      isInCompare={!!compareList.find((p) => p.id === property.id)}
                      viewMode={viewMode}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className={styles.drawerBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className={styles.drawer}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className={styles.drawerHeader}>
                <div className={styles.drawerTitleRow}>
                  <SlidersHorizontal size={18} />
                  <span>{t('filters')}</span>
                </div>
                <button className={styles.closeDrawerBtn} onClick={() => setDrawerOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <FilterPanel
                filters={filters}
                updateFilter={(k, v) => { updateFilter(k as keyof typeof filters, v); setDrawerOpen(false); }}
                clearFilters={() => { clearFilters(); setDrawerOpen(false); }}
                hasActive={activeFilterChips.length > 0}
                t={t}
                isAr={isAr}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comparison Tray */}
      <ComparisonTray
        properties={compareList}
        locale={locale}
        onRemove={(id) => setCompareList((prev) => prev.filter((p) => p.id !== id))}
        onClose={() => setCompareList([])}
      />
    </div>
  );
}

// ─── Filter Panel Component ───────────────────────────────────────
function FilterPanel({ filters, updateFilter, clearFilters, hasActive, t, isAr }: {
  filters: Record<string, string>;
  updateFilter: (k: string, v: string) => void;
  clearFilters: () => void;
  hasActive: boolean;
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
}) {
  return (
    <div className={styles.filterCard}>
      <div className={styles.filterCardHeader}>
        <div className={styles.filterHeading}>
          <SlidersHorizontal size={16} className={styles.filterHeadingIcon} />
          <span>{t('filters')}</span>
        </div>
        {hasActive && (
          <button className={styles.clearLink} onClick={clearFilters}>
            <RotateCcw size={12} />
            <span>{t('clear_filters')}</span>
          </button>
        )}
      </div>

      {/* Property Type */}
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          <Building2 size={14} />
          <span>{t('type')}</span>
        </label>
        <div className={styles.pillGrid}>
          <button
            className={`${styles.filterPill} ${!filters.type ? styles.filterPillActive : ''}`}
            onClick={() => updateFilter('type', '')}
          >
            {t('any')}
          </button>
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              className={`${styles.filterPill} ${filters.type === type ? styles.filterPillActive : ''}`}
              onClick={() => updateFilter('type', filters.type === type ? '' : type)}
            >
              {t(`type_${type}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Bedrooms */}
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          <Bed size={14} />
          <span>{t('bedrooms')}</span>
        </label>
        <div className={styles.pillGrid}>
          <button
            className={`${styles.filterPill} ${!filters.bedrooms ? styles.filterPillActive : ''}`}
            onClick={() => updateFilter('bedrooms', '')}
          >
            {t('any')}
          </button>
          {BED_OPTIONS.map((n) => (
            <button
              key={n}
              className={`${styles.filterPill} ${filters.bedrooms === String(n) ? styles.filterPillActive : ''}`}
              onClick={() => updateFilter('bedrooms', filters.bedrooms === String(n) ? '' : String(n))}
            >
              {n}+
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          <Tag size={14} />
          <span>{t('status')}</span>
        </label>
        <div className={styles.pillGrid}>
          <button
            className={`${styles.filterPill} ${!filters.status ? styles.filterPillActive : ''}`}
            onClick={() => updateFilter('status', '')}
          >
            {t('any')}
          </button>
          {LISTING_STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.filterPill} ${filters.status === s ? styles.filterPillActive : ''}`}
              onClick={() => updateFilter('status', filters.status === s ? '' : s)}
            >
              {t(`status_${s}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
