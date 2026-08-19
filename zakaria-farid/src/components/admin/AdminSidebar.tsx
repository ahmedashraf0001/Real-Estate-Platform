'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  LogOut, 
  Languages, 
  ExternalLink,
  Plus,
  Sparkles,
  Menu,
  X,
  Compass
} from 'lucide-react';
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
      label: isAr ? 'لوحة التحكم المركزية' : 'Executive Dashboard', 
      icon: LayoutDashboard, 
      exact: true 
    },
    { 
      href: `/admin/${adminLocale}/properties`, 
      label: isAr ? 'إدارة العقارات' : 'Properties', 
      icon: Building2, 
      exact: false 
    },
    { 
      href: `/admin/${adminLocale}/leads`, 
      label: isAr ? 'طلبات كبار العملاء (CRM)' : 'Client Inquiries & CRM', 
      icon: Users, 
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
          <div className={styles.logoIcon}>ZF</div>
          <span className={styles.mobileTitle}>ZAKARIA FARID</span>
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

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand Header */}
        <div className={styles.brandContainer}>
          <div className={styles.logoRow}>
            <div className={styles.logoIcon}>
              <span>ZF</span>
            </div>
            <div className={styles.logoText}>
              <h2 className={styles.brandTitle}>ZAKARIA FARID</h2>
              <span className={styles.brandSubtitle}>
                <Sparkles size={10} className={styles.sparkleIcon} />
                {isAr ? 'المنظومة المعمارية الفاخرة' : 'LUXURY ARCHITECTURAL STUDIO'}
              </span>
            </div>
          </div>
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
