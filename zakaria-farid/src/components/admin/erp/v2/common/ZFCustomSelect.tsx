'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  Search, 
  Check, 
  X, 
  Building2, 
  Layers, 
  Sparkles,
  Plus,
  Info
} from 'lucide-react';
import { D } from '@/lib/erp/math';

export interface ZFCustomSelectItem<T = string> {
  value: T;
  labelAr: string;
  labelEn: string;
  sublabelAr?: string;
  sublabelEn?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeTextColor?: string;
  price?: string | number;
  icon?: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  tooltipTitleAr?: string;
  tooltipTitleEn?: string;
  tooltipAr?: string;
  tooltipEn?: string;
}

export const getBadgeStyle = (item: { badgeColor?: string; badgeBg?: string; badgeTextColor?: string; iconColor?: string }) => {
  if (item.badgeBg && item.badgeTextColor) {
    return {
      bg: item.badgeBg,
      color: item.badgeTextColor,
      border: `1px solid ${item.badgeTextColor}33`
    };
  }
  const color = item.badgeColor || item.iconColor || '#64748b';
  if (color.startsWith('#f') || color.startsWith('#d') || color.startsWith('rgba')) {
    const textColor = item.badgeTextColor || (color.includes('fee') ? '#dc2626' : color.includes('dcf') ? '#15803d' : '#946f23');
    return {
      bg: color,
      color: textColor,
      border: `1px solid ${textColor}22`
    };
  }
  return {
    bg: item.badgeBg || `${color}15`,
    color: item.badgeTextColor || color,
    border: `1px solid ${color}33`
  };
};

export interface ZFCustomSelectSection<T = string> {
  sectionId: string;
  titleAr: string;
  titleEn: string;
  icon?: React.ElementType;
  items: ZFCustomSelectItem<T>[];
}

interface ZFCustomSelectProps<T = string> {
  value: T | null | undefined;
  onChange: (value: T) => void;
  sections?: ZFCustomSelectSection<T>[];
  items?: ZFCustomSelectItem<T>[]; // Flat list if sections not used
  placeholderAr?: string;
  placeholderEn?: string;
  isAr?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  searchable?: boolean;
  customAction?: {
    labelAr: string;
    labelEn: string;
    icon?: React.ElementType;
    onClick: () => void;
  };
}

export function ZFCustomSelect<T = string>({
  value,
  onChange,
  sections,
  items,
  placeholderAr = '-- اختر من القائمة --',
  placeholderEn = '-- Select an option --',
  isAr = true,
  disabled = false,
  hasError = false,
  errorMessage,
  searchable = true,
  customAction
}: ZFCustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    item: ZFCustomSelectItem<T>;
    top: number;
    left: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHoveredTooltip(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else if (!isOpen) {
      setSearchQuery('');
      setHoveredTooltip(null);
    }
  }, [isOpen, searchable]);

  const handleItemMouseEnter = (item: ZFCustomSelectItem<T>, e: React.MouseEvent<HTMLDivElement>) => {
    if (item.tooltipAr || item.tooltipEn) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cardWidth = 280;
      const padding = 10;
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      let left = 0;
      if (isAr) {
        if (rect.right + cardWidth + padding <= viewportWidth) {
          left = rect.right + padding;
        } else if (rect.left - cardWidth - padding >= 0) {
          left = rect.left - cardWidth - padding;
        } else {
          left = Math.max(padding, Math.min(rect.left, viewportWidth - cardWidth - padding));
        }
      } else {
        if (rect.right + cardWidth + padding <= viewportWidth) {
          left = rect.right + padding;
        } else if (rect.left - cardWidth - padding >= 0) {
          left = rect.left - cardWidth - padding;
        } else {
          left = Math.max(padding, Math.min(rect.left, viewportWidth - cardWidth - padding));
        }
      }

      const cardEstHeight = 120;
      let top = rect.top - 4;
      if (top + cardEstHeight > viewportHeight - padding) {
        top = Math.max(padding, viewportHeight - cardEstHeight - padding);
      }

      setHoveredTooltip({
        item,
        top,
        left
      });
    }
  };

  // Normalize sections
  const allSections: ZFCustomSelectSection<T>[] = useMemo(() => {
    if (sections && sections.length > 0) return sections;
    if (items && items.length > 0) {
      return [{
        sectionId: 'default',
        titleAr: 'الخيارات المتاحة',
        titleEn: 'Available Options',
        items
      }];
    }
    return [];
  }, [sections, items]);

  // Find currently selected item
  const selectedItem = useMemo(() => {
    if (value === null || value === undefined) return null;
    for (const sec of allSections) {
      const match = sec.items.find(i => String(i.value) === String(value));
      if (match) return match;
    }
    return null;
  }, [allSections, value]);

  // Filter sections and items based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return allSections;
    const q = searchQuery.toLowerCase().trim();

    return allSections
      .map(sec => {
        const matchedItems = sec.items.filter(item => {
          const lAr = item.labelAr?.toLowerCase() || '';
          const lEn = item.labelEn?.toLowerCase() || '';
          const sAr = item.sublabelAr?.toLowerCase() || '';
          const sEn = item.sublabelEn?.toLowerCase() || '';
          const badge = item.badge?.toLowerCase() || '';
          return lAr.includes(q) || lEn.includes(q) || sAr.includes(q) || sEn.includes(q) || badge.includes(q);
        });

        return {
          ...sec,
          items: matchedItems
        };
      })
      .filter(sec => sec.items.length > 0);
  }, [allSections, searchQuery]);

  const totalFilteredCount = filteredSections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* 1. TRIGGER BUTTON */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.48rem 0.75rem',
          background: disabled ? '#f8fafc' : '#ffffff',
          border: hasError 
            ? '1.5px solid #dc2626' 
            : isOpen 
              ? '1.5px solid #946f23' 
              : '1px solid #cbd5e1',
          borderRadius: '9px',
          boxShadow: isOpen 
            ? '0 0 0 3px rgba(184, 144, 62, 0.15)' 
            : '0 1px 2px rgba(0, 0, 0, 0.02)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: isAr ? 'right' : 'left',
          transition: 'all 0.15s ease',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
          {selectedItem?.icon && (
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: selectedItem.iconBg || 'rgba(184, 144, 62, 0.12)',
              color: selectedItem.iconColor || '#946f23',
              border: `1px solid ${selectedItem.iconColor ? `${selectedItem.iconColor}33` : 'rgba(184, 144, 62, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {React.createElement(selectedItem.icon, { size: 14 })}
            </div>
          )}

          {selectedItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '0.08rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flexWrap: 'nowrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isAr ? selectedItem.labelAr : selectedItem.labelEn}
                </span>
                {selectedItem.badge && (() => {
                  const bStyle = getBadgeStyle(selectedItem);
                  return (
                    <span style={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      padding: '0.08rem 0.4rem',
                      borderRadius: '4px',
                      background: bStyle.bg,
                      color: bStyle.color,
                      border: bStyle.border,
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}>
                      {selectedItem.badge}
                    </span>
                  );
                })()}
              </div>
              {(selectedItem.sublabelAr || selectedItem.sublabelEn) && (
                <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isAr ? selectedItem.sublabelAr : selectedItem.sublabelEn}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {isAr ? placeholderAr : placeholderEn}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
          {selectedItem?.price !== undefined && (
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
              {D(selectedItem.price).formatEGP(isAr)}
            </span>
          )}
          <ChevronDown 
            size={14} 
            color="#64748b" 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease'
            }} 
          />
        </div>
      </button>

      {hasError && errorMessage && (
        <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, display: 'block', marginTop: '0.3rem' }}>
          {errorMessage}
        </span>
      )}

      {/* 2. FLOATING DROPDOWN POPOVER */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '360px',
          animation: 'fadeInDown 0.15s ease-out'
        }}>
          {/* Internal Search Box */}
          {searchable && (
            <div style={{
              padding: '0.45rem 0.7rem',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <Search size={13} color="#64748b" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث سريع بالتصنيف، الاسم، أو السعر...' : 'Filter options...'}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.73rem',
                  color: '#0f172a'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Custom Action (e.g. + Add Custom Developer Unit) */}
          {customAction && (
            <div style={{ padding: '0.35rem 0.6rem', borderBottom: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  customAction.onClick();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.65rem',
                  background: 'rgba(184, 144, 62, 0.06)',
                  border: '1px dashed rgba(184, 144, 62, 0.4)',
                  borderRadius: '7px',
                  color: '#946f23',
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left'
                }}
              >
                <Plus size={13} color="#946f23" />
                <span>{isAr ? customAction.labelAr : customAction.labelEn}</span>
              </button>
            </div>
          )}

          {/* Scrollable Sectioned Items List */}
          <div 
            onScroll={() => setHoveredTooltip(null)}
            style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }}
          >
            {totalFilteredCount === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.73rem' }}>
                {isAr ? 'لا توجد نتائج مطابقة للبحث' : 'No matching options found'}
              </div>
            ) : (
              filteredSections.map((section) => {
                const SectionIcon = section.icon || Layers;

                return (
                  <div key={section.sectionId} style={{ marginBottom: '0.25rem' }}>
                    {/* Section Header */}
                    <div style={{
                      padding: '0.3rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <SectionIcon size={11} color="#946f23" />
                      <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#475569', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                        {isAr ? section.titleAr : section.titleEn}
                      </span>
                      <span style={{
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        color: '#64748b',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: '0.03rem 0.3rem',
                        borderRadius: '4px',
                        marginLeft: isAr ? 'auto' : undefined,
                        marginRight: isAr ? undefined : 'auto'
                      }}>
                        {section.items.length}
                      </span>
                    </div>

                    {/* Section Items */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {section.items.map((item) => {
                        const isItemSelected = String(item.value) === String(value);
                        const ItemIcon = item.icon || Building2;

                        return (
                          <div
                            key={String(item.value)}
                            onClick={() => {
                              onChange(item.value);
                              setIsOpen(false);
                              setHoveredTooltip(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.42rem 0.75rem',
                              cursor: 'pointer',
                              background: isItemSelected ? 'rgba(184, 144, 62, 0.08)' : 'transparent',
                              borderRight: isAr && isItemSelected ? '3px solid #946f23' : 'none',
                              borderLeft: !isAr && isItemSelected ? '3px solid #946f23' : 'none',
                              transition: 'all 0.12s ease',
                              gap: '0.55rem'
                            }}
                            onMouseEnter={e => {
                              if (!isItemSelected) e.currentTarget.style.background = '#f8fafc';
                              handleItemMouseEnter(item, e);
                            }}
                            onMouseLeave={e => {
                              if (!isItemSelected) e.currentTarget.style.background = 'transparent';
                              setHoveredTooltip(null);
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '7px',
                                background: isItemSelected 
                                  ? (item.iconColor || '#946f23')
                                  : (item.iconBg || '#f1f5f9'),
                                color: isItemSelected 
                                  ? '#ffffff'
                                  : (item.iconColor || '#475569'),
                                border: isItemSelected 
                                  ? 'none'
                                  : `1px solid ${item.iconColor ? `${item.iconColor}30` : '#e2e8f0'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: isItemSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                                transition: 'all 0.15s ease'
                              }}>
                                {React.createElement(ItemIcon, { size: 14 })}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '0.08rem', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flexWrap: 'nowrap' }}>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: isItemSelected ? 700 : 600,
                                    color: isItemSelected ? (item.iconColor || '#946f23') : '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {isAr ? item.labelAr : item.labelEn}
                                  </span>
                                   {item.badge && (() => {
                                     const bStyle = getBadgeStyle(item);
                                     return (
                                       <span style={{
                                         fontSize: '0.56rem',
                                         fontWeight: 700,
                                         padding: '0.06rem 0.35rem',
                                         borderRadius: '4px',
                                         background: bStyle.bg,
                                         color: bStyle.color,
                                         border: bStyle.border,
                                         flexShrink: 0,
                                         whiteSpace: 'nowrap'
                                       }}>
                                         {item.badge}
                                       </span>
                                     );
                                   })()}
                                   {(item.tooltipAr || item.tooltipEn) && (
                                     <span 
                                       title={isAr ? (item.tooltipTitleAr || item.labelAr) : (item.tooltipTitleEn || item.labelEn)}
                                       style={{
                                         display: 'inline-flex',
                                         alignItems: 'center',
                                         justifyContent: 'center',
                                         color: '#946f23',
                                         background: 'rgba(184, 144, 62, 0.09)',
                                         borderRadius: '50%',
                                         width: '15px',
                                         height: '15px',
                                         flexShrink: 0,
                                         marginLeft: isAr ? undefined : '0.15rem',
                                         marginRight: isAr ? '0.15rem' : undefined
                                       }}
                                     >
                                       <Info size={10} />
                                     </span>
                                   )}
                                </div>

                                {(item.sublabelAr || item.sublabelEn) && (
                                  <span style={{ fontSize: '0.64rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {isAr ? item.sublabelAr : item.sublabelEn}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                              {item.price !== undefined && (
                                <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                  {D(item.price).formatEGP(isAr)}
                                </span>
                              )}
                              {isItemSelected && (
                                <Check size={13} color="#946f23" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. FLOATING EXPLANATORY TOOLTIP POPUP */}
      {isOpen && hoveredTooltip && (hoveredTooltip.item.tooltipAr || hoveredTooltip.item.tooltipEn) && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top: `${hoveredTooltip.top}px`,
            left: `${hoveredTooltip.left}px`,
            width: '280px',
            maxWidth: '280px',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            zIndex: 10005,
            pointerEvents: 'none',
            direction: isAr ? 'rtl' : 'ltr',
            textAlign: isAr ? 'right' : 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={13} color="#946f23" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
              {isAr 
                ? (hoveredTooltip.item.tooltipTitleAr || hoveredTooltip.item.labelAr) 
                : (hoveredTooltip.item.tooltipTitleEn || hoveredTooltip.item.labelEn)}
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: '0.7rem',
            lineHeight: 1.45,
            color: '#475569',
            fontWeight: 500
          }}>
            {isAr ? hoveredTooltip.item.tooltipAr : (hoveredTooltip.item.tooltipEn || hoveredTooltip.item.tooltipAr)}
          </p>
        </div>
      )}
    </div>
  );
}
