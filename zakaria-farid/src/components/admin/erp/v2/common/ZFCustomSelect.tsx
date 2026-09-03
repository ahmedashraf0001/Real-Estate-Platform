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
  Plus
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
  price?: string | number;
  icon?: React.ElementType;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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
    }
  }, [isOpen, searchable]);

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
    if (value === null || value === undefined || value === '') return null;
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
          padding: '0.65rem 0.95rem',
          background: disabled ? '#f8fafc' : '#ffffff',
          border: hasError 
            ? '1.5px solid #dc2626' 
            : isOpen 
              ? '1.5px solid #946f23' 
              : '1px solid #cbd5e1',
          borderRadius: '10px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
          {selectedItem?.icon && (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(184, 144, 62, 0.1)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {React.createElement(selectedItem.icon, { size: 14 })}
            </div>
          )}

          {selectedItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '0.1rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isAr ? selectedItem.labelAr : selectedItem.labelEn}
                </span>
                {selectedItem.badge && (
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    padding: '0.05rem 0.35rem',
                    borderRadius: '4px',
                    background: selectedItem.badgeColor || '#f1f5f9',
                    color: '#475569',
                    flexShrink: 0
                  }}>
                    {selectedItem.badge}
                  </span>
                )}
              </div>
              {(selectedItem.sublabelAr || selectedItem.sublabelEn) && (
                <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isAr ? selectedItem.sublabelAr : selectedItem.sublabelEn}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {isAr ? placeholderAr : placeholderEn}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          {selectedItem?.price !== undefined && (
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
              {D(selectedItem.price).formatEGP(isAr)}
            </span>
          )}
          <ChevronDown 
            size={16} 
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
              padding: '0.65rem 0.85rem',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Search size={14} color="#64748b" />
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
                  fontSize: '0.78rem',
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
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Custom Action (e.g. + Add Custom Developer Unit) */}
          {customAction && (
            <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #f1f5f9' }}>
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
                  gap: '0.5rem',
                  padding: '0.55rem 0.75rem',
                  background: 'rgba(184, 144, 62, 0.06)',
                  border: '1px dashed rgba(184, 144, 62, 0.4)',
                  borderRadius: '8px',
                  color: '#946f23',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left'
                }}
              >
                <Plus size={14} color="#946f23" />
                <span>{isAr ? customAction.labelAr : customAction.labelEn}</span>
              </button>
            </div>
          )}

          {/* Scrollable Sectioned Items List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.35rem 0' }}>
            {totalFilteredCount === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.76rem' }}>
                {isAr ? 'لا توجد نتائج مطابقة للبحث' : 'No matching options found'}
              </div>
            ) : (
              filteredSections.map((section) => {
                const SectionIcon = section.icon || Layers;

                return (
                  <div key={section.sectionId} style={{ marginBottom: '0.35rem' }}>
                    {/* Section Header */}
                    <div style={{
                      padding: '0.4rem 0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <SectionIcon size={12} color="#946f23" />
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                        {isAr ? section.titleAr : section.titleEn}
                      </span>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: '#64748b',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: '0.05rem 0.35rem',
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
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.55rem 0.95rem',
                              cursor: 'pointer',
                              background: isItemSelected ? 'rgba(184, 144, 62, 0.08)' : 'transparent',
                              borderRight: isAr && isItemSelected ? '3px solid #946f23' : 'none',
                              borderLeft: !isAr && isItemSelected ? '3px solid #946f23' : 'none',
                              transition: 'all 0.12s ease',
                              gap: '0.75rem'
                            }}
                            onMouseEnter={e => {
                              if (!isItemSelected) e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={e => {
                              if (!isItemSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                background: isItemSelected ? '#946f23' : '#f1f5f9',
                                color: isItemSelected ? '#ffffff' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {React.createElement(ItemIcon, { size: 13 })}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '0.1rem', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span style={{
                                    fontSize: '0.78rem',
                                    fontWeight: isItemSelected ? 800 : 700,
                                    color: isItemSelected ? '#946f23' : '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {isAr ? item.labelAr : item.labelEn}
                                  </span>
                                  {item.badge && (
                                    <span style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 800,
                                      padding: '0.05rem 0.3rem',
                                      borderRadius: '4px',
                                      background: item.badgeColor || '#f1f5f9',
                                      color: '#475569',
                                      flexShrink: 0
                                    }}>
                                      {item.badge}
                                    </span>
                                  )}
                                </div>

                                {(item.sublabelAr || item.sublabelEn) && (
                                  <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {isAr ? item.sublabelAr : item.sublabelEn}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                              {item.price !== undefined && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                  {D(item.price).formatEGP(isAr)}
                                </span>
                              )}
                              {isItemSelected && (
                                <Check size={14} color="#946f23" />
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
    </div>
  );
}
