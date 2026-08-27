'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  TrendingUp,
  LogOut, 
  Languages, 
  ExternalLink,
  Plus,
  Sparkles,
  Menu,
  X,
  Compass,
  Sliders
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

  const isAr = adminLocale === 'ar';

  const navItems = [
    { 
      href: `/admin/${adminLocale}`, 
      label: isAr ? 'لوحة القيادة التنفيذية' : 'Executive Overview', 
      icon: LayoutDashboard, 
      exact: true 
    },
    { 
      href: `/admin/${adminLocale}/properties`, 
      label: isAr ? 'محفظة العقارات' : 'Properties Portfolio', 
      icon: Building2, 
      exact: false 
    },
    { 
      href: `/admin/${adminLocale}/leads`, 
      label: isAr ? 'إدارة العملاء والصفقات' : 'Client Inquiries & CRM', 
      icon: Users, 
      exact: false 
    },
    { 
      href: `/admin/${adminLocale}/analytics`, 
      label: isAr ? 'تحليلات العقارات والذكاء السوقي' : 'Property Analytics', 
      icon: TrendingUp, 
      exact: false 
    },
    { 
      href: `/admin/${adminLocale}/settings`, 
      label: isAr ? 'إعدادات المنصة والسوق' : 'Platform & Market Radar', 
      icon: Sliders, 
      exact: false 
    },
  ] as const;

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
          <Link href={`/admin/${adminLocale}`} style={{ textDecoration: 'none' }}>
            <BrandLogo size="sm" locale={adminLocale} />
          </Link>
        </div>

        {/* Quick Add CTA */}
        <div className={styles.quickActionBox}>
          <Link 
            href={`/admin/${adminLocale}/properties/new`} 
            className={styles.quickAddBtn}
            onClick={() => setIsOpen(false)}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{isAr ? 'إدراج عقار جديد' : 'New Property'}</span>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className={styles.navSection}>
          <span className={styles.sectionHeading}>
            {isAr ? 'القائمة الرئيسية' : 'MAIN NAVIGATION'}
          </span>
          <nav className={styles.nav}>
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link 
                  key={href} 
                  href={href} 
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={styles.navIconBox}>
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
                  </div>
                  <span className={styles.navLabel}>{label}</span>
                  {isActive && <div className={styles.activeDot} />}
                </Link>
              );
            })}
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
