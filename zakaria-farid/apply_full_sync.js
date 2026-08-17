const fs = require('fs');
const path = require('path');

const NEW_UI = path.resolve('C:/Users/lyr1csan/Documents/project/new ui/src');
const NEXT_APP = path.resolve('C:/Users/lyr1csan/Documents/project/Real-Estate-Platform/zakaria-farid/src');

function readFile(relPath) {
  return fs.readFileSync(path.join(NEW_UI, relPath), 'utf8');
}

function writeFile(relPath, content) {
  const target = path.join(NEXT_APP, relPath);
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  console.log(`Updated ${relPath} (${fs.statSync(target).size} bytes)`);
}

// -------------------------------------------------------------
// 1. NAVBAR.TSX
// -------------------------------------------------------------
let navbarCode = readFile('components/Navbar.tsx');
navbarCode = `'use client';
import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';

interface NavbarProps {
  currentView?: 'home' | 'properties' | 'detail' | 'about' | 'contact' | 'map' | 'admin' | 'maintenance' | 'not-found';
  locale?: string;
  onNavigate?: (view: string, propertyId?: string) => void;
  onOpenInquiry?: (type?: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onOpenAdmin?: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView: propCurrentView,
  locale = 'en',
  onNavigate: propOnNavigate,
  onOpenInquiry = () => {},
  isDarkMode = true,
  onToggleTheme = () => {},
  isLoading = false
}) => {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth > 992 : true);

  // Determine current view from pathname if not explicitly passed
  let currentView = propCurrentView;
  if (!currentView) {
    if (pathname.includes('/properties/') && pathname.split('/properties/')[1]?.length > 0) {
      currentView = 'detail';
    } else if (pathname.includes('/properties')) {
      currentView = 'properties';
    } else if (pathname.includes('/map')) {
      currentView = 'map';
    } else if (pathname.includes('/about')) {
      currentView = 'about';
    } else if (pathname.includes('/contact')) {
      currentView = 'contact';
    } else if (pathname.includes('/admin')) {
      currentView = 'admin';
    } else if (pathname.includes('/maintenance')) {
      currentView = 'maintenance';
    } else {
      currentView = 'home';
    }
  }

  const onNavigate = (view: string) => {
    if (propOnNavigate) {
      propOnNavigate(view);
    } else {
      if (view === 'home') router.push('/' + locale);
      else router.push('/' + locale + '/' + view);
    }
    setMobileMenuOpen(false);
  };

  const handleToggleLang = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    const parts = pathname.split('/');
    if (parts[1] === 'en' || parts[1] === 'ar') {
      parts[1] = nextLocale;
      router.push(parts.join('/') || '/' + nextLocale);
    } else {
      router.push('/' + nextLocale);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 992);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleScroll();
    handleResize();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const navLinks: { id: 'home' | 'properties' | 'map' | 'about' | 'contact'; label: string }[] = [
    { id: 'home', label: locale === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'properties', label: locale === 'ar' ? 'العقارات' : 'Properties' },
    { id: 'map', label: locale === 'ar' ? 'الخريطة' : 'Map' },
    { id: 'about', label: locale === 'ar' ? 'عن الشركة' : 'About' },
    { id: 'contact', label: locale === 'ar' ? 'اتصل بنا' : 'Contact' }
  ];

  const isBlendedMode = currentView === 'home' && !isScrolled;
  const isMapMode = currentView === 'map' && !isLoading;

  return (
    <header className="navbar-wrapper">
      <div className="nav-capsule-container">
        <motion.div 
          className={\`nav-glass-capsule \${isBlendedMode ? 'hero-blended' : 'separated-glass'} \${isMapMode ? 'map-glass-capsule' : ''}\`}
          animate={{
            x: isMapMode && isDesktop ? -200 : 0,
            maxWidth: isMapMode && isDesktop ? 1040 : 1280,
          }}
          transition={{
            type: 'spring',
            stiffness: 160,
            damping: 24,
            mass: 0.8
          }}
        >
          {/* Brand Logo */}
          <div 
            className="brand-logo" 
            onClick={() => onNavigate('home')}
          >
            <span className="logo-gold">ZAKARIA</span>
            <span className="logo-white">FARID</span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            {navLinks.map((link) => {
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={\`nav-link \${isActive ? 'active' : ''}\`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="nav-indicator"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="nav-controls">
            {/* Language Switcher */}
            <button 
              className={\`lang-btn \${isBlendedMode ? 'blended-pill' : ''}\`}
              onClick={handleToggleLang}
              title="Switch Language"
            >
              <span className={locale.toUpperCase() === 'EN' ? 'active-lang' : ''}>EN</span>
              <span className="lang-divider">|</span>
              <span className={locale.toUpperCase() === 'AR' ? 'active-lang' : ''}>AR</span>
            </button>

            {/* Theme Toggle */}
            <button 
              className={\`theme-btn \${isBlendedMode ? 'blended-pill' : ''}\`}
              onClick={onToggleTheme}
              title={isDarkMode ? 'Dark Mode Active' : 'Switch Mode'}
            >
              {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Primary Inquire CTA */}
            <button 
              className="btn-gold nav-cta"
              onClick={() => onOpenInquiry('General Acquisition Inquiry')}
            >
              {locale === 'ar' ? 'استفسر الآن' : 'Inquire Now'}
            </button>

            {/* Mobile Hamburger */}
            <button 
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </motion.div>

        {/* Mobile Drawer (Glass Pill Style) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="mobile-drawer-glass"
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mobile-links">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => onNavigate(link.id)}
                    className={\`mobile-nav-link \${currentView === link.id ? 'active' : ''}\`}
                  >
                    {link.label}
                  </button>
                ))}
                <div className="mobile-actions">
                  <button 
                    className="btn-gold mobile-cta-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenInquiry('General Acquisition Inquiry');
                    }}
                  >
                    {locale === 'ar' ? 'استفسر الآن' : 'Inquire Now'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
` + navbarCode.substring(navbarCode.indexOf('<style>'));

writeFile('components/Navbar.tsx', navbarCode);

// -------------------------------------------------------------
// 2. FOOTER.TSX
// -------------------------------------------------------------
let footerCode = readFile('components/Footer.tsx');
footerCode = `'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

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
` + footerCode.substring(footerCode.indexOf('  return ('));

writeFile('components/Footer.tsx', footerCode);

// -------------------------------------------------------------
// 3. HOMEVIEW.TSX
// -------------------------------------------------------------
let homeCode = readFile('views/HomeView.tsx');
homeCode = `'use client';
import React from 'react';
import { QuickSearchBar } from '@/components/QuickSearchBar';
import { StatsSection } from '@/components/home/StatsSection';
import { PropertyCard } from '@/components/property/PropertyCard';
import { MapSection } from '@/components/map/MapSection';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { PROPERTIES } from '@/data/properties';
import { Property } from '@/types';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface HomeViewProps {
  properties?: Property[];
  locale?: string;
  onSelectProperty?: (id: string) => void;
  onNavigateToCatalog?: (filters?: { location?: string; propertyType?: string; priceTier?: string }) => void;
  onOpenMapModal?: () => void;
  onOpenListEstate?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  properties: propProperties,
  locale = 'en',
  onSelectProperty: propOnSelectProperty,
  onNavigateToCatalog: propOnNavigateToCatalog,
  onOpenMapModal: propOnOpenMapModal,
  onOpenListEstate: propOnOpenListEstate
}) => {
  const router = useRouter();

  const onSelectProperty = propOnSelectProperty || ((id: string) => router.push('/' + locale + '/properties/' + id));
  const onNavigateToCatalog = propOnNavigateToCatalog || ((filters?: { location?: string; propertyType?: string; priceTier?: string }) => {
    let url = '/' + locale + '/properties';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.location) params.set('location', filters.location);
      if (filters.propertyType) params.set('type', filters.propertyType);
      if (filters.priceTier) params.set('price', filters.priceTier);
      const qs = params.toString();
      if (qs) url += '?' + qs;
    }
    router.push(url);
  });
  const onOpenMapModal = propOnOpenMapModal || (() => router.push('/' + locale + '/map'));
  const onOpenListEstate = propOnOpenListEstate || (() => router.push('/' + locale + '/contact'));

  const allProps = (propProperties && propProperties.length > 0) ? propProperties : PROPERTIES;
  const featuredProperties = allProps.filter((p) => p.featured).slice(0, 6);
` + homeCode.substring(homeCode.indexOf('  // Destination filter state for Featured Masterpieces'));

writeFile('components/home/HomeView.tsx', homeCode);

// -------------------------------------------------------------
// 4. CATALOGVIEW.TSX
// -------------------------------------------------------------
let catalogCode = readFile('views/CatalogView.tsx');
// fix type imports and component imports
catalogCode = catalogCode.replace(/from '\.\.\/types'/g, "from '@/types'");
catalogCode = catalogCode.replace(/from '\.\.\/data\/properties'/g, "from '@/data/properties'");
catalogCode = catalogCode.replace(/from '\.\.\/components\/PropertyCard'/g, "from '@/components/property/PropertyCard'");
catalogCode = catalogCode.replace(/from '\.\.\/components\/MarketChart'/g, "from '@/components/MarketChart'");
catalogCode = catalogCode.replace(/from '\.\.\/components\/CompareDrawer'/g, "from '@/components/property/CompareDrawer'");

catalogCode = `'use client';
import { useRouter } from 'next/navigation';
` + catalogCode;

// Update CatalogViewProps interface
const oldCatalogProps = `interface CatalogViewProps {
  initialFilters?: {
    location?: string;
    propertyType?: string;
    priceTier?: string;
  };
  onSelectProperty: (id: string) => void;
  onOpenInquiry?: (title?: string) => void;
}`;

const newCatalogProps = `interface CatalogViewProps {
  properties?: Property[];
  locale?: string;
  initialFilters?: {
    location?: string;
    propertyType?: string;
    priceTier?: string;
    minPrice?: string;
    maxPrice?: string;
  };
  onSelectProperty?: (id: string) => void;
  onOpenInquiry?: (title?: string) => void;
}`;

catalogCode = catalogCode.replace(oldCatalogProps, newCatalogProps);

// Update CatalogView component start
const oldCatalogComp = `export const CatalogView: React.FC<CatalogViewProps> = ({
  initialFilters,
  onSelectProperty,
  onOpenInquiry
}) => {`;

const newCatalogComp = `export const CatalogView: React.FC<CatalogViewProps> = ({
  properties: propProperties,
  locale = 'en',
  initialFilters,
  onSelectProperty: propOnSelectProperty,
  onOpenInquiry: propOnOpenInquiry
}) => {
  const router = useRouter();
  const onSelectProperty = propOnSelectProperty || ((id: string) => router.push('/' + locale + '/properties/' + id));
  const onOpenInquiry = propOnOpenInquiry || ((title?: string) => {
    window.location.href = 'https://wa.me/201009998888?text=' + encodeURIComponent('Hello, I am inquiring about ' + (title || 'sovereign acquisitions'));
  });
  const allPropertiesList: Property[] = (propProperties && propProperties.length > 0) ? (propProperties as Property[]) : PROPERTIES;`;

catalogCode = catalogCode.replace(oldCatalogComp, newCatalogComp);
catalogCode = catalogCode.replace(/PROPERTIES/g, 'allPropertiesList');
// fix back the import
catalogCode = catalogCode.replace("import { allPropertiesList } from '@/data/properties';", "import { PROPERTIES } from '@/data/properties';");

// Fix any implicit types
catalogCode = catalogCode.replace(/specCategories\.map\(\(cat, idx\) =>/g, "specCategories.map((cat: any, idx: number) =>");
catalogCode = catalogCode.replace(/filteredProperties\.map\(\(property, idx\) =>/g, "filteredProperties.map((property: any, idx: number) =>");
catalogCode = catalogCode.replace(/paginatedProperties\.map\(\(property, idx\) =>/g, "paginatedProperties.map((property: any, idx: number) =>");
catalogCode = catalogCode.replace(/DESTINATION_PILLS\.map\(\(tab\) =>/g, "DESTINATION_PILLS.map((tab: any) =>");
catalogCode = catalogCode.replace(/SORT_OPTIONS\.map\(\(opt\) =>/g, "SORT_OPTIONS.map((opt: any) =>");
catalogCode = catalogCode.replace(/LOCATION_FILTER_OPTIONS\.map\(\(opt\) =>/g, "LOCATION_FILTER_OPTIONS.map((opt: any) =>");
catalogCode = catalogCode.replace(/TYPE_FILTER_OPTIONS\.map\(\(opt\) =>/g, "TYPE_FILTER_OPTIONS.map((opt: any) =>");
catalogCode = catalogCode.replace(/PRICE_FILTER_OPTIONS\.map\(\(opt\) =>/g, "PRICE_FILTER_OPTIONS.map((opt: any) =>");
catalogCode = catalogCode.replace(/BEDROOM_FILTER_OPTIONS\.map\(\(opt\) =>/g, "BEDROOM_FILTER_OPTIONS.map((opt: any) =>");

writeFile('components/catalog/CatalogView.tsx', catalogCode);
// Also export as components/property/CatalogView.tsx for compatibility
writeFile('components/property/CatalogView.tsx', `export { CatalogView } from '@/components/catalog/CatalogView';`);

// -------------------------------------------------------------
// 5. MAPVIEW.TSX
// -------------------------------------------------------------
let mapCode = readFile('views/MapView.tsx');
mapCode = mapCode.replace(/from '\.\.\/types'/g, "from '@/types'");
mapCode = mapCode.replace(/from '\.\.\/data\/properties'/g, "from '@/data/properties'");
mapCode = mapCode.replace(/from '\.\.\/utils\/mapCache'/g, "from '@/lib/mapCache'");

mapCode = `'use client';
import { useRouter } from 'next/navigation';
` + mapCode;

const oldMapProps = `interface MapViewProps {
  onSelectProperty: (id: string) => void;
  onOpenInquiry?: (type?: string, propertyName?: string) => void;
}`;

const newMapProps = `interface MapViewProps {
  properties?: Property[];
  locale?: string;
  onSelectProperty?: (id: string) => void;
  onOpenInquiry?: (type?: string, propertyName?: string) => void;
}`;

mapCode = mapCode.replace(oldMapProps, newMapProps);

const oldMapComp = `export const MapView: React.FC<MapViewProps> = ({ onSelectProperty, onOpenInquiry }) => {`;
const newMapComp = `export const MapView: React.FC<MapViewProps> = ({
  properties: propProperties,
  locale = 'en',
  onSelectProperty: propOnSelectProperty,
  onOpenInquiry: propOnOpenInquiry
}) => {
  const router = useRouter();
  const onSelectProperty = propOnSelectProperty || ((id: string) => router.push('/' + locale + '/properties/' + id));
  const onOpenInquiry = propOnOpenInquiry || ((type?: string, propertyName?: string) => {
    window.location.href = 'https://wa.me/201009998888?text=' + encodeURIComponent('Hello, I am inquiring about ' + (propertyName || 'cartography acquisition'));
  });
  const allPropertiesList: Property[] = (propProperties && propProperties.length > 0) ? (propProperties as Property[]) : PROPERTIES;`;

mapCode = mapCode.replace(oldMapComp, newMapComp);
mapCode = mapCode.replace(/PROPERTIES/g, 'allPropertiesList');
mapCode = mapCode.replace("import { allPropertiesList } from '@/data/properties';", "import { PROPERTIES } from '@/data/properties';");

writeFile('components/map/MapView.tsx', mapCode);

// -------------------------------------------------------------
// 6. ABOUTVIEW.TSX
// -------------------------------------------------------------
let aboutCode = readFile('views/AboutView.tsx');
aboutCode = `'use client';
import { useRouter } from 'next/navigation';
` + aboutCode;

const oldAboutProps = `interface AboutViewProps {
  onOpenInquiry: (type: string) => void;
  onNavigateToCatalog: () => void;
}`;

const newAboutProps = `interface AboutViewProps {
  locale?: string;
  onOpenInquiry?: (type: string) => void;
  onNavigateToCatalog?: () => void;
}`;

aboutCode = aboutCode.replace(oldAboutProps, newAboutProps);

const oldAboutComp = `export const AboutView: React.FC<AboutViewProps> = ({ onOpenInquiry, onNavigateToCatalog }) => {`;
const newAboutComp = `export const AboutView: React.FC<AboutViewProps> = ({
  locale = 'en',
  onOpenInquiry: propOnOpenInquiry,
  onNavigateToCatalog: propOnNavigateToCatalog
}) => {
  const router = useRouter();
  const onNavigateToCatalog = propOnNavigateToCatalog || (() => router.push('/' + locale + '/properties'));
  const onOpenInquiry = propOnOpenInquiry || ((type: string) => {
    window.location.href = 'https://wa.me/201009998888?text=' + encodeURIComponent('Hello, I am inquiring about ' + type);
  });`;

aboutCode = aboutCode.replace(oldAboutComp, newAboutComp);

writeFile('components/about/AboutView.tsx', aboutCode);

// -------------------------------------------------------------
// 7. CONTACTVIEW.TSX
// -------------------------------------------------------------
let contactCode = readFile('views/ContactView.tsx');
contactCode = contactCode.replace(/from '\.\.\/utils\/mapCache'/g, "from '@/lib/mapCache'");
contactCode = `'use client';
` + contactCode;

contactCode = contactCode.replace(
  'export const ContactView: React.FC = () => {',
  'export const ContactView: React.FC<{ locale?: string }> = ({ locale = \'en\' }) => {'
);

writeFile('components/contact/ContactView.tsx', contactCode);

// -------------------------------------------------------------
// 8. NOTFOUNDVIEW.TSX
// -------------------------------------------------------------
let nfCode = readFile('views/NotFoundView.tsx');
nfCode = `'use client';
import { useRouter } from 'next/navigation';
` + nfCode;

const oldNfProps = `interface NotFoundViewProps {
  onBackToHome: () => void;
  onContactSupport?: () => void;
}`;

const newNfProps = `interface NotFoundViewProps {
  locale?: string;
  onBackToHome?: () => void;
  onContactSupport?: () => void;
}`;

nfCode = nfCode.replace(oldNfProps, newNfProps);

const oldNfComp = `export const NotFoundView: React.FC<NotFoundViewProps> = ({ 
  onBackToHome, 
  onContactSupport 
}) => {`;

const newNfComp = `export const NotFoundView: React.FC<NotFoundViewProps> = ({ 
  locale = 'en',
  onBackToHome: propOnBack, 
  onContactSupport: propOnContact 
}) => {
  const router = useRouter();
  const onBackToHome = propOnBack || (() => router.push('/' + locale));
  const onContactSupport = propOnContact || (() => router.push('/' + locale + '/contact'));`;

nfCode = nfCode.replace(oldNfComp, newNfComp);

writeFile('components/NotFoundView.tsx', nfCode);

// -------------------------------------------------------------
// 9. MAINTENANCEVIEW.TSX
// -------------------------------------------------------------
let maintCode = readFile('views/MaintenanceView.tsx');
maintCode = `'use client';
import { useRouter } from 'next/navigation';
` + maintCode;

const oldMaintProps = `interface MaintenanceViewProps {
  onBackToHome: () => void;
}`;

const newMaintProps = `interface MaintenanceViewProps {
  locale?: string;
  onBackToHome?: () => void;
}`;

maintCode = maintCode.replace(oldMaintProps, newMaintProps);

const oldMaintComp = `export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onBackToHome }) => {`;
const newMaintComp = `export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ locale = 'en', onBackToHome: propOnBack }) => {
  const router = useRouter();
  const onBackToHome = propOnBack || (() => router.push('/' + locale));`;

maintCode = maintCode.replace(oldMaintComp, newMaintComp);

writeFile('components/MaintenanceView.tsx', maintCode);

console.log('All full sync files processed!');
