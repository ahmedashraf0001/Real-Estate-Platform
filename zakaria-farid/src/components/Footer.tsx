'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { usePlatformSettings } from '@/lib/hooks/usePlatformSettings';

interface FooterProps {
  locale?: string;
  onNavigate?: (view: string) => void;
  onSelectPropertyType?: (type: string) => void;
  onSelectDestination?: (dest: string) => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  locale = 'en',
  onNavigate: propOnNavigate,
  onSelectPropertyType: propOnSelectType,
  onSelectDestination: propOnSelectDest,
  onOpenAdmin
}) => {
  const router = useRouter();
  const isAr = locale === 'ar';
  const { contact } = usePlatformSettings();

  const onNavigate = (view: string) => {
    if (propOnNavigate) {
      propOnNavigate(view);
    } else {
      if (view === 'home') router.push('/' + locale);
      else router.push('/' + locale + '/' + view);
    }
  };

  const onSelectPropertyType = (type: string) => {
    if (propOnSelectType) {
      propOnSelectType(type);
    } else {
      router.push('/' + locale + '/properties?type=' + encodeURIComponent(type));
    }
  };

  const onSelectDestination = (dest: string) => {
    if (propOnSelectDest) {
      propOnSelectDest(dest);
    } else {
      router.push('/' + locale + '/properties?location=' + encodeURIComponent(dest));
    }
  };
  return (
    <footer className="luxury-footer">
      <div className="container">
        {/* Main Grid */}
        <div className="footer-main-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <BrandLogo 
              size="lg" 
              showSubtitle={true}
              locale={locale}
              onClick={() => onNavigate('home')} 
            />
            <p className="footer-brand-desc">
              {isAr 
                ? 'نرتقي بالعقارات المصرية الفاخرة إلى مستوى التحف المعمارية الخالدة. ننتقي ونمثل أندر القصور والصروح المعمارية بأعلى معايير الحصرية والسيادة.'
                : "Elevating Egyptian real estate into an art form. We curate high-design, luxury architectural masterworks in the country's most sought-after destinations."}
            </p>
            <div className="footer-socials">
              <a href="#instagram" className="social-icon-btn" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#facebook" className="social-icon-btn" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#youtube" className="social-icon-btn" aria-label="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"></polygon>
                </svg>
              </a>
              <a href="#twitter" className="social-icon-btn" aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                  <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Properties Links */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">{isAr ? 'أنواع العقارات' : 'PROPERTIES'}</h4>
            <ul className="footer-links">
              {(isAr ? [
                { id: 'footer-apt-luxury', label: 'شقق سكنية فاخرة', filter: 'apartment' },
                { id: 'footer-bld-whole', label: 'عمائر كاملة (عمارة)', filter: 'building' },
                { id: 'footer-grg-bays', label: 'جراجات وباكيات خاصة', filter: 'garage' },
                { id: 'footer-apt-duplex', label: 'شقق دوبلكس ورووف', filter: 'apartment' },
              ] : [
                { id: 'footer-apt-luxury', label: 'Luxury Apartments', filter: 'apartment' },
                { id: 'footer-bld-whole', label: 'Whole Buildings', filter: 'building' },
                { id: 'footer-grg-bays', label: 'Garages & Bays', filter: 'garage' },
                { id: 'footer-apt-duplex', label: 'Duplexes & Roofs', filter: 'apartment' },
              ]).map((item) => (
                <li key={item.id}>
                  <button 
                    className="footer-link-btn"
                    onClick={() => {
                      if (propOnSelectType) {
                        propOnSelectType(item.filter);
                        onNavigate('properties');
                      } else {
                        router.push('/' + locale + '/properties?type=' + encodeURIComponent(item.filter));
                      }
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Destinations Links */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">{isAr ? 'الوجهات الاستثمارية' : 'DESTINATIONS'}</h4>
            <ul className="footer-links">
              {(isAr ? [
                { label: 'القاهرة الجديدة', filter: 'New Cairo' },
                { label: 'الشيخ زايد', filter: 'Sheikh Zayed' },
                { label: 'الساحل الشمالي', filter: 'North Coast' },
                { label: 'الجونة', filter: 'Gouna' },
                { label: 'العين السخنة', filter: 'Ain Sokhna' },
                { label: 'مدينتي', filter: 'Madinaty' },
              ] : [
                { label: 'New Cairo', filter: 'New Cairo' },
                { label: 'Sheikh Zayed', filter: 'Sheikh Zayed' },
                { label: 'North Coast (Sahel)', filter: 'North Coast' },
                { label: 'El Gouna', filter: 'Gouna' },
                { label: 'Ain Sokhna', filter: 'Ain Sokhna' },
                { label: 'Madinaty', filter: 'Madinaty' },
              ]).map((item) => (
                <li key={item.filter}>
                  <button 
                    className="footer-link-btn"
                    onClick={() => {
                      if (propOnSelectDest) {
                        propOnSelectDest(item.filter);
                        onNavigate('properties');
                      } else {
                        router.push('/' + locale + '/properties?location=' + encodeURIComponent(item.filter));
                      }
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Inquiries Column */}
          <div className="footer-nav-col inquiries-col">
            <h4 className="footer-col-title">{isAr ? 'بيانات التواصل' : 'INQUIRIES'}</h4>
            <div className="inquiry-info-item">
              <span className="inquiry-address">
                {isAr ? (contact?.addressAr || 'برج جراند G-08، الحي المالي، القاهرة الجديدة، مصر') : (contact?.addressEn || 'G-08 Grand Tower, Financial District,\nNew Cairo, Egypt')}
              </span>
            </div>
            <div className="inquiry-info-item">
              <a href={`tel:${(contact?.phone || '+20 2 19688').replace(/\s+/g, '')}`} className="inquiry-phone">
                {contact?.phone || '+20 2 19688'}
              </a>
            </div>
            <div className="inquiry-info-item">
              <a href={`mailto:${contact?.email || 'concierge@zakariafarid.com'}`} className="inquiry-email">
                {contact?.email || 'concierge@zakariafarid.com'}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copy">
            {isAr ? '© ٢٠٢٦ آل زكريا. المجموعة العقارية والاستشارات السيادية.' : '© 2026 AL ZAKARIA. Sovereign Real Estate & Advisory.'}
          </div>
          <div className="footer-credits">
            <span>{isAr ? 'تصميم وإدارة تنفيذية بمعايير الفخامة العالمية. جميع الحقوق محفوظة.' : 'Designed by luxury operators. All rights reserved.'}</span>
            {onOpenAdmin && (
              <button 
                onClick={onOpenAdmin}
                className="footer-admin-link"
                title={isAr ? 'الدخول لبوابة الإدارة والمكتب الخاص' : 'Enter Secure Admin Entrance'}
              >
                {isAr ? 'بوابة الإدارة' : 'Admin Entrance'}
              </button>
            )}
            <button 
              onClick={() => onNavigate('maintenance' as any)}
              className="footer-admin-link"
              title={isAr ? 'معاينة وضع الصيانة 503' : 'Preview 503 Maintenance Mode'}
            >
              503 Status
            </button>
            <button 
              onClick={() => onNavigate('not-found' as any)}
              className="footer-admin-link"
              title={isAr ? 'معاينة صفحة 404' : 'Preview 404 Not Found'}
            >
              404 Status
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .luxury-footer {
          background: var(--bg-surface);
          border-top: 1px solid var(--border-subtle);
          padding-top: 5rem;
          padding-bottom: 2.5rem;
          transition: background var(--transition-smooth), border-color var(--transition-smooth);
        }

        .footer-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 3.5rem;
          margin-bottom: 4rem;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-heading);
          font-size: 1.1875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 1.25rem;
          cursor: pointer;
        }

        .logo-gold {
          color: var(--gold-primary);
        }

        .logo-white {
          color: var(--text-primary);
          transition: color var(--transition-fast);
        }

        .footer-brand-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 360px;
          margin-bottom: 1.75rem;
        }

        .footer-socials {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .social-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-full);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .social-icon-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          background: var(--bg-card-hover);
          transform: translateY(-2px);
        }

        .footer-col-title {
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          margin-bottom: 1.5rem;
        }

        .footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .footer-link-btn {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-align: left;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        [dir="rtl"] .footer-link-btn,
        .luxury-footer[dir="rtl"] .footer-link-btn {
          text-align: right;
        }

        .footer-link-btn:hover {
          color: var(--gold-primary);
        }

        .inquiries-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .inquiry-address {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .inquiry-phone {
          font-size: 1.0625rem;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
          transition: color var(--transition-fast);
        }

        .inquiry-phone:hover {
          color: var(--gold-primary);
        }

        .inquiry-email {
          font-size: 0.875rem;
          color: var(--text-secondary);
          display: block;
          transition: color var(--transition-fast);
        }

        .inquiry-email:hover {
          color: var(--gold-primary);
        }

        .footer-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 2rem;
          border-top: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-size: 0.8125rem;
        }

        .footer-credits {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .footer-admin-link {
          color: var(--text-muted);
          font-size: 0.8125rem;
          text-decoration: underline;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .footer-admin-link:hover {
          color: var(--gold-primary);
        }

        @media (max-width: 992px) {
          .footer-main-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 2.5rem;
          }
        }

        @media (max-width: 600px) {
          .footer-main-grid {
            grid-template-columns: 1fr;
          }
          .footer-bottom-bar {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
};
