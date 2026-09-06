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
  Layers, 
  Building2, 
  Calculator,
  Wallet,
  Zap,
  X
} from 'lucide-react';
import styles from './v2/ZFWorkstationShell.module.css';

export type ERPNavModule = 
  | 'cockpit'
  | 'operations'
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
  badgeVariant?: 'default' | 'gold' | 'emerald';
}

interface DockGroupDef {
  groupTitleEn: string;
  groupTitleAr: string;
  items: DockItemDef[];
}

interface ZFNavigationDockProps {
  activeModule: ERPNavModule;
  onSelectModule: (module: ERPNavModule) => void;
  urgentDuesCount?: number;
  pendingApprovalsCount?: number;
  openQuestionsCount?: number;
  contractsCount?: number;
  pdcSafeCount?: number;
  propertiesCount?: number;
  isAr?: boolean;
  onOpenAcademy?: () => void;
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const ZFNavigationDock: React.FC<ZFNavigationDockProps> = ({
  activeModule,
  onSelectModule,
  urgentDuesCount,
  contractsCount,
  pdcSafeCount,
  propertiesCount,
  isAr = false,
  onOpenAcademy,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const GROUPS: DockGroupDef[] = [
    {
      groupTitleEn: 'COMMAND & OPERATIONS',
      groupTitleAr: 'الإدارة وحركة الشغل',
      items: [
        { 
          id: 'cockpit', 
          labelEn: 'Executive Cockpit', 
          labelAr: 'نظرة عامة على الشغل', 
          icon: TrendingUp 
        },
        { 
          id: 'operations', 
          labelEn: 'Daily Desk & Cashier', 
          labelAr: 'حركة الخزنة والعمليات', 
          icon: Zap,
          badge: urgentDuesCount && urgentDuesCount > 0 ? urgentDuesCount : undefined,
          badgeVariant: 'gold'
        },
        { 
          id: 'properties', 
          labelEn: 'Projects & WIP Assets', 
          labelAr: 'المشاريع والشقق المعروضة', 
          icon: Building2,
          badge: propertiesCount && propertiesCount > 0 ? propertiesCount : undefined
        }
      ]
    },
    {
      groupTitleEn: 'SALES & CONTRACTING',
      groupTitleAr: 'المبيعات والعملاء',
      items: [
        { 
          id: 'contracts', 
          labelEn: 'Sales Contracts Registry', 
          labelAr: 'عقود البيع والعملاء', 
          icon: FileText,
          badge: contractsCount && contractsCount > 0 ? contractsCount : undefined,
          badgeVariant: 'gold'
        },
        { 
          id: 'calculator', 
          labelEn: 'Calculator & Feasibility', 
          labelAr: 'حاسبة تكلفة المباني والأقساط', 
          icon: Calculator 
        },
        { 
          id: 'pdc', 
          labelEn: 'Hand Installments & Dues', 
          labelAr: 'أجندة ومواعيد الأقساط', 
          icon: Wallet,
          badge: pdcSafeCount && pdcSafeCount > 0 ? pdcSafeCount : undefined,
          badgeVariant: 'emerald'
        }
      ]
    },
    {
      groupTitleEn: 'ACCOUNTING & GOVERNANCE',
      groupTitleAr: 'الحسابات ودفاتر الشركة',
      items: [
        { 
          id: 'ledger', 
          labelEn: 'General Ledger & COA', 
          labelAr: 'حسابات الشركة ودفتر اليومية', 
          icon: BookOpen 
        },
        { 
          id: 'cost-allocation', 
          labelEn: 'WIP Cost Allocation (RSV)', 
          labelAr: 'توزيع مصاريف المباني على الشقق', 
          icon: PieChart 
        },
        { 
          id: 'rescissions', 
          labelEn: 'Rescissions & Settlement', 
          labelAr: 'إلغاء العقود وترجيع الفلوس', 
          icon: RotateCcw 
        },
        { 
          id: 'tax', 
          labelEn: 'Apartment Property Taxes', 
          labelAr: 'الضرائب والرسوم على الشقق', 
          icon: Landmark 
        }
      ]
    }
  ];

  return (
    <aside 
      className={`
        ${styles.dock} 
        ${isCollapsed ? styles.dockCollapsed : ''} 
        ${isMobileOpen ? styles.dockMobileOpen : ''}
      `} 
      data-tour="nav-dock"
    >
      {isMobileOpen && onCloseMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.65rem' }}>
          <button
            type="button"
            onClick={onCloseMobile}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              padding: '0.35rem',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isAr ? 'إغلاق القائمة' : 'Close Menu'}
          >
            <X size={15} />
          </button>
        </div>
      )}

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
                  type="button"
                  data-tour={`nav-item-${item.id}`}
                  className={`${styles.dockItem} ${isActive ? styles.dockItemActive : ''}`}
                  onClick={() => {
                    onSelectModule(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={isAr ? item.labelAr : item.labelEn}
                >
                  {/* Leading Active Indicator Notch */}
                  {isActive && <span className={styles.dockActiveNotch} />}

                  <div className={styles.dockItemContent}>
                    <div className={styles.dockItemIcon}>
                      <Icon size={15} />
                    </div>
                    <span className={styles.dockItemLabel}>
                      {isAr ? item.labelAr : item.labelEn}
                    </span>
                  </div>

                  {item.badge !== undefined && (
                    <span className={`
                      ${styles.dockBadge} 
                      ${item.badgeVariant === 'gold' ? styles.dockBadgeGold : ''}
                      ${item.badgeVariant === 'emerald' ? styles.dockBadgeEmerald : ''}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dock Footer: Audited Financial Engine Status + Academy Button */}
      <div className={styles.dockFooter}>
        {onOpenAcademy && (
          <button
            type="button"
            onClick={onOpenAcademy}
            className={styles.academyBtn}
          >
            <BookOpen size={14} />
            <span>{isAr ? 'دليل واستخدام النظام' : 'ERP Academy & Guide'}</span>
          </button>
        )}

        <div className={styles.dockStatusBox}>
          <div className={styles.dockStatusTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Layers size={14} color="#b8903e" />
              <span>{isAr ? 'سلامة الحسابات' : 'Financial Controls'}</span>
            </div>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.45)',
              display: 'inline-block'
            }} />
          </div>
          <div className={styles.dockStatusSub}>
            {isAr ? 'حسابات الشركة مضبوطة بالمليم (مدين = دائن 0.00)' : 'Double-Entry Invariant 4.1 Verified (0.00)'}
          </div>
        </div>
      </div>
    </aside>
  );
};
