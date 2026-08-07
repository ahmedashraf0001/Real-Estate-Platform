'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageCircle } from 'lucide-react';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import styles from './Header.module.css';

const navLinks = [
  { key: 'home', href: '/' },
  { key: 'properties', href: '/properties' },
  { key: 'about', href: '/about' },
  { key: 'map', href: '/map' },
  { key: 'contact', href: '/contact' },
] as const;

interface HeaderProps {
  locale: string;
}

export default function Header({ locale }: HeaderProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const isTransparent = isHome && !scrolled && !menuOpen;
  const otherLocale = locale === 'en' ? 'ar' : 'en';
  // Build locale-switched path
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;

  return (
    <>
      <header
        className={`${styles.header} ${isTransparent ? styles.transparent : styles.solid} ${scrolled ? styles.scrolled : ''}`}
      >
        <div className={`container ${styles.inner}`}>
          {/* Logo */}
          <Link href={`/${locale}`} className={styles.logo}>
            <span className={styles.logoIcon}>ZF</span>
            <span className={styles.logoText}>Zakaria Farid</span>
          </Link>

          {/* Desktop nav */}
          <nav className={styles.nav}>
            {navLinks.map(({ key, href }) => {
              const fullHref = `/${locale}${href === '/' ? '' : href}`;
              const isActive = pathname === fullHref || (href !== '/' && pathname.startsWith(fullHref));
              return (
                <Link
                  key={key}
                  href={fullHref}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                >
                  {t(key)}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href={otherLocalePath} className={styles.localeSwitch} aria-label="Switch language">
              {otherLocale === 'ar' ? 'ع' : 'EN'}
            </Link>
            <a
              href={whatsappUrl(WHATSAPP_NUMBER)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.waBtn}
              aria-label="WhatsApp"
            >
              <MessageCircle size={17} strokeWidth={1.5} />
              <span className={styles.waBtnText}>{locale === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
            </a>
            {/* Mobile menu toggle */}
            <button
              className={styles.menuBtn}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <nav className={styles.mobileNav}>
              {navLinks.map(({ key, href }, i) => {
                const fullHref = `/${locale}${href === '/' ? '' : href}`;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    <Link
                      href={fullHref}
                      className={styles.mobileNavLink}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t(key)}
                    </Link>
                  </motion.div>
                );
              })}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className={styles.mobileDivider}
              />
              <motion.a
                href={whatsappUrl(WHATSAPP_NUMBER, 'Hello, I am interested in a property.')}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn-accent ${styles.mobileWa}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => setMenuOpen(false)}
              >
                <MessageCircle size={18} strokeWidth={1.5} />
                WhatsApp Us
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
