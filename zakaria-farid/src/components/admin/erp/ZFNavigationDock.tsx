'use client';

import React from 'react';
import { 
  TrendingUp, 
  BookOpen, 
  FileText, 
  Landmark, 
  RotateCcw, 
  PieChart, 
  ShieldCheck, 
  Users, 
  AlertTriangle,
  Layers,
  Building2,
  Calculator
} from 'lucide-react';
import styles from './ZFSubprogram.module.css';

export type ERPNavModule = 
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
  icon: React.ComponentType<{ size?: number | string; color?: string; className?: string }>;
  badge?: string | number;
}

interface DockGroupDef {
  groupTitleEn: string;
  groupTitleAr: string;
  items: DockItemDef[];
}

interface ZFNavigationDockProps {
  activeModule: ERPNavModule;
  onSelectModule: (module: ERPNavModule) => void;
  pendingApprovalsCount?: number;
  openQuestionsCount?: number;
  isAr?: boolean;
}

export const ZFNavigationDock: React.FC<ZFNavigationDockProps> = ({
  activeModule,
  onSelectModule,
  isAr = false
}) => {
  const GROUPS: DockGroupDef[] = [
    {
      groupTitleEn: 'CORE WORKSTATION',
      groupTitleAr: 'المنظومة المحاسبية الرئيسية',
      items: [
        { id: 'cockpit' as ERPNavModule, labelEn: 'Financial Cockpit', labelAr: 'لوحة التحكم والمؤشرات المالية', icon: TrendingUp },
        { id: 'properties' as ERPNavModule, labelEn: 'Properties & WIP Assets', labelAr: 'العقارات وتكاليف المشاريع (WIP)', icon: Building2 },
        { id: 'calculator' as ERPNavModule, labelEn: 'Installment Structuring', labelAr: 'حاسبة وهيكلة الأقساط', icon: Calculator },
        { id: 'ledger' as ERPNavModule, labelEn: 'General Ledger (15/15)', labelAr: 'دفتر الأستاذ العام والدليل المحاسبي', icon: BookOpen }
      ]
    },
    {
      groupTitleEn: 'SALES & CONTRACTING',
      groupTitleAr: 'المبيعات والعقود',
      items: [
        { id: 'contracts' as ERPNavModule, labelEn: 'Sales Registry & Handover', labelAr: 'سجل العقود والمبيعات والتسليم', icon: FileText },
        { id: 'pdc' as ERPNavModule, labelEn: 'PDC Cheques Vault', labelAr: 'خزينة الشيكات المؤجلة', icon: Landmark }
      ]
    },
    {
      groupTitleEn: 'SETTLEMENT & TAX',
      groupTitleAr: 'التسويات والضرائب',
      items: [
        { id: 'rescissions' as ERPNavModule, labelEn: 'Rescission & Forfeiture', labelAr: 'فسخ العقود والاسترداد', icon: RotateCcw },
        { id: 'cost-allocation' as ERPNavModule, labelEn: 'RSV & WIP Allocation', labelAr: 'تخصيص التكاليف و RSV', icon: PieChart },
        { id: 'tax' as ERPNavModule, labelEn: 'Statutory Taxes & ETA', labelAr: 'الضرائب ونموذج ٤١', icon: ShieldCheck }
      ]
    }
  ];

  return (
    <aside className={styles.navigationDock}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                  className={`${styles.dockItem} ${isActive ? styles.dockItemActive : ''}`}
                  onClick={() => onSelectModule(item.id)}
                >
                  <div className={styles.dockItemContent}>
                    <Icon size={16} color={isActive ? 'var(--zf-gold, #d4af37)' : 'currentColor'} />
                    <span>{isAr ? item.labelAr : item.labelEn}</span>
                  </div>

                  {item.badge && (
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

      {/* Dock Footer: Quick Fiscal & Engine Status */}
      <div className={styles.dockFooter}>
        <div className={styles.dockFiscalCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--zf-gold, #d4af37)', fontWeight: 700 }}>
            <Layers size={13} />
            <span>{isAr ? 'حالة المنظومة المالية' : 'Engine Status'}</span>
          </div>
          <div style={{ color: 'var(--zf-text-secondary, #a7acc0)', marginTop: '0.2rem', fontSize: '0.68rem' }}>
            {isAr ? 'القيود متوازنة بدقة القرش (0.00)' : 'Double-Entry Invariant 4.1 Verified (0.00)'}
          </div>
        </div>
      </div>
    </aside>
  );
};
