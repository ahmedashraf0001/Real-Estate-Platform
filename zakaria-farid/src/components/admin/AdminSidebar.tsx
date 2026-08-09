'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Building2, Users, LogOut, Languages, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
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
    { href: `/admin/${adminLocale}`, label: isAr ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: `/admin/${adminLocale}/properties`, label: isAr ? 'العقارات' : 'Properties', icon: Building2, exact: false },
    { href: `/admin/${adminLocale}/leads`, label: isAr ? 'الطلبات' : 'Leads', icon: Users, exact: false },
  ] as const;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  // Generate path swap to alternative language e.g. /admin/en/leads -> /admin/ar/leads
  const nextLang = isAr ? 'en' : 'ar';
  const togglePath = pathname.replace(`/admin/${adminLocale}`, `/admin/${nextLang}`);

  return (
    <>
      <div className={styles.mobileHeader}>
        <div className={styles.logoIcon}>{isAr ? 'ز' : 'ZF'}</div>
        <button className={styles.hamburgerBtn} onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>{isAr ? 'ز' : 'ZF'}</div>
        <div>
          <p className={styles.logoTitle}>زكريا فريد</p>
          <p className={styles.logoSub}>{isAr ? 'لوحة الإدارة' : 'Admin Panel'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Switcher, SignOut & Website Link */}
      <div className={styles.footerActions}>
        <Link href={`/${adminLocale}`} className={styles.websiteBtn}>
          <ExternalLink size={16} strokeWidth={1.5} />
          <span>{isAr ? 'العودة للموقع الرئيسي' : 'Back to Website'}</span>
        </Link>
        <Link href={togglePath} className={styles.langBtn}>
          <Languages size={16} strokeWidth={1.5} />
          <span>{isAr ? 'English' : 'العربية'}</span>
        </Link>
        <button className={styles.signOut} onClick={signOut}>
          <LogOut size={16} strokeWidth={1.5} />
          {isAr ? 'تسجيل الخروج' : 'Sign Out'}
        </button>
      </div>
    </aside>
    </>
  );
}
