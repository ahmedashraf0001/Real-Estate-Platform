'use client';

import React from 'react';
import { 
  Search, 
  X, 
  ArrowUpDown, 
  RotateCcw, 
  Table, 
  LayoutGrid 
} from 'lucide-react';
import styles from './ZFWorkstationShell.module.css';

export interface ZFFilterTab {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

export interface ZFFilterDropdown {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

export interface ZFSortOption {
  value: string;
  label: string;
}

export interface ZFFilterToolbarProps {
  // Primary Tabs
  tabs?: ZFFilterTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;

  // Instant Search Box
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;

  // Additional Filter Dropdowns
  filters?: ZFFilterDropdown[];

  // Multi-Criteria Sort Selector
  sortBy?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: ZFSortOption[];
  sortAriaLabel?: string;

  // Reset Filters Button
  activeFiltersCount?: number;
  onResetFilters?: () => void;
  resetLabel?: string;

  // View Mode Switcher
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  viewModeOptions?: Array<{ mode: 'table' | 'cards'; label?: string; icon?: React.ReactNode }>;

  // Custom Extension Slots
  customActions?: React.ReactNode;
  children?: React.ReactNode;

  isAr?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ZFFilterToolbar: React.FC<ZFFilterToolbarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  filters,
  sortBy,
  onSortChange,
  sortOptions,
  sortAriaLabel,
  activeFiltersCount = 0,
  onResetFilters,
  resetLabel,
  viewMode,
  onViewModeChange,
  viewModeOptions,
  customActions,
  children,
  isAr = true,
  className,
  style
}) => {
  const hasTabs = tabs && tabs.length > 0;
  const hasSearch = onSearchChange !== undefined;
  const hasFilters = filters && filters.length > 0;
  const hasSort = sortBy !== undefined && onSortChange !== undefined && sortOptions && sortOptions.length > 0;
  const hasReset = activeFiltersCount > 0 && onResetFilters !== undefined;
  const hasViewMode = viewMode !== undefined && onViewModeChange !== undefined;

  const defaultViewOptions: Array<{ mode: 'table' | 'cards'; label?: string; icon?: React.ReactNode }> = [
    { mode: 'table', label: isAr ? 'جدول' : 'Table', icon: <Table size={13} /> },
    { mode: 'cards', label: isAr ? 'بطاقات' : 'Cards', icon: <LayoutGrid size={13} /> }
  ];
  const activeViewOptions = viewModeOptions || defaultViewOptions;

  return (
    <div className={`${styles.toolbar} ${className || ''}`} style={style}>
      {/* Primary Side: Category / Status Filter Tabs */}
      {hasTabs && (
        <div className={styles.tabBar} role="tablist">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange?.(tab.id)}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              >
                {tab.icon && <span>{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={styles.tabBadge}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Secondary Side: Search, Filters, Sort, Reset, and View Mode */}
      <div className={styles.toolbarControls}>
        {/* Custom Children or prepend slots */}
        {children}

        {/* Instant Search Box */}
        {hasSearch && (
          <div className={styles.searchBox}>
            <Search size={14} color="#64748b" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || (isAr ? 'بحث سريع...' : 'Search...')}
              className={styles.searchInput}
            />
            {Boolean(searchQuery) && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className={styles.searchClearBtn}
                title={isAr ? 'مسح عبارة البحث' : 'Clear search'}
                aria-label={isAr ? 'مسح عبارة البحث' : 'Clear search'}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Additional Criteria Dropdowns */}
        {hasFilters && filters.map(filter => (
          <div key={filter.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {filter.icon && <span>{filter.icon}</span>}
            <select
              value={filter.value}
              onChange={e => filter.onChange(e.target.value)}
              className={styles.sortSelect}
              aria-label={filter.ariaLabel || filter.id}
            >
              {filter.options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Multi-Criteria Sort Selector */}
        {hasSort && (
          <div className={styles.sortBox}>
            <ArrowUpDown size={13} color="#64748b" style={{ flexShrink: 0 }} />
            <select
              value={sortBy}
              onChange={e => onSortChange(e.target.value)}
              className={styles.sortSelect}
              aria-label={sortAriaLabel || (isAr ? 'ترتيب النتائج' : 'Sort results')}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset Active Filters Button */}
        {hasReset && (
          <button
            type="button"
            onClick={onResetFilters}
            className={styles.resetFilterBtn}
            title={isAr ? 'إعادة ضبط كافة الفلاتر والبحث' : 'Reset all active filters'}
            aria-label={isAr ? 'إعادة ضبط كافة الفلاتر والبحث' : 'Reset all active filters'}
          >
            <RotateCcw size={12} style={{ flexShrink: 0 }} />
            <span>{resetLabel || (isAr ? 'إعادة ضبط' : 'Reset')}</span>
            <span className={styles.filterCountBadge}>{activeFiltersCount}</span>
          </button>
        )}

        {/* View Mode Switcher (Table vs Cards) */}
        {hasViewMode && (
          <div className={styles.viewModeGroup} role="group" aria-label={isAr ? 'نمط العرض' : 'View mode'}>
            {activeViewOptions.map(opt => {
              const isActive = viewMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => onViewModeChange(opt.mode)}
                  className={`${styles.viewModeBtn} ${isActive ? styles.viewModeBtnActive : ''}`}
                  title={opt.label}
                  aria-pressed={isActive}
                >
                  {opt.icon}
                  {opt.label && <span>{opt.label}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom Actions (e.g. Expand/Collapse, Export) */}
        {customActions}
      </div>
    </div>
  );
};
