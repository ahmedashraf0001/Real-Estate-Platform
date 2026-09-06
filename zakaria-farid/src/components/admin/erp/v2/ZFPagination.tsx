'use client';

import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';
import styles from './ZFWorkstationShell.module.css';

export interface ZFPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  isAr?: boolean;
  itemLabel?: {
    ar: string;
    en: string;
  };
}

export const ZFPagination: React.FC<ZFPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  isAr = true,
  itemLabel = { ar: 'عنصر', en: 'items' }
}) => {
  if (totalItems <= 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className={styles.paginationBar}>
      {/* Range Telemetry */}
      <div className={styles.paginationInfo}>
        {isAr ? (
          <span>
            عرض <strong>{start}</strong> إلى <strong>{end}</strong> من أصل <strong>{totalItems}</strong> {itemLabel.ar}
          </span>
        ) : (
          <span>
            Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{totalItems}</strong> {itemLabel.en}
          </span>
        )}
      </div>

      {/* Controls: Page Size & Navigation */}
      <div className={styles.paginationControls}>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {isAr ? 'عرض لكل صفحة:' : 'Per page:'}
            </span>
            <select
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={e => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              aria-label={isAr ? 'عدد العناصر لكل صفحة' : 'Items per page'}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {/* First Page */}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            title={isAr ? 'الصفحة الأولى' : 'First page'}
            aria-label={isAr ? 'الصفحة الأولى' : 'First page'}
          >
            {isAr ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>

          {/* Previous Page */}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            title={isAr ? 'الصفحة السابقة' : 'Previous page'}
            aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
          >
            {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Current Page / Total Pages Indicator */}
          <div className={styles.pageIndicator}>
            <span>{currentPage}</span>
            <span style={{ opacity: 0.5, margin: '0 0.2rem' }}>/</span>
            <span>{safeTotalPages}</span>
          </div>

          {/* Next Page */}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage >= safeTotalPages}
            onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
            title={isAr ? 'الصفحة التالية' : 'Next page'}
            aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
          >
            {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Last Page */}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage >= safeTotalPages}
            onClick={() => onPageChange(safeTotalPages)}
            title={isAr ? 'الصفحة الأخيرة' : 'Last page'}
            aria-label={isAr ? 'الصفحة الأخيرة' : 'Last page'}
          >
            {isAr ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
