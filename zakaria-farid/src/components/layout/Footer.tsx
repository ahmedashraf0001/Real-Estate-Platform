import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MessageCircle, Phone, Camera, Globe2, ArrowUpRight, MapPin } from 'lucide-react';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import styles from './Footer.module.css';

const navLinks = [
  { key: 'home', href: '/' },
  { key: 'properties', href: '/properties' },
  { key: 'about', href: '/about' },
  { key: 'map', href: '/map' },
  { key: 'contact', href: '/contact' },
] as const;

interface FooterProps {
  locale: string;
}

export default function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');
  const tn = useTranslations('nav');
  const year = new Date().getFullYear();
  const isAr = locale === 'ar';

  return (
    <footer className={styles.footer}>
      {/* Top accent bar */}
      <div className={styles.accentBar} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        {/* Col 1: Brand */}
        <div className={styles.brandCol}>
          <div className={styles.logoRow}>
            <div className={styles.logoIcon}>{isAr ? 'ز' : 'ZF'}</div>
            <span className={styles.logoText}>{isAr ? 'زكريا فريد' : 'Zakaria Farid'}</span>
          </div>
          <p className={styles.blurb}>{t('about_blurb')}</p>

          {/* Location */}
          <div className={styles.locationTag}>
            <MapPin size={14} strokeWidth={1.5} />
            <span>{isAr ? 'الشيخ زايد، القاهرة الجديدة — مصر' : 'Sheikh Zayed, New Cairo — Egypt'}</span>
          </div>

          {/* Social Icons */}
          <div className={styles.socials}>
            <a href="#" className={styles.social} aria-label="Instagram">
              <Camera size={16} strokeWidth={1.5} />
            </a>
            <a href="#" className={styles.social} aria-label="Facebook">
              <Globe2 size={16} strokeWidth={1.5} />
            </a>
            <a
              href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحبا' : 'Hello')}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.social} ${styles.socialWa}`}
              aria-label="WhatsApp"
            >
              <MessageCircle size={16} strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {/* Col 2: Quick links */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>{t('quick_links')}</h4>
          <ul className={styles.linkList}>
            {navLinks.map(({ key, href }) => (
              <li key={key}>
                <Link href={`/${locale}${href === '/' ? '' : href}`} className={styles.footerLink}>
                  <ArrowUpRight size={14} strokeWidth={2} className={styles.linkArrow} />
                  {tn(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Contact */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>{t('contact')}</h4>
          <div className={styles.contactList}>
            <a href={`tel:+${WHATSAPP_NUMBER}`} className={styles.contactItem}>
              <div className={styles.contactIcon}><Phone size={14} strokeWidth={1.5} /></div>
              <span>+{WHATSAPP_NUMBER}</span>
            </a>
            <a
              href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحبا، أنا مهتم بعقار.' : 'Hello, I am interested in a property.')}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <div className={styles.contactIcon}><MessageCircle size={14} strokeWidth={1.5} /></div>
              <span>WhatsApp</span>
            </a>
          </div>

          <a
            href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحبا، أنا مستعد للعثور على منزلي.' : 'Hello, I am ready to find my home.')}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaBtn}
          >
            <MessageCircle size={15} strokeWidth={1.5} />
            {isAr ? 'تواصل الآن' : 'Get in Touch'}
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <div className={`container ${styles.bottomInner}`}>
          <p className={styles.rights}>© {year} Zakaria Farid. {t('rights')}</p>
          <p className={styles.tagline}>{isAr ? 'مباشرة من المالك — بدون عمولات' : 'Direct from Owner — Zero Commission'}</p>
        </div>
      </div>
    </footer>
  );
}
