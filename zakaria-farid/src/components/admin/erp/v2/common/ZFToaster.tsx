'use client';

import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, Loader2 } from 'lucide-react';
import styles from './ZFToaster.module.css';

export interface ZFToasterProps {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'top-center' | 'bottom-center';
  dir?: 'rtl' | 'ltr' | 'auto';
  expand?: boolean;
  gap?: number;
  offset?: number | string;
}

export const ZFToaster: React.FC<ZFToasterProps> = ({
  position = 'bottom-left',
  dir = 'rtl',
  expand = true,
  gap = 8,
  offset = 24,
}) => {
  return (
    <div className={styles.toasterContainer}>
      <SonnerToaster
        position={position}
        dir={dir}
        expand={expand}
        gap={gap}
        offset={offset}
        closeButton={true}
        richColors={false}
        icons={{
          success: (
            <div className={`${styles.iconSquircle} ${styles.iconSuccess}`}>
              <CheckCircle2 size={16} strokeWidth={2.2} />
            </div>
          ),
          error: (
            <div className={`${styles.iconSquircle} ${styles.iconError}`}>
              <AlertOctagon size={16} strokeWidth={2.2} />
            </div>
          ),
          warning: (
            <div className={`${styles.iconSquircle} ${styles.iconWarning}`}>
              <AlertTriangle size={16} strokeWidth={2.2} />
            </div>
          ),
          info: (
            <div className={`${styles.iconSquircle} ${styles.iconInfo}`}>
              <Info size={16} strokeWidth={2.2} />
            </div>
          ),
          loading: (
            <div className={`${styles.iconSquircle} ${styles.iconInfo}`}>
              <Loader2 size={16} strokeWidth={2.2} className={styles.spinLoader} />
            </div>
          ),
        }}
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid var(--erp-card-border, #e2e8f0)',
            borderRadius: '10px',
            fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: '0.82rem',
            fontVariantNumeric: 'tabular-nums',
          },
        }}
      />
    </div>
  );
};

// Re-export sonner toast and provide erpToast financial helper
export { toast };

export const erpToast = {
  ...toast,
  financialSuccess: (title: string, amount: string | number, currency = 'ج.م', description?: string) => {
    return toast.success(title, {
      description: description 
        ? `${description} • ${Number(amount).toLocaleString()} ${currency}` 
        : `${Number(amount).toLocaleString()} ${currency}`,
    });
  },
  contractorPayment: (contractorName: string, amount: string | number, propertyTitle?: string) => {
    return toast.success('تم اعتماد وصرف مستحقات المقاول بنجاح', {
      description: `${contractorName} • ${Number(amount).toLocaleString()} ج.م ${propertyTitle ? `(${propertyTitle})` : ''}`,
    });
  },
};

if (typeof window !== 'undefined') {
  (window as any).toast = toast;
  (window as any).erpToast = erpToast;
}

export default ZFToaster;
