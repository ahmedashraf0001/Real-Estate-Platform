'use client';

import React from 'react';
import styles from './ZFERPLoadingWorkstation.module.css';

export interface ZFERPLoadingWorkstationProps {
  isAr?: boolean;
  className?: string;
}

export const ZFERPLoadingWorkstation: React.FC<ZFERPLoadingWorkstationProps> = ({
  isAr = true,
  className = '',
}) => {
  return (
    <div
      className={`${styles.screen} ${className}`}
      data-theme="light"
      dir={isAr ? 'rtl' : 'ltr'}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.rail}>
          <span className={styles.railLogo} />
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={styles.railItem} />
          ))}
        </div>
        <div className={styles.main}>
          <div className={styles.topbar}>
            <span className={`${styles.bone} ${styles.boneCrumb}`} />
            <span className={`${styles.bone} ${styles.boneTools}`} />
          </div>
          <div className={styles.content}>
            <div className={styles.header}>
              <span className={`${styles.bone} ${styles.boneTitle}`} />
              <span className={`${styles.bone} ${styles.boneSubtitle}`} />
            </div>
            <div className={styles.kpis}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.card}>
                  <span className={`${styles.bone} ${styles.boneLabel}`} />
                  <span className={`${styles.bone} ${styles.boneValue}`} />
                </div>
              ))}
            </div>
            <div className={`${styles.card} ${styles.panel}`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`${styles.bone} ${styles.boneRow}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.brand}>
        <span className={styles.mark}>ZF</span>
        <p className={styles.name}>
          {isAr ? 'زكريا فريد للتطوير العقاري' : 'Zakaria Farid Real Estate'}
        </p>
        <p className={styles.status}>
          {isAr ? 'جارٍ تحميل البيانات المالية…' : 'Loading financial data…'}
        </p>
        <span className={styles.bar}>
          <span className={styles.barFill} />
        </span>
      </div>
    </div>
  );
};

export default ZFERPLoadingWorkstation;
