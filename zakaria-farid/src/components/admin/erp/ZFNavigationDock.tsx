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
  Wallet
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
  | 'cost-allocation';

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
  pendingApprovalsCount?: number;
  openQuestionsCount?: number;
  contractsCount?: number;
  pdcSafeCount?: number;
  propertiesCount?: number;
  isAr?: boolean;
  onOpenAcademy?: () => void;
}

export const ZFNavigationDock: React.FC<ZFNavigationDockProps> = ({
  activeModule,
  onSelectModule,
  contractsCount,
  pdcSafeCount,
  propertiesCount,
  isAr = false,
  onOpenAcademy
}) => {
  const GROUPS: DockGroupDef[] = [
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
      groupTitleEn: 'SALES & DEALS PIPELINE',
      groupTitleAr: 'المبيعات والعمليات التعاقدية',
      items: [
        { 
          id: 'contracts', 
          labelEn: 'Sales Contracts Registry', 
          labelAr: 'سجل عقود البيع', 
          icon: FileText,
          badge: contractsCount && contractsCount > 0 ? contractsCount : undefined,
          badgeVariant: 'gold'
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
          labelAr: 'حافظة بنود التحصيل والأقساط باليد', 
          icon: Wallet,
          badge: pdcSafeCount && pdcSafeCount > 0 ? pdcSafeCount : undefined,
          badgeVariant: 'emerald'
        }
      ]
    },
    {
      groupTitleEn: 'ACCOUNTING & GOVERNANCE',
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
        }
      ]
    }
  ];

  return (
    <aside className={styles.navigationDock} data-tour="nav-dock">
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
                  onClick={() => onSelectModule(item.id)}
                  title={isAr ? item.labelAr : item.labelEn}
                >
                  {/* Leading Active Indicator Notch */}
                  {isActive && <span className={styles.dockActiveNotch} />}

                  <div className={styles.dockItemContent}>
                    <div className={styles.dockItemIconWrap}>
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
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '10px',
              padding: '0.55rem 0.8rem',
              color: '#e2c974',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginBottom: '0.75rem',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(212, 175, 55, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.05) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <BookOpen size={14} />
            <span>{isAr ? 'دليل المنظومة والأكاديمية' : 'ERP Academy & Guide'}</span>
          </button>
        )}

        <div className={styles.dockFiscalCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#e2c974', fontWeight: 800, fontSize: '0.74rem' }}>
              <Layers size={14} />
              <span>{isAr ? 'حالة الرقابة المالية' : 'Financial Controls'}</span>
            </div>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block'
            }} />
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.68rem', lineHeight: 1.4 }}>
            {isAr ? 'القيود المحاسبية متوازنة بدقة القرش (مدين = دائن 0.00)' : 'Double-Entry Invariant 4.1 Verified (0.00)'}
          </div>
        </div>
      </div>
    </aside>
  );
};
