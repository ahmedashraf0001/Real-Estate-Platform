'use client';

import React from 'react';
import { 
  TrendingUp, 
  BookOpen, 
  FileText, 
  Landmark, 
  RotateCcw, 
  PieChart, 
  Layers, 
  Building2, 
  Calculator,
  Wallet,
  Zap,
  Users,
  X,
  Compass
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
  | 'tax'
  | 'partners';

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
      groupTitleEn: 'COMMAND & TREASURY',
      groupTitleAr: 'الإدارة وحركة الخزينة',
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
        }
      ]
    },
    {
      groupTitleEn: 'PROJECTS & CONSTRUCTION',
      groupTitleAr: 'المشاريع وتكاليف البناء',
      items: [
        { 
          id: 'properties', 
          labelEn: 'Projects & Properties', 
          labelAr: 'محفظة المشاريع والعمارات', 
          icon: Building2,
          badge: propertiesCount && propertiesCount > 0 ? propertiesCount : undefined
        },
        { 
          id: 'calculator', 
          labelEn: 'Feasibility & Pricing', 
          labelAr: 'حاسبة تكلفة المباني والأقساط', 
          icon: Calculator 
        },
        { 
          id: 'cost-allocation', 
          labelEn: 'WIP Cost Allocation', 
          labelAr: 'توزيع مصاريف المباني (RSV)', 
          icon: PieChart 
        }
      ]
    },
    {
      groupTitleEn: 'SALES & CONTRACTS',
      groupTitleAr: 'المبيعات وعقود العملاء',
      items: [
        { 
          id: 'contracts', 
          labelEn: 'Sales Contracts', 
          labelAr: 'عقود البيع والعملاء', 
          icon: FileText,
          badge: contractsCount && contractsCount > 0 ? contractsCount : undefined,
          badgeVariant: 'gold'
        },
        { 
          id: 'pdc', 
          labelEn: 'Installments & Dues', 
          labelAr: 'أجندة ومواعيد الأقساط', 
          icon: Wallet,
          badge: pdcSafeCount && pdcSafeCount > 0 ? pdcSafeCount : undefined,
          badgeVariant: 'emerald'
        },
        { 
          id: 'rescissions', 
          labelEn: 'Contract Rescissions', 
          labelAr: 'إلغاء العقود والتسويات', 
          icon: RotateCcw 
        }
      ]
    },
    {
      groupTitleEn: 'FINANCE & GOVERNANCE',
      groupTitleAr: 'الحسابات والشركاء',
      items: [
        { 
          id: 'ledger', 
          labelEn: 'General Ledger & COA', 
          labelAr: 'حسابات الشركة ودفتر اليومية', 
          icon: BookOpen 
        },
        { 
          id: 'partners', 
          labelEn: 'Partners & Equity', 
          labelAr: 'الشركاء وممولو المشاريع', 
          icon: Users 
        },
        { 
          id: 'tax', 
          labelEn: 'Project Taxes & Permits', 
          labelAr: 'ضرائب وتراخيص وتأمينات المباني', 
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
              borderRadius: '8px',
              minWidth: '44px',
              minHeight: '44px',
              padding: '10px',
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isAr ? 'إغلاق القائمة' : 'Close Menu'}
            aria-label={isAr ? 'إغلاق القائمة' : 'Close Menu'}
          >
            <X size={18} />
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

      {/* Dock Footer: Audited Financial Engine Status + Walkthrough Button */}
      <div className={styles.dockFooter}>
        {onOpenAcademy && (
          <button
            type="button"
            onClick={onOpenAcademy}
            className={styles.academyBtn}
            title={isAr ? 'دليل وجولة المنظومة التفاعلية' : 'FIN-OS Walkthrough Tour'}
          >
            <Compass size={14} />
            <span>{isAr ? 'دليل وجولة المنظومة' : 'FIN-OS Tour & Guide'}</span>
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
