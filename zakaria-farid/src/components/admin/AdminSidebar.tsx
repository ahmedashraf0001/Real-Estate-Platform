'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  TrendingUp, 
  LogOut, 
  Languages, 
  ExternalLink, 
  Plus, 
  Menu, 
  X, 
  Sliders, 
  Landmark,
  Sun,
  Moon,
  Search
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { createClient } from '@/lib/supabase/client';
import styles from './AdminSidebar.module.css';

interface AdminSidebarProps {
  adminLocale: string;
}

export default function AdminSidebar({ adminLocale }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light';
    if (currentTheme === 'light' || currentTheme === 'dark') {
      setTheme(currentTheme);
    } else {
      const saved = localStorage.getItem('zf_theme') as 'dark' | 'light';
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('zf_theme', nextTheme);
    document.cookie = `zf_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const isAr = adminLocale === 'ar';

  const navGroups = [
    {
      title: isAr ? 'القيادة والتحليلات' : 'COMMAND & INTELLIGENCE',
      items: [
        { 
          href: `/admin/${adminLocale}`, 
          label: isAr ? 'لوحة القيادة التنفيذية' : 'Executive Dashboard', 
          icon: LayoutDashboard, 
          exact: true 
        },
        { 
          href: `/admin/${adminLocale}/analytics`, 
          label: isAr ? 'تحليلات السوق والذكاء العقاري' : 'Market Intelligence', 
          icon: TrendingUp, 
          exact: false 
        },
      ]
    },
    {
      title: isAr ? 'محفظة العقارات والمشاريع' : 'PROPERTIES & INVENTORY',
      items: [
        { 
          href: `/admin/${adminLocale}/properties`, 
          label: isAr ? 'محفظة العقارات' : 'Properties Portfolio', 
          icon: Building2, 
          exact: true 
        },
        { 
          href: `/admin/${adminLocale}/properties/new`, 
          label: isAr ? 'إدراج صرح معماري جديد' : 'New Property Listing', 
          icon: Plus, 
          exact: true 
        },
      ]
    },
    {
      title: isAr ? 'العملاء وخط الصفقات' : 'CLIENTS & PIPELINE',
      items: [
        { 
          href: `/admin/${adminLocale}/leads`, 
          label: isAr ? 'إدارة العملاء والمعاينات' : 'Client CRM & Pipeline', 
          icon: Users, 
          exact: false 
        },
      ]
    },
    {
      title: isAr ? 'المنظومة المالية والمحاسبة' : 'FINANCIAL ERP WORKSTATION',
      items: [
        { 
          href: `/fin-os/${adminLocale}`, 
          label: isAr ? 'محطة العمل المالية FIN-OS' : 'FIN-OS Workstation', 
          badge: 'v2.4',
          icon: Landmark, 
          exact: false,
          subItems: [
            { href: `/fin-os/${adminLocale}?tab=operations`, label: isAr ? 'الخزينة والعمليات' : 'Treasury & Ops' },
            { href: `/fin-os/${adminLocale}?tab=contracts`, label: isAr ? 'عقود البيع والعملاء' : 'Contracts & Clients' },
            { href: `/fin-os/${adminLocale}?tab=pdc`, label: isAr ? 'أجندة الأقساط والشيكات' : 'PDC & Due Cheques' },
            { href: `/fin-os/${adminLocale}?tab=ledger`, label: isAr ? 'الدفتر العام واليومية' : 'General Ledger' },
            { href: `/fin-os/${adminLocale}?tab=partners`, label: isAr ? 'الشركاء والأرباح' : 'Partners & Equity' },
          ]
        },
      ]
    },
    {
      title: isAr ? 'إعدادات المنصة' : 'PLATFORM & SYSTEM',
      items: [
        { 
          href: `/admin/${adminLocale}/settings`, 
          label: isAr ? 'إعدادات المنصة ورادار السوق' : 'Platform & Market Radar', 
          icon: Sliders, 
          exact: false 
        },
      ]
    }
  ];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  const nextLang = isAr ? 'en' : 'ar';
  const togglePath = pathname.replace(`/admin/${adminLocale}`, `/admin/${nextLang}`);

  return (
    <>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileBrand}>
          <BrandLogo size="sm" locale={adminLocale} />
        </div>
        <button 
          className={styles.hamburgerBtn} 
          onClick={() => setIsOpen(!isOpen)} 
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${isAr ? styles.sidebarRtl : ''} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand Header */}
        <div className={styles.brandContainer}>
          <Link href={`/admin/${adminLocale}`} style={{ textDecoration: 'none' }} onClick={() => setIsOpen(false)}>
            <BrandLogo size="sm" locale={adminLocale} />
          </Link>
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={() => setIsOpen(false)}
            aria-label={isAr ? 'إغلاق القائمة الجانبية' : 'Close Sidebar'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Omni-Search Trigger Button */}
        <div className={styles.searchTriggerBox}>
          <button
            type="button"
            className={styles.omniSearchBtn}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('zf:open-search'));
              }
            }}
            title={isAr ? 'البحث الشامل في المنظومة (⌘K)' : 'Universal Omni-Search (⌘K)'}
            aria-label={isAr ? 'البحث الشامل' : 'Omni-Search'}
          >
            <div className={styles.omniSearchContent}>
              <Search size={15} className={styles.omniSearchIcon} />
              <span className={styles.omniSearchLabel}>
                {isAr ? 'بحث شامل في المنظومة...' : 'Search system...'}
              </span>
            </div>
            <kbd className={styles.omniSearchKbd}>⌘K</kbd>
          </button>
        </div>

        {/* Grouped Navigation Sections */}
        <div className={styles.navSection}>
          <nav className={styles.nav}>
            {navGroups.map((grp, gIdx) => (
              <div key={gIdx} style={{ marginBottom: '1.25rem' }}>
                <span className={styles.sectionHeading} style={{ display: 'block', marginBottom: '0.45rem', padding: '0 0.5rem' }}>
                  {grp.title}
                </span>
                {grp.items.map((item) => {
                  const { href, label, icon: Icon, exact, badge, subItems } = item as any;
                  const isActive = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <div key={href} style={{ display: 'flex', flexDirection: 'column' }}>
                      <Link 
                        href={href} 
                        className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className={styles.navIconBox}>
                          <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
                        </div>
                        <span className={styles.navLabel}>{label}</span>
                        {badge && <span className={styles.erpVersionBadge}>{badge}</span>}
                        {isActive && !badge && <div className={styles.activeDot} />}
                      </Link>

                      {subItems && (
                        <div className={styles.subItemsList}>
                          {subItems.map((sub: { href: string; label: string }) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={styles.subItem}
                              onClick={() => setIsOpen(false)}
                            >
                              <span className={styles.subItemDot}>•</span>
                              <span className={styles.subItemLabel}>{sub.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom System Actions */}
        <div className={styles.footerActions}>
          <Link 
            href={`/${adminLocale}`} 
            className={styles.websiteBtn} 
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} strokeWidth={1.8} />
            <span>{isAr ? 'معاينة المنصة الحية' : 'Live Platform View'}</span>
          </Link>

          <div className={styles.systemControlsRow}>
            <button 
              type="button" 
              className={styles.themeToggleBtn} 
              onClick={toggleTheme}
              title={isAr ? (theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي') : (theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode')}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
              <span>{isAr ? (theme === 'dark' ? 'نهاري' : 'ليلي') : (theme === 'dark' ? 'Light' : 'Dark')}</span>
            </button>

            <Link href={togglePath} className={styles.langBtn}>
              <Languages size={15} strokeWidth={1.8} />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </Link>

            <button className={styles.signOutBtn} onClick={signOut} title={isAr ? 'تسجيل الخروج' : 'Sign Out'}>
              <LogOut size={15} strokeWidth={1.8} />
              <span>{isAr ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
