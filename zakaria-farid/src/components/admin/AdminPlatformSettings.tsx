'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Sliders, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Eye, 
  EyeOff, 
  BarChart3, 
  ShieldCheck, 
  RefreshCw,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  FileText,
  BookOpen,
  Quote,
  Award,
  Layers,
  Compass,
  Home,
  LayoutTemplate,
  CheckSquare
} from 'lucide-react';
import { 
  MarketDistrictConfig, 
  PlatformDisplaySettings, 
  PlatformContactSettings,
  PlatformHomeSettings,
  PlatformAboutSettings,
  getStoredPlatformSettings, 
  saveStoredPlatformSettings, 
  DEFAULT_PLATFORM_SETTINGS, 
  DEFAULT_MARKET_DISTRICTS,
  DEFAULT_HOME_SETTINGS,
  DEFAULT_ABOUT_SETTINGS,
  DEFAULT_CONTACT_SETTINGS
} from '@/lib/services/marketIntelligence';
import { formatDisplayPhoneNumber } from '@/lib/utils/formatPhone';

interface AdminPlatformSettingsProps {
  adminLocale: string;
}

type TabKey = 'radar' | 'home' | 'about' | 'contact';

export default function AdminPlatformSettings({ adminLocale }: AdminPlatformSettingsProps) {
  const isAr = adminLocale === 'ar';
  const [activeTab, setActiveTab] = useState<TabKey>('radar');
  const [settings, setSettings] = useState<PlatformDisplaySettings>(DEFAULT_PLATFORM_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [newDistrict, setNewDistrict] = useState<Partial<MarketDistrictConfig>>({
    district: '',
    districtAr: '',
    category: 'Prime District',
    categoryAr: 'منطقة راقية',
    pricePerSqm: 40000,
    medianTotal: '30.0M EGP',
    medianTotalAr: '٣٠.٠ مليون ج.م',
    fiveYearGain: '+60.0%',
    insight: 'Strong growth potential and infrastructure development.',
    insightAr: 'تطور عمراني مستمر وموقع استراتيجي جاذب للاستثمار.',
    isEnabled: true
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    setSettings(getStoredPlatformSettings());
  }, []);

  const handleSave = () => {
    saveStoredPlatformSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm(isAr ? 'هل أنت متأكد من استعادة كافة الإعدادات والنصوص الافتراضية؟' : 'Are you sure you want to restore all factory default platform settings and editorials?')) {
      setSettings(DEFAULT_PLATFORM_SETTINGS);
      saveStoredPlatformSettings(DEFAULT_PLATFORM_SETTINGS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  // District mutation helpers
  const handleToggleDistrict = (id: string) => {
    setSettings(prev => ({
      ...prev,
      marketDistricts: prev.marketDistricts.map(d => 
        d.id === id ? { ...d, isEnabled: !d.isEnabled } : d
      )
    }));
  };

  const handleDistrictChange = (id: string, field: keyof MarketDistrictConfig, value: any) => {
    setSettings(prev => ({
      ...prev,
      marketDistricts: prev.marketDistricts.map(d => 
        d.id === id ? { ...d, [field]: value } : d
      )
    }));
  };

  const handleDeleteDistrict = (id: string) => {
    setSettings(prev => ({
      ...prev,
      marketDistricts: prev.marketDistricts.filter(d => d.id !== id)
    }));
  };

  const handleAddDistrict = () => {
    if (!newDistrict.district || !newDistrict.districtAr) return;
    const newId = (newDistrict.district || 'district').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created: MarketDistrictConfig = {
      id: newId,
      rank: String(settings.marketDistricts.length + 1).padStart(2, '0'),
      district: newDistrict.district || '',
      districtAr: newDistrict.districtAr || '',
      subDistrict: newDistrict.subDistrict || '',
      subDistrictAr: newDistrict.subDistrictAr || '',
      category: newDistrict.category || 'Prime Sector',
      categoryAr: newDistrict.categoryAr || 'قطاع متميز',
      pricePerSqm: Number(newDistrict.pricePerSqm) || 30000,
      medianTotal: newDistrict.medianTotal || '25.0M EGP',
      medianTotalAr: newDistrict.medianTotalAr || '٢٥.٠ مليون ج.م',
      fiveYearGain: newDistrict.fiveYearGain || '+50.0%',
      historical5Yr: [20, 24, 28, 33, 39],
      insight: newDistrict.insight || '',
      insightAr: newDistrict.insightAr || '',
      isEnabled: true
    };
    setSettings(prev => ({
      ...prev,
      marketDistricts: [...prev.marketDistricts, created]
    }));
    setNewDistrict({
      district: '',
      districtAr: '',
      category: 'Prime District',
      categoryAr: 'منطقة راقية',
      pricePerSqm: 40000,
      medianTotal: '30.0M EGP',
      medianTotalAr: '٣٠.٠ مليون ج.م',
      fiveYearGain: '+60.0%',
      insight: '',
      insightAr: '',
      isEnabled: true
    });
    setIsAddingNew(false);
  };

  // Helper for Home editorial changes
  const updateHome = (field: keyof PlatformHomeSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      home: {
        ...(prev.home || DEFAULT_HOME_SETTINGS),
        [field]: value
      }
    }));
  };

  // Helper for About editorial changes
  const updateAbout = (field: keyof PlatformAboutSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      about: {
        ...(prev.about || DEFAULT_ABOUT_SETTINGS),
        [field]: value
      }
    }));
  };

  // Helper for Contact changes
  const updateContact = (field: keyof PlatformContactSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      contact: {
        ...(prev.contact || DEFAULT_CONTACT_SETTINGS),
        [field]: value
      }
    }));
  };

  const home = settings.home || DEFAULT_HOME_SETTINGS;
  const about = settings.about || DEFAULT_ABOUT_SETTINGS;
  const contact = settings.contact || DEFAULT_CONTACT_SETTINGS;

  return (
    <div className="admin-settings-root" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Header Card */}
      <div className="settings-header-card">
        <div className="settings-header-left">
          <div className="header-badge-row">
            <span className="gold-pill">{isAr ? 'لوحة التحكم والتحرير' : 'Master Control & CMS'}</span>
            <span className="live-pill">
              <span className="live-dot" />
              {isAr ? 'متصل ومباشر' : 'Live Sync'}
            </span>
          </div>
          <h1 className="settings-main-title">
            {isAr ? 'إعدادات المنصة ومحرر المحتوى العام' : 'Platform Settings & Site Editorial CMS'}
          </h1>
          <p className="settings-main-desc">
            {isAr
              ? 'تحكم في مؤشرات السوق، نصوص وصفحات الموقع الرئيسية ومن نحن، مع إمكانية تفعيل أو إخفاء أي قسم بالكامل.'
              : 'Configure market district benchmarks, customize editorial copy for Home & About Us pages, and toggle individual section visibility.'}
          </p>
        </div>

        <div className="settings-actions-row">
          <button 
            type="button" 
            onClick={handleResetDefaults}
            className="btn-outline-gold"
          >
            <RefreshCw size={15} />
            <span>{isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleSave}
            className="btn-solid-gold"
          >
            {savedSuccess ? <Check size={16} /> : <Save size={16} />}
            <span>{savedSuccess ? (isAr ? 'تم الحفظ بنجاح!' : 'Saved Successfully!') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Scroller */}
      <div className="settings-tabs-scroller">
        <div className="settings-tabs-track">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`settings-tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>{isAr ? 'مؤشر الأسعار والمناطق' : 'Market Valuation Radar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`settings-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          >
            <Home size={16} />
            <span>{isAr ? 'محرر الصفحة الرئيسية' : 'Home Page Editorial'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`settings-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          >
            <BookOpen size={16} />
            <span>{isAr ? 'محرر صفحة من نحن' : 'About Us Editorial & Toggles'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`settings-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
          >
            <Phone size={16} />
            <span>{isAr ? 'بيانات التواصل والمقر' : 'Public Advisory Desk'}</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: VALUATION RADAR & CATALOG FLAGS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'radar' && (
        <div className="settings-tab-pane">
          {/* Feature Flags Card */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><Sliders size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? 'خيارات العرض وفلاتر الكتالوج' : 'Catalog Display & Feature Flags'}</h2>
                <p className="card-sub">{isAr ? 'التحكم في ظهور ودجات التقييم وتنبيهات كبار العملاء' : 'Control visibility of Valuation Radar and VIP Alerts'}</p>
              </div>
            </div>

            <div className="toggles-grid-2col">
              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={settings.showMarketRadar}
                  onChange={(e) => setSettings(prev => ({ ...prev, showMarketRadar: e.target.checked }))}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? 'عرض ودجت مؤشر الأسعار' : 'Show Valuation Radar Widget'}</span>
                  <span className="toggle-desc">{isAr ? 'إظهار مؤشر متوسط سعر المتر في شريط الكتالوج الجانبي' : 'Display EGP/m² benchmarks widget in the properties sidebar'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={settings.showVIPAlerts}
                  onChange={(e) => setSettings(prev => ({ ...prev, showVIPAlerts: e.target.checked }))}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? 'عرض صندوق تنبيهات الـ VIP' : 'Show VIP Property Alerts Card'}</span>
                  <span className="toggle-desc">{isAr ? 'تفعيل بطاقة الاشتراك في الفرص النادرة بالشريط الجانبي' : 'Enable email alerts subscription box in the properties sidebar'}</span>
                </div>
              </label>
            </div>
          </div>

          {/* District Benchmarks List Card */}
          <div className="settings-card">
            <div className="card-section-head-between">
              <div className="card-section-head-left">
                <div className="card-icon-wrap"><BarChart3 size={18} /></div>
                <div>
                  <h2 className="card-title">{isAr ? 'مناطق الرادار العقاري ومتوسط سعر المتر' : 'Valuation Radar Districts & EGP/m² Benchmarks'}</h2>
                  <p className="card-sub">{isAr ? 'تحديد أسعار المتر ومعدلات النمو لكل منطقة على حدة' : 'Configure active districts, benchmark prices per square meter, and growth metrics.'}</p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsAddingNew(!isAddingNew)} 
                className="btn-add-district"
              >
                <Plus size={15} />
                <span>{isAr ? 'إضافة منطقة جديدة' : 'Add New District'}</span>
              </button>
            </div>

            {/* Add New District Drawer */}
            {isAddingNew && (
              <div className="new-district-form">
                <h3 className="new-form-title">{isAr ? 'بيانات المنطقة الجديدة' : 'New District Configuration'}</h3>
                <div className="form-fields-grid">
                  <div className="field-group">
                    <label>{isAr ? 'اسم المنطقة (الإنجليزية)' : 'District Name (English)'}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. New Administrative Capital" 
                      value={newDistrict.district || ''} 
                      onChange={(e) => setNewDistrict({ ...newDistrict, district: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label>{isAr ? 'اسم المنطقة (العربية)' : 'District Name (Arabic)'}</label>
                    <input 
                      type="text" 
                      placeholder="مثال: العاصمة الإدارية الجديدة" 
                      value={newDistrict.districtAr || ''} 
                      onChange={(e) => setNewDistrict({ ...newDistrict, districtAr: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label>{isAr ? 'سعر المتر (ج.م)' : 'Price / m² (EGP)'}</label>
                    <input 
                      type="number" 
                      value={newDistrict.pricePerSqm || 40000} 
                      onChange={(e) => setNewDistrict({ ...newDistrict, pricePerSqm: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field-group">
                    <label>{isAr ? 'النمو خلال ٥ سنوات' : '5-Year Compound Gain'}</label>
                    <input 
                      type="text" 
                      value={newDistrict.fiveYearGain || '+60.0%'} 
                      onChange={(e) => setNewDistrict({ ...newDistrict, fiveYearGain: e.target.value })}
                    />
                  </div>
                </div>

                <div className="new-form-actions">
                  <button type="button" onClick={() => setIsAddingNew(false)} className="btn-cancel">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="button" onClick={handleAddDistrict} className="btn-confirm">
                    {isAr ? 'تأكيد وإضافة' : 'Add District'}
                  </button>
                </div>
              </div>
            )}

            {/* Districts List */}
            <div className="districts-list">
              {settings.marketDistricts.map((district) => (
                <div key={district.id} className={`district-row-card ${!district.isEnabled ? 'disabled' : ''}`}>
                  <div className="district-row-top">
                    <div className="district-tag-group">
                      <span className="district-rank">#{district.rank}</span>
                      <span className="district-name-main">{isAr ? district.districtAr : district.district}</span>
                      <span className="district-name-alt">({isAr ? district.district : district.districtAr})</span>
                    </div>

                    <div className="district-quick-actions">
                      <button 
                        type="button" 
                        onClick={() => handleToggleDistrict(district.id)}
                        className={`btn-icon-toggle ${district.isEnabled ? 'active' : ''}`}
                        title={district.isEnabled ? 'Disable' : 'Enable'}
                      >
                        {district.isEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>

                      <button 
                        type="button" 
                        onClick={() => handleDeleteDistrict(district.id)}
                        className="btn-icon-delete"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="district-inputs-grid">
                    <div className="field-group-sm">
                      <label>{isAr ? 'سعر المتر (ج.م)' : 'Price / m² (EGP)'}</label>
                      <input 
                        type="number" 
                        value={district.pricePerSqm} 
                        onChange={(e) => handleDistrictChange(district.id, 'pricePerSqm', Number(e.target.value))}
                      />
                    </div>

                    <div className="field-group-sm">
                      <label>{isAr ? 'النمو (٥ سنوات)' : '5Y Growth'}</label>
                      <input 
                        type="text" 
                        value={district.fiveYearGain} 
                        onChange={(e) => handleDistrictChange(district.id, 'fiveYearGain', e.target.value)}
                      />
                    </div>

                    <div className="field-group-sm">
                      <label>{isAr ? 'متوسط الصفقات' : 'Median Total (EN)'}</label>
                      <input 
                        type="text" 
                        value={district.medianTotal} 
                        onChange={(e) => handleDistrictChange(district.id, 'medianTotal', e.target.value)}
                      />
                    </div>

                    <div className="field-group-sm">
                      <label>{isAr ? 'متوسط الصفقات (عربي)' : 'Median Total (AR)'}</label>
                      <input 
                        type="text" 
                        value={district.medianTotalAr} 
                        onChange={(e) => handleDistrictChange(district.id, 'medianTotalAr', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: HOME PAGE EDITORIAL & SECTION TOGGLES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'home' && (
        <div className="settings-tab-pane">
          {/* Section Visibility Toggles for Home */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><LayoutTemplate size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? 'أقسام الصفحة الرئيسية وإمكانية الإخفاء' : 'Home Page Section Visibility Toggles'}</h2>
                <p className="card-sub">{isAr ? 'تفعيل أو إخفاء أي قسم في الصفحة الرئيسية بضغطة زر' : 'Toggle visibility for each individual block on the landing page.'}</p>
              </div>
            </div>

            <div className="toggles-grid-2col">
              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={home.showHero !== false}
                  onChange={(e) => updateHome('showHero', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '١. الهيرو الرئيسي وشريط البحث' : '1. Cinematic Hero & Quick Search'}</span>
                  <span className="toggle-desc">{isAr ? 'الخلفية السينمائية والعبارة الترحيبية وشريط البحث' : 'Full-bleed hero background, live typewriter headline, and search bar'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={home.showStatsRibbon !== false}
                  onChange={(e) => updateHome('showStatsRibbon', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٢. شريط الإحصائيات والأرقام' : '2. Authority & Metrology Stats Ribbon'}</span>
                  <span className="toggle-desc">{isAr ? 'الأرقام القياسية وحجم المحفظة أسفل الهيرو' : 'Asset volume, district counts, and transaction speed bar'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={home.showFeaturedGrid !== false}
                  onChange={(e) => updateHome('showFeaturedGrid', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٣. معرض الصروح المميزة' : '3. Featured Masterpieces Collection'}</span>
                  <span className="toggle-desc">{isAr ? 'شبكة العقارات المختارة مع فلاتر المناطق' : '6-card curated showcase grid with destination filter tabs'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={home.showMapExplorer !== false}
                  onChange={(e) => updateHome('showMapExplorer', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٤. الخريطة الجغرافية التفاعلية' : '4. Interactive Real Cartography Map'}</span>
                  <span className="toggle-desc">{isAr ? 'قسم الخريطة التفاعلية ونقاط العقارات' : 'Full-width map preview with cluster pins and spatial orientation'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={home.showSovereignAdvisory !== false}
                  onChange={(e) => updateHome('showSovereignAdvisory', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٥. ميثاق الاستشارات السيادية' : '5. Unified Sovereign Advisory Protocol'}</span>
                  <span className="toggle-desc">{isAr ? 'مزايا الفحص الهندسي والتدقيق القانوني وتجارب العملاء' : 'Forensic CAD auditing pillars, client provenance, and advisory standards'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={home.showSellerConsignment !== false}
                  onChange={(e) => updateHome('showSellerConsignment', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٦. بوابة تمثيل العقارات الخاصة' : '6. Private Consignment & Placement Portal'}</span>
                  <span className="toggle-desc">{isAr ? 'صندوق تسجيل وتمثيل القصور والعقارات الفاخرة' : 'Bespoke seller placement banner and confidential advisory CTA'}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Hero Editorial Copy */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><Sparkles size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? 'نصوص الهيرو الرئيسي والعبارة الترحيبية' : 'Hero Header & Subheader Editorial'}</h2>
                <p className="card-sub">{isAr ? 'تعديل العنوان المتحرك والوصف الترحيبي باللغتين' : 'Edit the animated typewriter headline and monograph paragraph in EN & AR.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              <div className="field-group full-width">
                <label>{isAr ? 'شارة الإحداثيات / المناطق (EN)' : 'Hero Coordinates / Location Tag (EN)'}</label>
                <input 
                  type="text" 
                  value={home.heroBadgeEn || ''} 
                  onChange={(e) => updateHome('heroBadgeEn', e.target.value)} 
                  placeholder="CAIRO • NORTH COAST • RED SEA • SHEIKH ZAYED"
                />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'شارة الإحداثيات / المناطق (عربي)' : 'Hero Coordinates / Location Tag (AR)'}</label>
                <input 
                  type="text" 
                  value={home.heroBadgeAr || ''} 
                  onChange={(e) => updateHome('heroBadgeAr', e.target.value)} 
                  placeholder="القاهرة • الساحل الشمالي • البحر الأحمر • الشيخ زايد"
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الأول (EN)' : 'Hero Title - Line 1 (EN)'}</label>
                <input 
                  type="text" 
                  value={home.heroTitle1En || ''} 
                  onChange={(e) => updateHome('heroTitle1En', e.target.value)} 
                  placeholder="Discover Egypt's Premier Residences &"
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الأول (عربي)' : 'Hero Title - Line 1 (AR)'}</label>
                <input 
                  type="text" 
                  value={home.heroTitle1Ar || ''} 
                  onChange={(e) => updateHome('heroTitle1Ar', e.target.value)} 
                  placeholder="استكشف أندر الصروح المعمارية و"
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الثاني / التمييز (EN)' : 'Hero Title - Line 2 Serif Accent (EN)'}</label>
                <input 
                  type="text" 
                  value={home.heroTitle2En || ''} 
                  onChange={(e) => updateHome('heroTitle2En', e.target.value)} 
                  placeholder="Luxury Living & Sovereign Estates"
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الثاني / التمييز (عربي)' : 'Hero Title - Line 2 Serif Accent (AR)'}</label>
                <input 
                  type="text" 
                  value={home.heroTitle2Ar || ''} 
                  onChange={(e) => updateHome('heroTitle2Ar', e.target.value)} 
                  placeholder="القصور الفاخرة في مصر"
                />
              </div>

              <div className="field-group full-width">
                <label>{isAr ? 'الوصف الفرعي للهيرو (EN)' : 'Hero Subtitle / Monograph Description (EN)'}</label>
                <textarea 
                  rows={3} 
                  value={home.heroSubtitleEn || ''} 
                  onChange={(e) => updateHome('heroSubtitleEn', e.target.value)} 
                  placeholder="Curating and representing architecturally significant residences..."
                />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'الوصف الفرعي للهيرو (عربي)' : 'Hero Subtitle / Monograph Description (AR)'}</label>
                <textarea 
                  rows={3} 
                  value={home.heroSubtitleAr || ''} 
                  onChange={(e) => updateHome('heroSubtitleAr', e.target.value)} 
                  placeholder="ننتقي ونمثل أندر العقارات والقصور الفاخرة..."
                />
              </div>
            </div>
          </div>

          {/* Featured & Seller Portal Editorial */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><FileText size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? 'نصوص الصروح وبوابة التمثيل العقاري' : 'Featured Showcase & Seller Portal Editorial'}</h2>
                <p className="card-sub">{isAr ? 'عناوين معرض العقارات وبطاقة بيع وتمثيل القصور' : 'Titles and descriptions for collection galleries and seller placement.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              <div className="field-group">
                <label>{isAr ? 'عنوان معرض الصروح (EN)' : 'Featured Collection Title (EN)'}</label>
                <input 
                  type="text" 
                  value={home.featuredTitle1En || ''} 
                  onChange={(e) => updateHome('featuredTitle1En', e.target.value)} 
                  placeholder="Featured Architectural Masterpieces"
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'عنوان معرض الصروح (عربي)' : 'Featured Collection Title (AR)'}</label>
                <input 
                  type="text" 
                  value={home.featuredTitle1Ar || ''} 
                  onChange={(e) => updateHome('featuredTitle1Ar', e.target.value)} 
                  placeholder="أحدث الصروح المعمارية والقصور الاستثنائية"
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'عنوان بوابة بيع العقار (EN)' : 'Seller Portal Title (EN)'}</label>
                <input 
                  type="text" 
                  value={home.sellerTitle1En || ''} 
                  onChange={(e) => updateHome('sellerTitle1En', e.target.value)} 
                  placeholder="Looking to List or Consign Your Generational Estate?"
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'عنوان بوابة بيع العقار (عربي)' : 'Seller Portal Title (AR)'}</label>
                <input 
                  type="text" 
                  value={home.sellerTitle1Ar || ''} 
                  onChange={(e) => updateHome('sellerTitle1Ar', e.target.value)} 
                  placeholder="هل ترغب في بيع أو تمثيل قصرك واستثمارك؟"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: ABOUT US EDITORIAL CMS & FULL SECTION TOGGLES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'about' && (
        <div className="settings-tab-pane">
          {/* Master Section Toggles for About Us */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><LayoutTemplate size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? 'أقسام صفحة من نحن وإمكانية تفعيلها أو إخفائها' : 'About Us Section Visibility Toggles'}</h2>
                <p className="card-sub">{isAr ? 'التحكم الشامل في إظهار أو إخفاء كل قسم بشكل منفصل في صفحة من نحن' : 'Show or hide every single section of the About Us page with dedicated switches.'}</p>
              </div>
            </div>

            <div className="toggles-grid-2col">
              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={about.showHero !== false}
                  onChange={(e) => updateAbout('showHero', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '١. الهيرو الرئيسي والبيان التأسيسي' : '1. Masthead Hero & Editorial Manifesto'}</span>
                  <span className="toggle-desc">{isAr ? 'صورة الهيرو والعنوان الباريسي والبيان المعماري' : 'Hero masthead, monumental title, coordinates, and manifesto'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={about.showMetrology !== false}
                  onChange={(e) => updateAbout('showMetrology', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٢. شريط أرقام وإحصائيات الهيبة' : '2. Integrated Metrology Ribbon (Stats I–IV)'}</span>
                  <span className="toggle-desc">{isAr ? 'الأرقام الرومانية الأربعة ومؤشرات الثقة وحجم الصفقات' : '4-metric authority strip with asset volume and retention'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={about.showParavent !== false}
                  onChange={(e) => updateAbout('showParavent', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٣. سردية العقد الأول (فصول بارافينت ٢٠١٦-٢٠٢٦)' : '3. Decade Monograph Folio (2016–2026)'}</span>
                  <span className="toggle-desc">{isAr ? 'الأكورديون التفاعلي ذو الأربعة فصول لتاريخ المكتب' : '4-chapter interactive unfolding accordion monograph'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={about.showCuration !== false}
                  onChange={(e) => updateAbout('showCuration', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٤. ميثاق الانتقاء وركائز الفحص الثلاثة' : '4. Curation Protocol & 3 Pillars'}</span>
                  <span className="toggle-desc">{isAr ? 'مختبر المعايير، الفحص الإنشائي والقانوني والمالي' : 'Lightbox inspection protocol and 3 forensic pillar cards'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={about.showFounder !== false}
                  onChange={(e) => updateAbout('showFounder', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٥. رسالة ورؤية المؤسس (م. فريد زكريا)' : '5. Founder’s Letter (Eng. Farid Zakaria)'}</span>
                  <span className="toggle-desc">{isAr ? 'المقولة الاقتباسية والاسم والختم الرسمي للاستشاري' : 'Bespoke quotation card, founder name, title, and seal'}</span>
                </div>
              </label>

              <label className="toggle-checkbox-card">
                <input 
                  type="checkbox"
                  checked={about.showPortal !== false}
                  onChange={(e) => updateAbout('showPortal', e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-title">{isAr ? '٦. بوابة الاستحواذ الخاص الختامية' : '6. Confidential Acquisitions Office CTA'}</span>
                  <span className="toggle-desc">{isAr ? 'بطاقة الاتصال المباشر وطلب استشارة شراء خاصة' : 'Private wealth consultation banner and directory link'}</span>
                </div>
              </label>
            </div>
          </div>

          {/* 1. Hero Content */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><Sparkles size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? '١. نصوص الهيرو والبيان التأسيسي' : '1. Hero & Manifesto Content'}</h2>
                <p className="card-sub">{isAr ? 'العبارات والعناوين الترحيبية وأزرار التوجيه' : 'Hero headline, subtitle, manifesto narrative, and action button labels.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              <div className="field-group">
                <label>{isAr ? 'شارة الهيرو التأسيسية (EN)' : 'Hero Coordinates / Charter Tag (EN)'}</label>
                <input 
                  type="text" 
                  value={about.badgeEn || ''} 
                  onChange={(e) => updateAbout('badgeEn', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'شارة الهيرو التأسيسية (عربي)' : 'Hero Coordinates / Charter Tag (AR)'}</label>
                <input 
                  type="text" 
                  value={about.badgeAr || ''} 
                  onChange={(e) => updateAbout('badgeAr', e.target.value)} 
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الأول (EN)' : 'Hero Title Lead Line (EN)'}</label>
                <input 
                  type="text" 
                  value={about.heroTitle1En || ''} 
                  onChange={(e) => updateAbout('heroTitle1En', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الأول (عربي)' : 'Hero Title Lead Line (AR)'}</label>
                <input 
                  type="text" 
                  value={about.heroTitle1Ar || ''} 
                  onChange={(e) => updateAbout('heroTitle1Ar', e.target.value)} 
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الثاني الذهبي (EN)' : 'Hero Title Gold Serif Line (EN)'}</label>
                <input 
                  type="text" 
                  value={about.heroTitle2En || ''} 
                  onChange={(e) => updateAbout('heroTitle2En', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'العنوان الرئيسي - السطر الثاني الذهبي (عربي)' : 'Hero Title Gold Serif Line (AR)'}</label>
                <input 
                  type="text" 
                  value={about.heroTitle2Ar || ''} 
                  onChange={(e) => updateAbout('heroTitle2Ar', e.target.value)} 
                />
              </div>

              <div className="field-group full-width">
                <label>{isAr ? 'نص البيان المعماري التأسيسي (EN)' : 'Editorial Manifesto Lead Text (EN)'}</label>
                <textarea 
                  rows={3}
                  value={about.manifestoEn || ''} 
                  onChange={(e) => updateAbout('manifestoEn', e.target.value)} 
                />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'نص البيان المعماري التأسيسي (عربي)' : 'Editorial Manifesto Lead Text (AR)'}</label>
                <textarea 
                  rows={3}
                  value={about.manifestoAr || ''} 
                  onChange={(e) => updateAbout('manifestoAr', e.target.value)} 
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'نص الزر الأول (EN)' : 'Hero Button 1 Text (EN)'}</label>
                <input 
                  type="text" 
                  value={about.heroCta1TextEn || ''} 
                  onChange={(e) => updateAbout('heroCta1TextEn', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'نص الزر الأول (عربي)' : 'Hero Button 1 Text (AR)'}</label>
                <input 
                  type="text" 
                  value={about.heroCta1TextAr || ''} 
                  onChange={(e) => updateAbout('heroCta1TextAr', e.target.value)} 
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'نص الزر الثاني (EN)' : 'Hero Button 2 Text (EN)'}</label>
                <input 
                  type="text" 
                  value={about.heroCta2TextEn || ''} 
                  onChange={(e) => updateAbout('heroCta2TextEn', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'نص الزر الثاني (عربي)' : 'Hero Button 2 Text (AR)'}</label>
                <input 
                  type="text" 
                  value={about.heroCta2TextAr || ''} 
                  onChange={(e) => updateAbout('heroCta2TextAr', e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* 2. Metrology Stats */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><BarChart3 size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? '٢. أرقام وإحصائيات الهيبة (I, II, III, IV)' : '2. Authority Stats Ribbon (I to IV)'}</h2>
                <p className="card-sub">{isAr ? 'تعديل القيم والنصوص الوصفية لكل رقم' : 'Values and descriptive labels for the metrology strip.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              {/* Stat 1 */}
              <div className="field-group">
                <label>{isAr ? 'الرقم I - القيمة (EN & AR)' : 'Stat I - Value (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="2.5B+ EGP" value={about.stat1Value || ''} onChange={(e) => updateAbout('stat1Value', e.target.value)} />
                  <input type="text" placeholder="٢.٥+ مليار ج.م" value={about.stat1ValueAr || ''} onChange={(e) => updateAbout('stat1ValueAr', e.target.value)} />
                </div>
              </div>
              <div className="field-group">
                <label>{isAr ? 'الرقم I - الوصف (EN / AR)' : 'Stat I - Label (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="Curated Asset Volume" value={about.stat1LabelEn || ''} onChange={(e) => updateAbout('stat1LabelEn', e.target.value)} />
                  <input type="text" placeholder="حجم المحفظة" value={about.stat1LabelAr || ''} onChange={(e) => updateAbout('stat1LabelAr', e.target.value)} />
                </div>
              </div>

              {/* Stat 2 */}
              <div className="field-group">
                <label>{isAr ? 'الرقم II - القيمة (EN & AR)' : 'Stat II - Value (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="15+ Districts" value={about.stat2Value || ''} onChange={(e) => updateAbout('stat2Value', e.target.value)} />
                  <input type="text" placeholder="+١٥ منطقة" value={about.stat2ValueAr || ''} onChange={(e) => updateAbout('stat2ValueAr', e.target.value)} />
                </div>
              </div>
              <div className="field-group">
                <label>{isAr ? 'الرقم II - الوصف (EN / AR)' : 'Stat II - Label (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="Prime Egyptian Markets" value={about.stat2LabelEn || ''} onChange={(e) => updateAbout('stat2LabelEn', e.target.value)} />
                  <input type="text" placeholder="مناطق استراتيجية" value={about.stat2LabelAr || ''} onChange={(e) => updateAbout('stat2LabelAr', e.target.value)} />
                </div>
              </div>

              {/* Stat 3 */}
              <div className="field-group">
                <label>{isAr ? 'الرقم III - القيمة (EN & AR)' : 'Stat III - Value (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="98%" value={about.stat3Value || ''} onChange={(e) => updateAbout('stat3Value', e.target.value)} />
                  <input type="text" placeholder="٩٨٪" value={about.stat3ValueAr || ''} onChange={(e) => updateAbout('stat3ValueAr', e.target.value)} />
                </div>
              </div>
              <div className="field-group">
                <label>{isAr ? 'الرقم III - الوصف (EN / AR)' : 'Stat III - Label (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="Client Retention Rate" value={about.stat3LabelEn || ''} onChange={(e) => updateAbout('stat3LabelEn', e.target.value)} />
                  <input type="text" placeholder="استمرارية العملاء" value={about.stat3LabelAr || ''} onChange={(e) => updateAbout('stat3LabelAr', e.target.value)} />
                </div>
              </div>

              {/* Stat 4 */}
              <div className="field-group">
                <label>{isAr ? 'الرقم IV - القيمة (EN & AR)' : 'Stat IV - Value (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="10+ Years" value={about.stat4Value || ''} onChange={(e) => updateAbout('stat4Value', e.target.value)} />
                  <input type="text" placeholder="+١٠ سنوات" value={about.stat4ValueAr || ''} onChange={(e) => updateAbout('stat4ValueAr', e.target.value)} />
                </div>
              </div>
              <div className="field-group">
                <label>{isAr ? 'الرقم IV - الوصف (EN / AR)' : 'Stat IV - Label (EN / AR)'}</label>
                <div className="dual-inputs-row">
                  <input type="text" placeholder="Bespoke Heritage" value={about.stat4LabelEn || ''} onChange={(e) => updateAbout('stat4LabelEn', e.target.value)} />
                  <input type="text" placeholder="سنوات الخبرة" value={about.stat4LabelAr || ''} onChange={(e) => updateAbout('stat4LabelAr', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Paravent Decade Monograph */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><BookOpen size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? '٣. نصوص سردية العقد الأول (فصول بارافينت)' : '3. Decade Monograph Folio Chapters'}</h2>
                <p className="card-sub">{isAr ? 'تعديل فصول المسيرة الأربعة وعناوين المحطات' : 'Edit the 4 historical chapters and narrative monographs.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              <div className="field-group">
                <label>{isAr ? 'عنوان القسم الرئيسي (EN)' : 'Section Main Title (EN)'}</label>
                <input 
                  type="text" 
                  value={about.paraventTitleEn || ''} 
                  onChange={(e) => updateAbout('paraventTitleEn', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'عنوان القسم الرئيسي (عربي)' : 'Section Main Title (AR)'}</label>
                <input 
                  type="text" 
                  value={about.paraventTitleAr || ''} 
                  onChange={(e) => updateAbout('paraventTitleAr', e.target.value)} 
                />
              </div>

              {/* Chapter 1 */}
              <div className="field-group full-width">
                <div className="sub-chapter-divider">{isAr ? 'الفصل الأول (٢٠١٦ - التأسيس والميثاق)' : 'Chapter I (2016 Genesis)'}</div>
              </div>
              <div className="field-group">
                <label>{isAr ? 'عنوان الفصل (EN)' : 'Chapter I Title (EN)'}</label>
                <input type="text" value={about.chap1TitleEn || ''} onChange={(e) => updateAbout('chap1TitleEn', e.target.value)} />
              </div>
              <div className="field-group">
                <label>{isAr ? 'عنوان الفصل (عربي)' : 'Chapter I Title (AR)'}</label>
                <input type="text" value={about.chap1TitleAr || ''} onChange={(e) => updateAbout('chap1TitleAr', e.target.value)} />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'نص السردية للفصل الأول (عربي)' : 'Chapter I Narrative (AR)'}</label>
                <textarea rows={2} value={about.chap1NarrativeAr || ''} onChange={(e) => updateAbout('chap1NarrativeAr', e.target.value)} />
              </div>

              {/* Chapter 4 */}
              <div className="field-group full-width">
                <div className="sub-chapter-divider">{isAr ? 'الفصل الرابع (٢٠٢٥-٢٠٢٦ - الآفاق المستقبلية والساحل)' : 'Chapter IV (2025–2026 Sovereign Horizon)'}</div>
              </div>
              <div className="field-group">
                <label>{isAr ? 'عنوان الفصل الرابع (EN)' : 'Chapter IV Title (EN)'}</label>
                <input type="text" value={about.chap4TitleEn || ''} onChange={(e) => updateAbout('chap4TitleEn', e.target.value)} />
              </div>
              <div className="field-group">
                <label>{isAr ? 'عنوان الفصل الرابع (عربي)' : 'Chapter IV Title (AR)'}</label>
                <input type="text" value={about.chap4TitleAr || ''} onChange={(e) => updateAbout('chap4TitleAr', e.target.value)} />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'نص السردية للفصل الرابع (عربي)' : 'Chapter IV Narrative (AR)'}</label>
                <textarea rows={2} value={about.chap4NarrativeAr || ''} onChange={(e) => updateAbout('chap4NarrativeAr', e.target.value)} />
              </div>
            </div>
          </div>

          {/* 4. Curation Protocol & Pillars */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><ShieldCheck size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? '٤. ركائز الفحص المعماري الثلاثة' : '4. Forensic Curation Protocol & 3 Pillars'}</h2>
                <p className="card-sub">{isAr ? 'تعديل نصوص الفحص الإنشائي والقانوني والمالي' : 'Structural, legal, and capital liquidity pillar descriptions.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              {/* Pillar 1 */}
              <div className="field-group">
                <label>{isAr ? 'الركيزة الأولى - الفحص الإنشائي (EN)' : 'Pillar I Title (EN)'}</label>
                <input type="text" value={about.pillar1TitleEn || ''} onChange={(e) => updateAbout('pillar1TitleEn', e.target.value)} />
              </div>
              <div className="field-group">
                <label>{isAr ? 'الركيزة الأولى - الفحص الإنشائي (عربي)' : 'Pillar I Title (AR)'}</label>
                <input type="text" value={about.pillar1TitleAr || ''} onChange={(e) => updateAbout('pillar1TitleAr', e.target.value)} />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'شرح الركيزة الأولى (عربي)' : 'Pillar I Description (AR)'}</label>
                <textarea rows={2} value={about.pillar1DescAr || ''} onChange={(e) => updateAbout('pillar1DescAr', e.target.value)} />
              </div>

              {/* Pillar 2 */}
              <div className="field-group">
                <label>{isAr ? 'الركيزة الثانية - التوثيق القانوني (EN)' : 'Pillar II Title (EN)'}</label>
                <input type="text" value={about.pillar2TitleEn || ''} onChange={(e) => updateAbout('pillar2TitleEn', e.target.value)} />
              </div>
              <div className="field-group">
                <label>{isAr ? 'الركيزة الثانية - التوثيق القانوني (عربي)' : 'Pillar II Title (AR)'}</label>
                <input type="text" value={about.pillar2TitleAr || ''} onChange={(e) => updateAbout('pillar2TitleAr', e.target.value)} />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'شرح الركيزة الثانية (عربي)' : 'Pillar II Description (AR)'}</label>
                <textarea rows={2} value={about.pillar2DescAr || ''} onChange={(e) => updateAbout('pillar2DescAr', e.target.value)} />
              </div>

              {/* Pillar 3 */}
              <div className="field-group">
                <label>{isAr ? 'الركيزة الثالثة - دراسة الجدوى (EN)' : 'Pillar III Title (EN)'}</label>
                <input type="text" value={about.pillar3TitleEn || ''} onChange={(e) => updateAbout('pillar3TitleEn', e.target.value)} />
              </div>
              <div className="field-group">
                <label>{isAr ? 'الركيزة الثالثة - دراسة الجدوى (عربي)' : 'Pillar III Title (AR)'}</label>
                <input type="text" value={about.pillar3TitleAr || ''} onChange={(e) => updateAbout('pillar3TitleAr', e.target.value)} />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'شرح الركيزة الثالثة (عربي)' : 'Pillar III Description (AR)'}</label>
                <textarea rows={2} value={about.pillar3DescAr || ''} onChange={(e) => updateAbout('pillar3DescAr', e.target.value)} />
              </div>
            </div>
          </div>

          {/* 5. Founder Monograph */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><Quote size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? '٥. رسالة ورؤية المؤسس (م. فريد زكريا)' : '5. Founder’s Letter & Quotation'}</h2>
                <p className="card-sub">{isAr ? 'نص المقولة الرسمية واسم والمسمى الوظيفي للمؤسس' : 'Quotation text, founder credentials, and official title.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              <div className="field-group full-width">
                <label>{isAr ? 'مقولة ورؤية المؤسس (EN)' : 'Founder Quote (EN)'}</label>
                <textarea 
                  rows={2} 
                  value={about.founderQuoteEn || ''} 
                  onChange={(e) => updateAbout('founderQuoteEn', e.target.value)} 
                />
              </div>
              <div className="field-group full-width">
                <label>{isAr ? 'مقولة ورؤية المؤسس (عربي)' : 'Founder Quote (AR)'}</label>
                <textarea 
                  rows={2} 
                  value={about.founderQuoteAr || ''} 
                  onChange={(e) => updateAbout('founderQuoteAr', e.target.value)} 
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'اسم المؤسس (EN)' : 'Founder Name (EN)'}</label>
                <input 
                  type="text" 
                  value={about.founderNameEn || ''} 
                  onChange={(e) => updateAbout('founderNameEn', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'اسم المؤسس (عربي)' : 'Founder Name (AR)'}</label>
                <input 
                  type="text" 
                  value={about.founderNameAr || ''} 
                  onChange={(e) => updateAbout('founderNameAr', e.target.value)} 
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'المسمى الوظيفي (EN)' : 'Founder Title (EN)'}</label>
                <input 
                  type="text" 
                  value={about.founderTitleEn || ''} 
                  onChange={(e) => updateAbout('founderTitleEn', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'المسمى الوظيفي (عربي)' : 'Founder Title (AR)'}</label>
                <input 
                  type="text" 
                  value={about.founderTitleAr || ''} 
                  onChange={(e) => updateAbout('founderTitleAr', e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* 6. Closing Portal CTA */}
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><Award size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? '٦. بطاقة الاستحواذ الخاص الختامية' : '6. Confidential Placement Portal CTA'}</h2>
                <p className="card-sub">{isAr ? 'العنوان ونص الدعوة للتواصل في نهاية صفحة من نحن' : 'Closing banner headline and private advisory prompt.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              <div className="field-group">
                <label>{isAr ? 'العنوان الختامي (EN)' : 'Portal Headline (EN)'}</label>
                <input 
                  type="text" 
                  value={about.portalHeadingEn || ''} 
                  onChange={(e) => updateAbout('portalHeadingEn', e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label>{isAr ? 'العنوان الختامي (عربي)' : 'Portal Headline (AR)'}</label>
                <input 
                  type="text" 
                  value={about.portalHeadingAr || ''} 
                  onChange={(e) => updateAbout('portalHeadingAr', e.target.value)} 
                />
              </div>

              <div className="field-group full-width">
                <label>{isAr ? 'الفقرة الختامية (عربي)' : 'Portal Paragraph (AR)'}</label>
                <textarea 
                  rows={2} 
                  value={about.portalParagraphAr || ''} 
                  onChange={(e) => updateAbout('portalParagraphAr', e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: PUBLIC ADVISORY DESK CONTACT INFO
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'contact' && (
        <div className="settings-tab-pane">
          <div className="settings-card">
            <div className="card-section-head">
              <div className="card-icon-wrap"><Phone size={18} /></div>
              <div>
                <h2 className="card-title">{isAr ? 'أرقام وهوية التواصل الرسمية' : 'Official Advisory Contact Channels'}</h2>
                <p className="card-sub">{isAr ? 'تعديل أرقام الهاتف والبريد ومكتب الاستقبال' : 'Update the direct phone lines, emails, and address across the site.'}</p>
              </div>
            </div>

            <div className="form-fields-grid">
              <div className="field-group">
                <label>{isAr ? 'الخط الساخن / الهاتف' : 'Official Phone Line'}</label>
                <input 
                  type="text" 
                  value={contact.phone} 
                  onChange={(e) => updateContact('phone', e.target.value)}
                  onBlur={(e) => {
                    const formatted = formatDisplayPhoneNumber(e.target.value);
                    if (formatted) updateContact('phone', formatted);
                  }}
                  placeholder="+20 100 997 0776"
                />
              </div>

              <div className="field-group">
                <label>{isAr ? 'رقم الواتساب للاستفسارات' : 'Official WhatsApp Number'}</label>
                <input 
                  type="text" 
                  value={contact.whatsapp} 
                  onChange={(e) => updateContact('whatsapp', e.target.value)}
                  onBlur={(e) => {
                    const formatted = formatDisplayPhoneNumber(e.target.value);
                    if (formatted) updateContact('whatsapp', formatted);
                  }}
                  placeholder="+20 100 997 0776"
                />
              </div>

              <div className="field-group full-width">
                <label>{isAr ? 'البريد الإلكتروني للاستشارات' : 'Concierge Email'}</label>
                <input 
                  type="email" 
                  value={contact.email} 
                  onChange={(e) => updateContact('email', e.target.value)} 
                />
              </div>

              <div className="field-group full-width">
                <label>{isAr ? 'عنوان المقر الرئيسي (EN)' : 'Headquarters Address (EN)'}</label>
                <input 
                  type="text" 
                  value={contact.addressEn} 
                  onChange={(e) => updateContact('addressEn', e.target.value)} 
                />
              </div>

              <div className="field-group full-width">
                <label>{isAr ? 'عنوان المقر الرئيسي (عربي)' : 'Headquarters Address (AR)'}</label>
                <input 
                  type="text" 
                  value={contact.addressAr} 
                  onChange={(e) => updateContact('addressAr', e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STYLES (Strict mobile fluid containment with zero overflow) ─── */}
      <style jsx>{`
        .admin-settings-root {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          color: #E2E8F0;
        }

        /* Top Header Card */
        .settings-header-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: #11141D;
          border: 1px solid rgba(212, 175, 55, 0.22);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (min-width: 900px) {
          .settings-header-card {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
          }
        }

        .settings-header-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .header-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .gold-pill {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 3px 8px;
          background: rgba(212, 175, 55, 0.12);
          color: #D4AF37;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 4px;
        }

        .live-pill {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 3px 8px;
          background: rgba(34, 197, 94, 0.12);
          color: #4ADE80;
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ADE80;
          box-shadow: 0 0 6px #4ADE80;
        }

        .settings-main-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.3;
          word-break: break-word;
        }

        @media (min-width: 640px) {
          .settings-main-title {
            font-size: 1.45rem;
          }
        }

        .settings-main-desc {
          font-size: 0.8rem;
          color: #94A3B8;
          margin: 0;
          line-height: 1.45;
          word-break: break-word;
        }

        .settings-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .settings-actions-row {
            display: flex;
            align-items: center;
            width: auto;
          }
        }

        .btn-outline-gold {
          height: 40px;
          padding: 0 14px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #CBD5E1;
          font-size: 0.82rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .btn-outline-gold:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(212, 175, 55, 0.4);
          color: #FFFFFF;
        }

        .btn-solid-gold {
          height: 40px;
          padding: 0 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #D4AF37 0%, #B89628 100%);
          border: 1px solid #E6CA65;
          color: #0A0C10;
          font-size: 0.82rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
          box-shadow: 0 2px 8px rgba(212, 175, 55, 0.25);
        }

        .btn-solid-gold:hover {
          filter: brightness(1.1);
        }

        /* Tabs Scroller */
        .settings-tabs-scroller {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
          box-sizing: border-box;
        }

        .settings-tabs-scroller::-webkit-scrollbar {
          display: none;
        }

        .settings-tabs-track {
          display: flex;
          align-items: center;
          gap: 8px;
          width: max-content;
          padding-bottom: 2px;
          box-sizing: border-box;
        }

        .settings-tab-btn {
          height: 38px;
          padding: 0 14px;
          border-radius: 8px;
          background: #11141D;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94A3B8;
          font-size: 0.8rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .settings-tab-btn:hover {
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .settings-tab-btn.active {
          background: rgba(212, 175, 55, 0.15);
          border-color: #D4AF37;
          color: #D4AF37;
        }

        /* Tab Pane & Cards */
        .settings-tab-pane {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .settings-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: #11141D;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .settings-card {
            padding: 20px;
          }
        }

        .card-section-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .card-section-head-between {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .card-section-head-between {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .card-section-head-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .card-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(212, 175, 55, 0.1);
          border: 1px solid rgba(212, 175, 55, 0.25);
          color: #D4AF37;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.3;
        }

        .card-sub {
          font-size: 0.76rem;
          color: #94A3B8;
          margin: 2px 0 0;
          line-height: 1.4;
        }

        /* Toggle Checkbox Cards */
        .toggles-grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .toggles-grid-2col {
            grid-template-columns: 1fr 1fr;
          }
        }

        .toggle-checkbox-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .toggle-checkbox-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(212, 175, 55, 0.3);
        }

        .toggle-checkbox-card input[type="checkbox"] {
          margin-top: 3px;
          accent-color: #D4AF37;
          width: 18px;
          height: 18px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .toggle-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: #E2E8F0;
        }

        .toggle-desc {
          font-size: 0.72rem;
          color: #94A3B8;
          line-height: 1.35;
        }

        /* Form Fields Grid */
        .form-fields-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .form-fields-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .field-group.full-width {
          grid-column: 1 / -1;
        }

        .field-group label {
          font-size: 0.74rem;
          font-weight: 600;
          color: #CBD5E1;
        }

        .field-group input,
        .field-group textarea,
        .field-group select {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: #090B10;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 8px 12px;
          color: #FFFFFF;
          font-size: 0.82rem;
          font-family: inherit;
          transition: border-color 0.2s ease;
        }

        .field-group input:focus,
        .field-group textarea:focus,
        .field-group select:focus {
          outline: none;
          border-color: #D4AF37;
        }

        .field-group textarea {
          resize: vertical;
          line-height: 1.45;
        }

        .dual-inputs-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .sub-chapter-divider {
          font-size: 0.76rem;
          font-weight: 700;
          color: #D4AF37;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          padding-bottom: 4px;
          margin-top: 6px;
        }

        /* District Rows */
        .btn-add-district {
          height: 34px;
          padding: 0 12px;
          border-radius: 6px;
          background: rgba(212, 175, 55, 0.15);
          border: 1px solid rgba(212, 175, 55, 0.35);
          color: #D4AF37;
          font-size: 0.78rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
        }

        .new-district-form {
          background: rgba(212, 175, 55, 0.05);
          border: 1px dashed rgba(212, 175, 55, 0.3);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .new-form-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #D4AF37;
          margin: 0;
        }

        .new-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-cancel {
          height: 32px;
          padding: 0 12px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #94A3B8;
          font-size: 0.76rem;
          cursor: pointer;
        }

        .btn-confirm {
          height: 32px;
          padding: 0 14px;
          border-radius: 6px;
          background: #D4AF37;
          border: none;
          color: #0A0C10;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
        }

        .districts-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .district-row-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .district-row-card.disabled {
          opacity: 0.55;
        }

        .district-row-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .district-tag-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .district-rank {
          font-size: 0.7rem;
          font-weight: 700;
          color: #D4AF37;
          background: rgba(212, 175, 55, 0.12);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .district-name-main {
          font-size: 0.85rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .district-name-alt {
          font-size: 0.74rem;
          color: #94A3B8;
        }

        .district-quick-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-icon-toggle {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94A3B8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .btn-icon-toggle.active {
          color: #4ADE80;
          border-color: rgba(34, 197, 94, 0.3);
        }

        .btn-icon-delete {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #EF4444;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .district-inputs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .district-inputs-grid {
            grid-template-columns: 1fr 1fr 1fr 1fr;
          }
        }

        .field-group-sm {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .field-group-sm label {
          font-size: 0.68rem;
          color: #94A3B8;
          font-weight: 500;
        }

        .field-group-sm input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: #090B10;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 6px 8px;
          color: #FFFFFF;
          font-size: 0.78rem;
        }
      `}</style>
    </div>
  );
}
