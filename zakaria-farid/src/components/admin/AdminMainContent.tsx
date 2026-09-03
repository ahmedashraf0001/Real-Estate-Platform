'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';

export function AdminMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isErp = pathname.includes('/erp');

  return (
    <div className={`${styles.adminMain} ${isErp ? styles.adminMainFullBleed : ''}`}>
      <div className={`${styles.adminContainer} ${isErp ? styles.adminContainerFullBleed : ''}`}>
        {children}
      </div>
    </div>
  );
}
