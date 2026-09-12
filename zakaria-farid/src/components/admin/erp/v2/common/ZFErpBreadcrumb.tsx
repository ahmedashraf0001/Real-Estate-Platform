'use client';

import React from 'react';
import styles from '../ZFWorkstationShell.module.css';

export interface ZFErpBreadcrumbProps {
  sectionTitle: string;
  icon?: React.ReactNode;
  subSectionTitle?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ZFErpBreadcrumb: React.FC<ZFErpBreadcrumbProps> = ({
  sectionTitle,
  icon,
  subSectionTitle,
  className,
  style
}) => {
  return (
    <div className={`${styles.stageBreadcrumb} ${className || ''}`} style={style}>
      <span className={styles.breadcrumbBrand}>FIN-OS</span>
      <span className={styles.breadcrumbDivider}>/</span>
      <span className={styles.breadcrumbSection}>
        {icon && <span className={styles.breadcrumbIcon}>{icon}</span>}
        <span>{sectionTitle}</span>
      </span>
      {subSectionTitle && (
        <>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbSubSection}>{subSectionTitle}</span>
        </>
      )}
    </div>
  );
};
