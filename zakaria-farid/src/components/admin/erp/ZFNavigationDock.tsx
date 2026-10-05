'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  TrendingUp, 
  BookOpen, 
  FileText, 
  Building2, 
  Calculator,
  Wallet,
  Zap,
  Users,
  X,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  HardHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  LineChart
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import styles from './v2/ZFWorkstationShell.module.css';

export type ERPNavModule = 
  | 'cockpit'
  | 'operations'
  | 'properties'
  | 'construction'
  | 'calculator'
  | 'analysis'
  | 'contracts'
  | 'pdc'
  | 'partners'
  | 'ledger'
  | 'rescissions'
  | 'cost-allocation'
  | 'tax';

interface NavItemDef {
  id: ERPNavModule;
  labelEn: string;
  labelAr: string;
  icon: React.ComponentType<{ size?: number | string; color?: string; className?: string; strokeWidth?: number }>;
  badge?: string | number;
  hasExpandable?: boolean;
  subItems?: { id: ERPNavModule; labelEn: string; labelAr: string }[];
}

interface NavGroupDef {
  groupTitleEn: string;
  groupTitleAr: string;
  items: NavItemDef[];
}

interface ZFNavigationDockProps {
  activeModule?: ERPNavModule;
  onSelectModule?: (module: ERPNavModule) => void;
  urgentDuesCount?: number;
  overdueAPCount?: number;
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
  onToggleDock?: () => void;
  onQuickRequest?: () => void;
  width?: number;
  isResizing?: boolean;
  quickMenu?: Array<{ key: string; labelAr: string; labelEn: string; icon: React.ReactNode; onSelect: () => void }>;
}

export const ZFNavigationDock: React.FC<ZFNavigationDockProps> = ({
  activeModule,
  onSelectModule,
  urgentDuesCount,
  overdueAPCount,
  contractsCount,
  pdcSafeCount,
  propertiesCount,
  isAr = true,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
  onToggleDock,
  onQuickRequest,
  width,
  isResizing = false,
  quickMenu,
}) => {
  const pathname = usePathname() || '';
  const router = useRouter();

  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const menuWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isQuickMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsQuickMenuOpen(false);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (menuWrapperRef.current && !menuWrapperRef.current.contains(e.target as Node)) {
        setIsQuickMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isQuickMenuOpen]);

  const effectiveActiveModule = useMemo<ERPNavModule>(() => {
    if (activeModule) return activeModule;
    if (pathname.includes('/operations')) return 'operations';
    if (pathname.includes('/properties')) return 'properties';
    if (pathname.includes('/cost-allocation')) return 'cost-allocation';
    if (pathname.includes('/construction')) return 'construction';
    if (pathname.includes('/calculator')) return 'calculator';
    if (pathname.includes('/analysis')) return 'analysis';
    if (pathname.includes('/contracts')) return 'contracts';
    if (pathname.includes('/rescissions')) return 'rescissions';
    if (pathname.includes('/pdc')) return 'pdc';
    if (pathname.includes('/partners')) return 'partners';
    if (pathname.includes('/ledger')) return 'ledger';
    if (pathname.includes('/tax')) return 'tax';
    return 'cockpit';
  }, [activeModule, pathname]);

  const handleModuleClick = (targetMod: ERPNavModule) => {
    if (onSelectModule) {
      onSelectModule(targetMod);
    } else {
      const subRoute = targetMod === 'cockpit' ? '' : `/${targetMod}`;
      const localeStr = isAr ? 'ar' : 'en';
      router.push(`/fin-os/${localeStr}${subRoute}`);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    // Drop-down menus closed by default on initial load.
    // Only open if the current active route matches a sub-item.
    const initial: Record<string, boolean> = {};
    if (effectiveActiveModule === 'cost-allocation') initial['properties'] = true;
    if (effectiveActiveModule === 'rescissions') initial['contracts'] = true;
    if (effectiveActiveModule === 'tax') initial['ledger'] = true;
    return initial;
  });

  const toggleExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems((prev) => {
      const currentlyExpanded = !!prev[itemId] || 
        (itemId === 'properties' && effectiveActiveModule === 'cost-allocation') || 
        (itemId === 'contracts' && effectiveActiveModule === 'rescissions') || 
        (itemId === 'ledger' && effectiveActiveModule === 'tax');
      return { ...prev, [itemId]: !currentlyExpanded };
    });
  };

  const GROUPS: NavGroupDef[] = [
    {
      groupTitleEn: 'COMMAND & OPERATIONS',
      groupTitleAr: 'القيادة والعمليات',
      items: [
        { 
          id: 'cockpit', 
          labelEn: 'Executive Dashboard', 
          labelAr: 'قمرة القيادة', 
          icon: TrendingUp 
        },
        { 
          id: 'operations', 
          labelEn: 'Daily Cashier & Ops', 
          labelAr: 'حركة الخزينة والعمليات', 
          icon: Zap,
          badge: urgentDuesCount && urgentDuesCount > 0 ? urgentDuesCount : undefined,
        }
      ]
    },
    {
      groupTitleEn: 'PROJECTS & CONSTRUCTION',
      groupTitleAr: 'المشاريع والإنشاءات',
      items: [
        { 
          id: 'properties', 
          labelEn: 'Projects & Units', 
          labelAr: 'محفظة المشاريع والوحدات', 
          icon: Building2,
          badge: propertiesCount && propertiesCount > 0 ? propertiesCount : undefined,
          hasExpandable: true,
          subItems: [
            { id: 'properties', labelEn: 'All Properties', labelAr: 'جميع الوحدات' },
            { id: 'cost-allocation', labelEn: 'RSV Capitalization', labelAr: 'تخصيص تكاليف RSV' }
          ]
        },
        { 
          id: 'construction', 
          labelEn: 'Construction & Payables', 
          labelAr: 'مصاريف البناء والمقاولين', 
          icon: HardHat,
          badge: overdueAPCount && overdueAPCount > 0 ? overdueAPCount : undefined,
        },
        { 
          id: 'calculator', 
          labelEn: 'Feasibility & Pricing', 
          labelAr: 'حاسبة التكاليف والجدوى', 
          icon: Calculator 
        },
        { 
          id: 'analysis', 
          labelEn: 'Property Lifecycle & Analysis', 
          labelAr: 'تحليل العقارات والجدوى', 
          icon: LineChart 
        }
      ]
    },
    {
      groupTitleEn: 'SALES & CONTRACTS',
      groupTitleAr: 'المبيعات والعملاء',
      items: [
        { 
          id: 'contracts', 
          labelEn: 'Sales Contracts', 
          labelAr: 'عقود البيع والعملاء', 
          icon: FileText,
          badge: contractsCount && contractsCount > 0 ? contractsCount : undefined,
          hasExpandable: true,
          subItems: [
            { id: 'contracts', labelEn: 'Active Registry', labelAr: 'سجل العقود المعتمدة' },
            { id: 'rescissions', labelEn: 'Contract Rescissions', labelAr: 'فسخ واسترداد العقود' }
          ]
        },
        { 
          id: 'pdc', 
          labelEn: 'Collections & Cheques', 
          labelAr: 'أجندة التحصيلات والشيكات', 
          icon: Wallet,
          badge: pdcSafeCount && pdcSafeCount > 0 ? pdcSafeCount : undefined,
        }
      ]
    },
    {
      groupTitleEn: 'FINANCE & GOVERNANCE',
      groupTitleAr: 'الحسابات والشركاء',
      items: [
        { 
          id: 'partners', 
          labelEn: 'Partners & Financiers', 
          labelAr: 'الشركاء وممولو المشاريع', 
          icon: Users 
        },
        { 
          id: 'ledger', 
          labelEn: 'General Ledger', 
          labelAr: 'الدفتر العام واليومية', 
          icon: BookOpen,
          hasExpandable: true,
          subItems: [
            { id: 'ledger', labelEn: 'Journal Entries', labelAr: 'قيود اليومية العامة' },
            { id: 'tax', labelEn: 'Property Taxes', labelAr: 'الضرائب والرسوم العقارية' }
          ]
        }
      ]
    }
  ];

  return (
    <aside 
      className={`
        ${styles.sidebar} 
        ${isCollapsed ? styles.sidebarCollapsed : ''} 
        ${isMobileOpen ? styles.sidebarMobileOpen : ''}
      `} 
      style={{
        ...(isCollapsed 
          ? { width: '68px', minWidth: '68px', maxWidth: '68px' } 
          : (width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {})),
        ...(isResizing ? { transition: 'none' } : {})
      }}
      dir={isAr ? 'rtl' : 'ltr'}
      data-tour="nav-dock"
    >
      {/* 1. Header: Logo + small tagline top-leading, collapse icon top-trailing */}
      <div className={styles.sidebarHeader}>
        <div className={styles.brandBlock}>
          <Link 
            href={`/fin-os/${isAr ? 'ar' : 'en'}`} 
            className={styles.brandLogoLink}
            title={isAr ? 'آل زكريا للتطوير والاستثمار العقاري' : 'Al Zakaria Real Estate Development & ERP'}
          >
            <BrandLogo size="sm" locale={isAr ? 'ar' : 'en'} emblemOnly />
          </Link>
          {!isCollapsed && (
            <div className={styles.brandTaglineCol}>
              <span className={styles.brandTitleText}>
                {isAr ? 'آل زكريا' : 'Al Zakaria'}
              </span>
              <span className={styles.brandTaglineText}>
                {isAr ? 'للتطوير والاستثمار العقاري' : 'Real Estate Development & ERP'}
              </span>
            </div>
          )}
        </div>

        {/* Collapse icon button */}
        {onToggleDock && (
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleDock}
            title={isCollapsed 
              ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar')
              : (isAr ? 'طي القائمة' : 'Collapse Sidebar')}
            aria-label={isCollapsed 
              ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar')
              : (isAr ? 'طي القائمة' : 'Collapse Sidebar')}
          >
            {isAr ? (
              isCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />
            ) : (
              isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />
            )}
          </button>
        )}

        {/* Mobile close button */}
        {isMobileOpen && onCloseMobile && (
          <button
            type="button"
            className={styles.mobileCloseBtn}
            onClick={onCloseMobile}
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Inner sidebar body (clean vertical flow and padding, no outer scrollbar) */}
      <div className={styles.sidebarBody}>
        {/* User Profile Card (directly below brand header, above CTA button) */}
        {!isCollapsed ? (
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>
              {isAr ? 'ف.ز' : 'FZ'}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>
                {isAr ? 'فريد زكريا' : 'Farid Zakaria'}
              </span>
              <span className={styles.profileRole}>
                {isAr ? 'المطور العقاري' : 'Real Estate Developer'}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.profileCardCollapsed} title={isAr ? 'فريد زكريا - المطور العقاري' : 'Farid Zakaria - Real Estate Developer'}>
            <div className={styles.profileAvatarSmall}>
              {isAr ? 'ف.ز' : 'FZ'}
            </div>
          </div>
        )}

        {/* 2. Full-width solid-color primary button (Full Pill) */}
        <div ref={menuWrapperRef} className={`${styles.actionBtnWrapper} ${styles.quickMenuAnchor}`}>
          <button
            type="button"
            className={styles.primaryActionButton}
            onClick={
              quickMenu && quickMenu.length > 0
                ? () => setIsQuickMenuOpen(prev => !prev)
                : (onQuickRequest || (() => onSelectModule?.('operations')))
            }
            aria-haspopup={quickMenu && quickMenu.length > 0 ? 'menu' : undefined}
            aria-expanded={quickMenu && quickMenu.length > 0 ? isQuickMenuOpen : undefined}
            title={isAr ? 'إجراء جديد' : 'New action'}
          >
            <Plus size={15} strokeWidth={2.5} />
            {!isCollapsed && (
              <span>{isAr ? 'طلب جديد' : 'New request'}</span>
            )}
          </button>
          {quickMenu && quickMenu.length > 0 && isQuickMenuOpen && (
            <div role="menu" className={styles.quickMenu}>
              {quickMenu.map(item => (
                <button
                  key={item.key}
                  role="menuitem"
                  type="button"
                  className={styles.quickMenuItem}
                  onClick={() => {
                    setIsQuickMenuOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  <span>{isAr ? item.labelAr : item.labelEn}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Nav items grouped under plain gray section labels */}
        <div className={styles.navSectionsContainer}>
          {GROUPS.map((grp, gIdx) => (
            <div key={gIdx} className={styles.navGroup}>
              {!isCollapsed && (
                <span className={styles.groupLabel}>
                  {isAr ? grp.groupTitleAr : grp.groupTitleEn}
                </span>
              )}

              <div className={styles.groupItemsList}>
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = effectiveActiveModule === item.id;
                  const isExpanded = !!expandedItems[item.id] ||
                    (item.id === 'properties' && effectiveActiveModule === 'cost-allocation') ||
                    (item.id === 'contracts' && effectiveActiveModule === 'rescissions') ||
                    (item.id === 'ledger' && effectiveActiveModule === 'tax');

                  return (
                    <div key={item.id} className={styles.navItemWrapper}>
                      <button
                        type="button"
                        className={`
                          ${styles.navItem} 
                          ${isActive ? styles.navItemActive : ''}
                        `}
                        onClick={() => handleModuleClick(item.id)}
                        title={isAr ? item.labelAr : item.labelEn}
                        data-tour={`nav-item-${item.id}`}
                      >
                        {/* Colored vertical bar on the leading edge for active item */}
                        {isActive && <span className={styles.leadingBar} />}

                        <div className={styles.navItemMain}>
                          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} />
                          {!isCollapsed && (
                            <span className={styles.navItemLabel}>
                              {isAr ? item.labelAr : item.labelEn}
                            </span>
                          )}
                        </div>

                        {!isCollapsed && (
                          <div className={styles.navItemTrailing}>
                            {item.hasExpandable && (
                              <span 
                                className={styles.chevronToggle}
                                onClick={(e) => toggleExpand(item.id, e)}
                                aria-label={isExpanded ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'توسيع' : 'Expand')}
                              >
                                {isExpanded ? (
                                  <ChevronDown size={14} />
                                ) : isAr ? (
                                  <ChevronLeft size={14} />
                                ) : (
                                  <ChevronRight size={14} />
                                )}
                              </span>
                            )}

                            {item.badge !== undefined && (
                              <span className={styles.itemBadge}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Sub-items if expanded */}
                      {!isCollapsed && item.hasExpandable && isExpanded && item.subItems && (
                        <div className={styles.subItemsList}>
                          {item.subItems.map((sub, sIdx) => {
                            const isSubActive = effectiveActiveModule === sub.id;
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                className={`
                                  ${styles.subItem} 
                                  ${isSubActive ? styles.subItemActive : ''}
                                `}
                                onClick={() => handleModuleClick(sub.id)}
                                data-tour={`nav-item-${sub.id}`}
                              >
                                <span className={styles.subItemBullet}>•</span>
                                <span className={styles.subItemLabel}>
                                  {isAr ? sub.labelAr : sub.labelEn}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 5. Minimal footer link to Main Site / Platform */}
        <div className={styles.sidebarFooter}>
          <Link
            href={`/admin/${isAr ? 'ar' : 'en'}`}
            className={styles.returnAdminLink}
            title={isAr ? 'العودة للمنصة الإدارية' : 'Return to Admin'}
          >
            <ArrowRight size={13} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
            {!isCollapsed && (
              <span>{isAr ? 'لوحة العقارات العامة' : 'Properties Admin'}</span>
            )}
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default ZFNavigationDock;
