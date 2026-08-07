'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Sparkles, X, ChevronDown } from 'lucide-react';
import styles from './SmartSearchDock.module.css';

interface SmartSearchDockProps {
  locale: string;
  onFilterChange?: (location: string, type: string) => void;
  initialQuery?: string;
  initialType?: string;
}

const PROPERTY_TYPES = ['villa', 'apartment', 'townhouse', 'duplex', 'chalet'] as const;

export default function SmartSearchDock({ locale, onFilterChange, initialQuery = '', initialType = '' }: SmartSearchDockProps) {
  const router = useRouter();
  const isAr = locale === 'ar';

  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState(initialType);
  const [dbSuggestions, setDbSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch dynamic suggestions based on real database records on initial load
  useEffect(() => {
    async function loadDbSuggestions() {
      try {
        const res = await fetch('/api/search?mode=suggestions');
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions && data.suggestions.length > 0) {
            setDbSuggestions(data.suggestions);
          }
        }
      } catch {
        // fallback ignored
      }
    }
    loadDbSuggestions();
  }, []);

  function triggerSearch(newQuery: string, newType: string) {
    setIsOpen(false);
    if (onFilterChange) {
      onFilterChange(newQuery, newType);
    } else {
      const params = new URLSearchParams();
      if (newQuery) params.set('location', newQuery);
      if (newType) params.set('type', newType);
      router.push(`/${locale}/properties?${params.toString()}`);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    triggerSearch(query, selectedType);
  }

  function handleQuickChipClick(chipText: string) {
    let nextQuery = query;
    let nextType = selectedType;

    if (PROPERTY_TYPES.includes(chipText as typeof PROPERTY_TYPES[number])) {
      nextType = chipText;
      setSelectedType(chipText);
    } else {
      nextQuery = chipText;
      setQuery(chipText);
    }
    triggerSearch(nextQuery, nextType);
  }

  const typeLabels: Record<string, string> = {
    villa:     isAr ? 'فيلا' : 'Villa',
    apartment: isAr ? 'شقة' : 'Apartment',
    townhouse: isAr ? 'تاون هاوس' : 'Townhouse',
    duplex:    isAr ? 'دوبلكس' : 'Duplex',
    chalet:    isAr ? 'شاليه' : 'Chalet',
  };

  const quickChips = dbSuggestions.length > 0 ? dbSuggestions : (
    isAr
      ? ['الشيخ زايد', 'التجمع الخامس', 'الساحل الشمالي', 'villa', 'apartment']
      : ['Sheikh Zayed', 'New Cairo', 'North Coast', 'villa', 'apartment']
  );

  return (
    <div ref={dockRef} className={styles.dockContainer}>
      <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
        <div className={styles.searchField}>
          <Search size={18} strokeWidth={1.5} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={isAr ? 'ابحث بالموقع أو العقار واضغط Enter...' : 'Search by location, compound or press Enter...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setQuery('');
                triggerSearch('', selectedType);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.searchDivider} />

        {/* Custom Luxury Property Type Dropdown */}
        <div className={styles.selectWrapper}>
          <Building2 size={16} strokeWidth={1.5} className={styles.searchIcon} />
          <select
            className={styles.searchSelect}
            value={selectedType}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedType(val);
              triggerSearch(query, val);
            }}
          >
            <option value="">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectChevron} />
        </div>

        <button type="submit" className={styles.searchBtn}>
          {isAr ? 'بحث' : 'Search'}
        </button>
      </form>

      {/* Smart Suggestion Chips Dropdown */}
      {isOpen && (
        <div className={styles.resultsDropdown}>
          <div className={styles.chipRow}>
            <span className={styles.chipLabel}>
              <Sparkles size={13} style={{ color: '#C9A96A' }} />
              {isAr ? 'اقتراحات سريعة من قاعدة البيانات:' : 'Database Smart Suggestions:'}
            </span>
            <div className={styles.chipsWrap}>
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={styles.chip}
                  onClick={() => handleQuickChipClick(chip)}
                >
                  {typeLabels[chip] || chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
