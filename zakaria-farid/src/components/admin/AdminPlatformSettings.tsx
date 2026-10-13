'use client';

import React, { useState } from 'react';
import AdminPageContent from './AdminPageContent';
import type { AboutPageContent } from '@/lib/siteContent/defaults';
import { useRouter } from 'next/navigation';
import { usePlatformSettings } from '@/lib/hooks/usePlatformSettings';
import { saveSiteContent, resetSiteContent } from '@/app/actions/siteContent';
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
  Home,
  LayoutTemplate,
} from 'lucide-react';
import { 
  MarketDistrictConfig, 
  PlatformDisplaySettings, 
  PlatformContactSettings,
  PlatformHomeSettings,
  DEFAULT_PLATFORM_SETTINGS, 
  DEFAULT_HOME_SETTINGS,
  DEFAULT_CONTACT_SETTINGS
} from '@/lib/services/marketIntelligence';
import { formatDisplayPhoneNumber } from '@/lib/utils/formatPhone';

interface AdminPlatformSettingsProps {
  adminLocale: string;
  initialAboutContent: AboutPageContent;
}

type TabKey = 'radar' | 'home' | 'about' | 'contact';

export default function AdminPlatformSettings({ adminLocale, initialAboutContent }: AdminPlatformSettingsProps) {
  const isAr = adminLocale === 'ar';
  const initialSettings = usePlatformSettings();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('radar');
  const [settings, setSettings] = useState<PlatformDisplaySettings>(initialSettings);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
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

  const handleSave = async () => {
    setSaving(true); setSavedSuccess(false); setSaveError('');
    const result = await saveSiteContent('platform_settings', settings);
    setSaving(false);
    if (!result.success) { setSaveError(isAr ? 'تعذر حفظ الإعدادات. تحقق من تسجيل الدخول وإتاحة جدول المحتوى ثم حاول مجدداً.' : result.error || 'Save failed'); return; }
    setSavedSuccess(true); router.refresh();
  };

  const handleResetDefaults = async () => {
    if (confirm(isAr ? 'هل أنت متأكد من استعادة كافة الإعدادات والنصوص الافتراضية؟' : 'Are you sure you want to restore all factory default platform settings and editorials?')) {
      setSaving(true); setSavedSuccess(false); setSaveError('');
      const result = await resetSiteContent('platform_settings');
      setSaving(false);
      if (!result.success) { setSaveError(isAr ? 'تعذر استعادة الإعدادات الافتراضية. حاول مجدداً.' : result.error || 'Reset failed'); return; }
      setSettings(structuredClone(DEFAULT_PLATFORM_SETTINGS));
      setSavedSuccess(true); router.refresh();
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
  const contact = settings.contact || DEFAULT_CONTACT_SETTINGS;

  return (
    <div className={`admin-settings-root is-light`} dir={isAr ? 'rtl' : 'ltr'} onChangeCapture={() => setSavedSuccess(false)}>
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
            disabled={saving}
            className="btn-outline-gold"
          >
            <RefreshCw size={15} />
            <span>{isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleSave}
            disabled={saving}
            className="btn-solid-gold"
          >
            {savedSuccess ? <Check size={16} /> : <Save size={16} />}
            <span>{saving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : savedSuccess ? (isAr ? 'تم الحفظ بنجاح!' : 'Saved Successfully!') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      {saveError && <p role="alert" style={{ color: 'var(--admin-danger, var(--erp-danger))' }}>{saveError}</p>}
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
                  <span className="toggle-title">{isAr ? 'عرض صندوق تنبيهات كبار العملاء' : 'Show VIP Property Alerts Card'}</span>
                  <span className="toggle-desc">{isAr ? 'تفعيل بطاقة الاشتراك في الفرص النادرة بالشريط الجانبي' : 'Enable email alerts subscription box in the properties sidebar'}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Public Price Privacy (POA) Card */}
          <div className={`settings-card ${settings.hidePropertyPrices ? 'poa-active-card' : ''}`} style={{
            border: settings.hidePropertyPrices ? '1.5px solid var(--admin-accent)' : undefined,
            background: settings.hidePropertyPrices ? 'var(--admin-accent-tint)' : undefined
          }}>
            <div className="card-section-head-between">
              <div className="card-section-head-left">
                <div className="card-icon-wrap" style={{ color: settings.hidePropertyPrices ? 'var(--admin-accent)' : undefined }}>
                  {settings.hidePropertyPrices ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
                <div>
                  <h2 className="card-title">
                    {isAr ? '🔒 إخفاء أسعار العقارات عن الزوار (السعر عند الطلب)' : '🔒 Hide Property Prices from Public (Price on Application - POA)'}
                  </h2>
                  <p className="card-sub">
                    {isAr 
                      ? 'عند التفعيل، يتم حجب الأسعار الرقمية لجميع العقارات واستبدالها بعبارة "السعر عند الطلب" لحفظ الخصوصية وتشجيع طلب المعاينات والتواصل المباشر.'
                      : 'When enabled, public listings display "Price on Application" instead of numeric prices to protect client privacy and drive high-intent inquiries.'}
                  </p>
                </div>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={!!settings.hidePropertyPrices}
                  onChange={(e) => {
                    const next = { ...settings, hidePropertyPrices: e.target.checked };
                    setSettings(next);
                  }}
                  style={{ width: 18, height: 18, accentColor: 'var(--admin-accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 800, color: settings.hidePropertyPrices ? 'var(--admin-accent)' : ('#475569') }}>
                  {settings.hidePropertyPrices ? (isAr ? 'مفعل (مخفي)' : 'Enabled (Hidden)') : (isAr ? 'معطل (معروض)' : 'Disabled (Visible)')}
                </span>
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
                      dir="ltr"
                      style={{ textAlign: 'left' }}
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
                      {!isAr && <span className="district-name-alt">({district.districtAr})</span>}
                    </div>

                    <div className="district-quick-actions">
                      <button 
                        type="button" 
                        onClick={() => handleToggleDistrict(district.id)}
                        className={`btn-icon-toggle ${district.isEnabled ? 'active' : ''}`}
                        title={isAr ? (district.isEnabled ? 'إخفاء المنطقة' : 'إظهار المنطقة') : (district.isEnabled ? 'Disable' : 'Enable')}
                      >
                        {district.isEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>

                      <button 
                        type="button" 
                        onClick={() => handleDeleteDistrict(district.id)}
                        className="btn-icon-delete"
                        title={isAr ? 'حذف المنطقة' : 'Delete'}
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
                        dir="ltr"
                        style={{ textAlign: 'left' }}
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
      {activeTab === 'about' && <div className="settings-tab-pane"><AdminPageContent adminLocale={adminLocale} initialContent={initialAboutContent} /></div>}

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
          border: 1px solid color-mix(in srgb, var(--admin-accent) 22%, transparent);
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
          background: var(--admin-accent-tint);
          color: var(--admin-accent);
          border: 1px solid var(--admin-accent-border);
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
          border-color: var(--admin-accent-border);
          color: #FFFFFF;
        }

        .btn-solid-gold {
          height: 40px;
          padding: 0 16px;
          border-radius: 8px;
          background: var(--admin-accent);
          border: 1px solid var(--admin-accent);
          color: var(--admin-on-accent);
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
          box-shadow: none;
        }

        .btn-solid-gold:hover {
          background: var(--admin-accent-hover);
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
          background: var(--admin-accent-tint);
          border-color: var(--admin-accent);
          color: var(--admin-accent);
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
          background: var(--admin-accent-tint);
          border: 1px solid var(--admin-accent-border);
          color: var(--admin-accent);
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
          border-color: var(--admin-accent-border);
        }

        .toggle-checkbox-card input[type="checkbox"] {
          margin-top: 3px;
          accent-color: var(--admin-accent);
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
          border-color: var(--admin-accent);
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
          color: var(--admin-accent);
          border-bottom: 1px solid var(--admin-accent-border);
          padding-bottom: 4px;
          margin-top: 6px;
        }

        /* District Rows */
        .btn-add-district {
          height: 34px;
          padding: 0 12px;
          border-radius: 6px;
          background: var(--admin-accent-tint);
          border: 1px solid var(--admin-accent-border);
          color: var(--admin-accent);
          font-size: 0.78rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
        }

        .new-district-form {
          background: var(--admin-accent-tint);
          border: 1px dashed var(--admin-accent-border);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .new-form-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--admin-accent);
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
          background: var(--admin-accent);
          border: none;
          color: var(--admin-on-accent);
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
          color: var(--admin-accent);
          background: var(--admin-accent-tint);
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

        /* ══════════════════════════════════════════════════════════════════════
           ALABASTER LUXURY LIGHT MODE OVERRIDES
        ══════════════════════════════════════════════════════════════════════ */
        .admin-settings-root.is-light,
        :global([data-theme="light"]) .admin-settings-root {
          color: #0F172A;
        }

        /* Header Card */
        .admin-settings-root.is-light .settings-header-card,
        :global([data-theme="light"]) .admin-settings-root .settings-header-card {
          background: #FFFFFF !important;
          border: 1px solid var(--admin-card-border) !important;
          box-shadow: var(--admin-card-shadow) !important;
        }

        .admin-settings-root.is-light .settings-main-title,
        :global([data-theme="light"]) .admin-settings-root .settings-main-title {
          color: #0F172A !important;
          font-weight: 800;
        }

        .admin-settings-root.is-light .settings-main-desc,
        :global([data-theme="light"]) .admin-settings-root .settings-main-desc {
          color: #475569 !important;
        }

        .admin-settings-root.is-light .gold-pill,
        :global([data-theme="light"]) .admin-settings-root .gold-pill {
          background: var(--admin-accent-tint) !important;
          border: 1px solid var(--admin-accent-border) !important;
          color: var(--admin-accent) !important;
        }

        .admin-settings-root.is-light .live-pill,
        :global([data-theme="light"]) .admin-settings-root .live-pill {
          background: rgba(4, 120, 87, 0.08) !important;
          border: 1px solid rgba(4, 120, 87, 0.25) !important;
          color: #047857 !important;
        }

        /* Action Buttons */
        .admin-settings-root.is-light .btn-outline-gold,
        :global([data-theme="light"]) .admin-settings-root .btn-outline-gold {
          background: #F8FAFC !important;
          border: 1px solid var(--admin-card-border) !important;
          color: #0F172A !important;
          font-weight: 700;
        }

        .admin-settings-root.is-light .btn-outline-gold:hover,
        :global([data-theme="light"]) .admin-settings-root .btn-outline-gold:hover {
          background: #F1F5F9 !important;
          border-color: var(--admin-accent) !important;
          color: var(--admin-accent) !important;
        }

        .admin-settings-root.is-light .btn-solid-gold,
        :global([data-theme="light"]) .admin-settings-root .btn-solid-gold {
          background: var(--admin-accent) !important;
          border: 1px solid var(--admin-accent) !important;
          color: var(--admin-on-accent) !important;
          font-weight: 800;
          box-shadow: none !important;
        }

        .admin-settings-root.is-light .btn-solid-gold:hover,
        :global([data-theme="light"]) .admin-settings-root .btn-solid-gold:hover {
          background: var(--admin-accent-hover) !important;
        }

        /* Navigation Tabs */
        .admin-settings-root.is-light .settings-tab-btn,
        :global([data-theme="light"]) .admin-settings-root .settings-tab-btn {
          background: #FFFFFF !important;
          border: 1px solid var(--admin-card-border) !important;
          color: #475569 !important;
          font-weight: 700;
        }

        .admin-settings-root.is-light .settings-tab-btn:hover,
        :global([data-theme="light"]) .admin-settings-root .settings-tab-btn:hover {
          background: #F8FAFC !important;
          color: #0F172A !important;
          border-color: var(--admin-accent) !important;
        }

        .admin-settings-root.is-light .settings-tab-btn.active,
        :global([data-theme="light"]) .admin-settings-root .settings-tab-btn.active {
          background: var(--admin-accent-tint) !important;
          border: 1px solid var(--admin-accent) !important;
          color: var(--admin-accent) !important;
          font-weight: 800;
        }

        /* Settings Cards */
        .admin-settings-root.is-light .settings-card,
        :global([data-theme="light"]) .admin-settings-root .settings-card {
          background: #FFFFFF !important;
          border: 1px solid var(--admin-card-border) !important;
          box-shadow: var(--admin-card-shadow) !important;
        }

        .admin-settings-root.is-light .settings-card.poa-active-card,
        :global([data-theme="light"]) .admin-settings-root .settings-card.poa-active-card {
          background: var(--admin-accent-tint) !important;
          border: 1.5px solid var(--admin-accent) !important;
        }

        .admin-settings-root.is-light .card-title,
        :global([data-theme="light"]) .admin-settings-root .card-title {
          color: #0F172A !important;
          font-weight: 800;
        }

        .admin-settings-root.is-light .card-sub,
        :global([data-theme="light"]) .admin-settings-root .card-sub {
          color: #475569 !important;
          font-weight: 500;
        }

        .admin-settings-root.is-light .card-icon-wrap,
        :global([data-theme="light"]) .admin-settings-root .card-icon-wrap {
          background: var(--admin-accent-tint) !important;
          border: 1px solid var(--admin-accent-border) !important;
          color: var(--admin-accent) !important;
        }

        /* Toggle Checkbox Cards */
        .admin-settings-root.is-light .toggle-checkbox-card,
        :global([data-theme="light"]) .admin-settings-root .toggle-checkbox-card {
          background: #F8FAFC !important;
          border: 1px solid var(--admin-card-border) !important;
          border-radius: 10px;
        }

        .admin-settings-root.is-light .toggle-checkbox-card:hover,
        :global([data-theme="light"]) .admin-settings-root .toggle-checkbox-card:hover {
          background: #F1F5F9 !important;
          border-color: var(--admin-accent) !important;
        }

        .admin-settings-root.is-light .toggle-title,
        :global([data-theme="light"]) .admin-settings-root .toggle-title {
          color: #0F172A !important;
          font-weight: 800;
        }

        .admin-settings-root.is-light .toggle-desc,
        :global([data-theme="light"]) .admin-settings-root .toggle-desc {
          color: #475569 !important;
          font-weight: 500;
        }

        .admin-settings-root.is-light .toggle-checkbox-card input[type="checkbox"],
        :global([data-theme="light"]) .admin-settings-root .toggle-checkbox-card input[type="checkbox"] {
          accent-color: var(--admin-accent);
        }

        /* District Rows */
        .admin-settings-root.is-light .district-row-card,
        :global([data-theme="light"]) .admin-settings-root .district-row-card {
          background: #F8FAFC !important;
          border: 1px solid var(--admin-card-border) !important;
          border-radius: 10px;
        }

        .admin-settings-root.is-light .district-row-card:hover,
        :global([data-theme="light"]) .admin-settings-root .district-row-card:hover {
          background: #F1F5F9 !important;
          border-color: var(--admin-accent) !important;
        }

        .admin-settings-root.is-light .district-rank,
        :global([data-theme="light"]) .admin-settings-root .district-rank {
          background: var(--admin-accent-tint) !important;
          color: var(--admin-accent) !important;
          font-weight: 800;
        }

        .admin-settings-root.is-light .district-name-main,
        :global([data-theme="light"]) .admin-settings-root .district-name-main {
          color: #0F172A !important;
          font-weight: 800;
        }

        .admin-settings-root.is-light .district-name-alt,
        :global([data-theme="light"]) .admin-settings-root .district-name-alt {
          color: #475569 !important;
          font-weight: 600;
        }

        .admin-settings-root.is-light .field-group-sm label,
        :global([data-theme="light"]) .admin-settings-root .field-group-sm label {
          color: #475569 !important;
          font-weight: 700;
          font-size: 0.72rem;
        }

        .admin-settings-root.is-light .field-group-sm input,
        :global([data-theme="light"]) .admin-settings-root .field-group-sm input {
          background: #FFFFFF !important;
          border: 1px solid var(--admin-card-border) !important;
          color: #0F172A !important;
          font-weight: 700;
        }

        .admin-settings-root.is-light .field-group-sm input:focus,
        :global([data-theme="light"]) .admin-settings-root .field-group-sm input:focus {
          border-color: var(--admin-accent) !important;
          outline: none;
        }

        .admin-settings-root.is-light .btn-icon-toggle,
        :global([data-theme="light"]) .admin-settings-root .btn-icon-toggle {
          background: #FFFFFF !important;
          border: 1px solid var(--admin-card-border) !important;
          color: #64748B !important;
        }

        .admin-settings-root.is-light .btn-icon-toggle.active,
        :global([data-theme="light"]) .admin-settings-root .btn-icon-toggle.active {
          color: #047857 !important;
          background: rgba(4, 120, 87, 0.08) !important;
          border-color: rgba(4, 120, 87, 0.3) !important;
        }

        .admin-settings-root.is-light .btn-icon-delete,
        :global([data-theme="light"]) .admin-settings-root .btn-icon-delete {
          background: #FFF1F2 !important;
          border: 1px solid #FECDD3 !important;
          color: #E11D48 !important;
        }

        /* General Form Fields */
        .admin-settings-root.is-light .field-group label,
        :global([data-theme="light"]) .admin-settings-root .field-group label {
          color: #0F172A !important;
          font-weight: 700;
        }

        .admin-settings-root.is-light .field-group input,
        .admin-settings-root.is-light .field-group textarea,
        .admin-settings-root.is-light .field-group select,
        :global([data-theme="light"]) .admin-settings-root .field-group input,
        :global([data-theme="light"]) .admin-settings-root .field-group textarea,
        :global([data-theme="light"]) .admin-settings-root .field-group select {
          background: #FFFFFF !important;
          border: 1px solid var(--admin-input-border) !important;
          color: #0F172A !important;
          font-weight: 600;
        }

        .admin-settings-root.is-light .field-group input:focus,
        .admin-settings-root.is-light .field-group textarea:focus,
        .admin-settings-root.is-light .field-group select:focus,
        :global([data-theme="light"]) .admin-settings-root .field-group input:focus,
        :global([data-theme="light"]) .admin-settings-root .field-group textarea:focus,
        :global([data-theme="light"]) .admin-settings-root .field-group select:focus {
          border-color: var(--admin-accent) !important;
          outline: none;
        }

        .admin-settings-root.is-light .field-group input::placeholder,
        .admin-settings-root.is-light .field-group textarea::placeholder,
        :global([data-theme="light"]) .admin-settings-root .field-group input::placeholder,
        :global([data-theme="light"]) .admin-settings-root .field-group textarea::placeholder {
          color: #94A3B8;
        }

        /* New District Form */
        .admin-settings-root.is-light .btn-add-district,
        :global([data-theme="light"]) .admin-settings-root .btn-add-district {
          background: var(--admin-accent-tint) !important;
          border: 1px solid var(--admin-accent-border) !important;
          color: var(--admin-accent) !important;
          font-weight: 700;
        }

        .admin-settings-root.is-light .btn-add-district:hover,
        :global([data-theme="light"]) .admin-settings-root .btn-add-district:hover {
          background: var(--admin-accent-subtle) !important;
          border-color: var(--admin-accent) !important;
        }

        .admin-settings-root.is-light .new-district-form,
        :global([data-theme="light"]) .admin-settings-root .new-district-form {
          background: var(--admin-card-bg-subtle) !important;
          border: 1.5px dashed var(--admin-accent-border) !important;
        }

        .admin-settings-root.is-light .new-form-title,
        :global([data-theme="light"]) .admin-settings-root .new-form-title {
          color: var(--admin-accent) !important;
          font-weight: 800;
        }

        .admin-settings-root.is-light .btn-cancel,
        :global([data-theme="light"]) .admin-settings-root .btn-cancel {
          background: #FFFFFF !important;
          border: 1px solid var(--admin-card-border) !important;
          color: #475569 !important;
        }

        .admin-settings-root.is-light .btn-confirm,
        :global([data-theme="light"]) .admin-settings-root .btn-confirm {
          background: var(--admin-accent) !important;
          border: none !important;
          color: var(--admin-on-accent) !important;
          font-weight: 800;
        }

        /* Editorial Dividers */
        .admin-settings-root.is-light .sub-chapter-divider,
        :global([data-theme="light"]) .admin-settings-root .sub-chapter-divider {
          color: var(--admin-accent) !important;
          border-bottom: 1px solid var(--admin-accent-border) !important;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
