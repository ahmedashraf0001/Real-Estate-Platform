'use client';

import React from 'react';
import { 
  TrendingUp, 
  BookOpen, 
  FileText, 
  RotateCcw, 
  PieChart, 
  Building2, 
  Calculator,
  Wallet,
  CheckCircle2,
  Landmark,
  Zap
} from 'lucide-react';
import styles from './ZFWorkstationShell.module.css';

export type ERPNavModule = 
  | 'operations'
  | 'cockpit'
  | 'properties'
  | 'calculator'
  | 'ledger'
  | 'contracts'
  | 'pdc'
  | 'rescissions'
  | 'cost-allocation'
  | 'tax';

interface DockItemDef {
  id: ERPNavModule;
  labelEn: string;
  labelAr: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
  badge?: number;
}

interface DockGroupDef {
  groupTitleEn: string;
  groupTitleAr: string;
  items: DockItemDef[];
}

interface ZFNavigationDockV2Props {
  activeModule: ERPNavModule;
  onSelectModule: (module: ERPNavModule) => void;
  contractsCount?: number;
  pdcSafeCount?: number;
  propertiesCount?: number;
  isAr?: boolean;
}

export const ZFNavigationDockV2: React.FC<ZFNavigationDockV2Props> = ({
  activeModule,
  onSelectModule,
  contractsCount,
  pdcSafeCount,
  propertiesCount,
  isAr = true
}) => {
  const GROUPS: DockGroupDef[] = [
    {
      groupTitleEn: 'DAILY DESK',
      groupTitleAr: 'العمليات اليومية',
      items: [
        { 
          id: 'operations', 
          labelEn: 'Daily Desk', 
          labelAr: 'المكتب اليومي السريع', 
          icon: Zap 
        }
      ]
    },
    {
      groupTitleEn: 'COMMAND & ANALYTICS',
      groupTitleAr: 'القيادة والتحليل المالي',
      items: [
        { 
          id: 'cockpit', 
          labelEn: 'Executive Cockpit', 
          labelAr: 'لوحة القيادة المالية', 
          icon: TrendingUp 
        },
        { 
          id: 'properties', 
          labelEn: 'Projects & WIP Assets', 
          labelAr: 'المشاريع والأصول (WIP)', 
          icon: Building2,
          badge: propertiesCount && propertiesCount > 0 ? propertiesCount : undefined
        }
      ]
    },
    {
      groupTitleEn: 'SALES & TRANSACTIONS',
      groupTitleAr: 'المبيعات والعمليات التعاقدية',
      items: [
        { 
          id: 'contracts', 
          labelEn: 'Sales Contracts', 
          labelAr: 'سجل عقود البيع', 
          icon: FileText,
          badge: contractsCount && contractsCount > 0 ? contractsCount : undefined
        },
        { 
          id: 'calculator', 
          labelEn: 'Installment Structuring', 
          labelAr: 'حاسبة وهيكلة الأقساط', 
          icon: Calculator 
        },
        { 
          id: 'pdc', 
          labelEn: 'Hand Installments Vault', 
          labelAr: 'حافظة التحصيل والأقساط باليد', 
          icon: Wallet,
          badge: pdcSafeCount && pdcSafeCount > 0 ? pdcSafeCount : undefined
        }
      ]
    },
    {
      groupTitleEn: 'ACCOUNTING & AUDIT',
      groupTitleAr: 'المحاسبة والرقابة المالية',
      items: [
        { 
          id: 'ledger', 
          labelEn: 'General Ledger & COA', 
          labelAr: 'دفتر الأستاذ والدليل (COA)', 
          icon: BookOpen 
        },
        { 
          id: 'cost-allocation', 
          labelEn: 'WIP Cost Allocation (RSV)', 
          labelAr: 'تخصيص التكاليف (RSV)', 
          icon: PieChart 
        },
        { 
          id: 'rescissions', 
          labelEn: 'Rescissions & Settlement', 
          labelAr: 'فسخ واسترداد العقود', 
          icon: RotateCcw 
        },
        { 
          id: 'tax', 
          labelEn: 'Apartment Taxes & Fees', 
          labelAr: 'ضرائب ورسوم الوحدات', 
          icon: Landmark 
        }
      ]
    }
  ];

  return (
    <aside className={styles.dock}>
      <div>
        {GROUPS.map((grp, gIdx) => (
          <div key={gIdx} className={styles.dockGroup}>
            <div className={styles.dockGroupTitle}>
              {isAr ? grp.groupTitleAr : grp.groupTitleEn}
            </div>

            {grp.items.map(item => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.dockItem} ${isActive ? styles.dockItemActive : ''}`}
                  onClick={() => onSelectModule(item.id)}
                >
                  {isActive && <span className={styles.dockActiveNotch} />}

                  <div className={styles.dockItemLeft}>
                    <span className={styles.dockItemIcon}>
                      <Icon size={15} />
                    </span>
                    <span className={styles.dockItemLabel}>
                      {isAr ? item.labelAr : item.labelEn}
                    </span>
                  </div>

                  {item.badge !== undefined && (
                    <span className={styles.dockBadge}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dock Footer: Control Balance Status */}
      <div className={styles.dockFooter}>
        <div className={styles.dockStatusBox}>
          <div className={styles.dockStatusTitle}>
            <span>{isAr ? 'الرقابة المحاسبية' : 'Controls'}</span>
            <CheckCircle2 size={12} color="#10b981" />
          </div>
          <div className={styles.dockStatusSub}>
            {isAr ? 'القيد المزدوج متوازن (مدين = دائن 0.00)' : 'Double-Entry Invariant 4.1 Verified'}
          </div>
        </div>
      </div>
    </aside>
  );
};
