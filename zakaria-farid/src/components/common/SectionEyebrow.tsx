'use client';

import styles from './SectionEyebrow.module.css';

interface SectionEyebrowProps {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}

export default function SectionEyebrow({ children, light = false, className = '' }: SectionEyebrowProps) {
  return (
    <span className={`${styles.eyebrow} ${light ? styles.light : ''} ${className}`}>
      {children}
    </span>
  );
}
