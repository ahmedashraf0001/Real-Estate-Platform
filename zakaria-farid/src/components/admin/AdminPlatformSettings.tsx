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
  PhoneCall,
  Mail,
  MessageCircle,
  MapPin,
  Zap,
  Key,
  Radio,
  Send,
  ShieldAlert,
  FileText,
  BookOpen,
  Quote,
  Award,
  ExternalLink,
  Layers,
  Compass
} from 'lucide-react';
import Link from 'next/link';
import { 
  MarketDistrictConfig, 
  PlatformDisplaySettings, 
  PlatformContactSettings,
  PlatformWhatsAppAutomationSettings,
  PlatformAboutSettings,
  getStoredPlatformSettings, 
  saveStoredPlatformSettings, 
  DEFAULT_PLATFORM_SETTINGS, 
  DEFAULT_MARKET_DISTRICTS,
  DEFAULT_WHATSAPP_AUTOMATION_SETTINGS,
  DEFAULT_ABOUT_SETTINGS
} from '@/lib/services/marketIntelligence';

interface AdminPlatformSettingsProps {
  adminLocale: string;
}

type TabKey = 'radar' | 'contact' | 'whatsapp' | 'about';

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
  const [isTestingDispatch, setIsTestingDispatch] = useState(false);
  const [testDispatchResult, setTestDispatchResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setSettings(getStoredPlatformSettings());
  }, []);

  const handleSave = () => {
    saveStoredPlatformSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestWhatsAppDispatch = async () => {
    setIsTestingDispatch(true);
    setTestDispatchResult(null);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: settings.whatsappAutomation || DEFAULT_WHATSAPP_AUTOMATION_SETTINGS,
          phone: settings.whatsappAutomation?.faridAlertPhone || '+201009970776',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestDispatchResult({
          success: true,
          message: isAr 
            ? `تم إرسال الإشعار التجريبي بنجاح عبر (${data.method}) إلى ${settings.whatsappAutomation?.faridAlertPhone || '+201009970776'}`
            : `Test WhatsApp notification dispatched successfully via (${data.method}) to ${settings.whatsappAutomation?.faridAlertPhone || '+201009970776'}`
        });
      } else {
        setTestDispatchResult({
          success: false,
          message: isAr ? `فشل الإرسال: ${data.error || 'يرجى مراجعة بيانات الاعتماد'}` : `Dispatch failed: ${data.error || 'Please check API credentials'}`
        });
      }
    } catch (err: any) {
      setTestDispatchResult({
        success: false,
        message: err.message || 'Network error while testing dispatch',
      });
    } finally {
      setIsTestingDispatch(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm(isAr ? 'هل تريد استعادة الإعدادات الافتراضية؟' : 'Reset all settings to system defaults?')) {
      setSettings(DEFAULT_PLATFORM_SETTINGS);
      saveStoredPlatformSettings(DEFAULT_PLATFORM_SETTINGS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const updateDistrict = (id: string, updates: Partial<MarketDistrictConfig>) => {
    setSettings(prev => ({
      ...prev,
      marketDistricts: prev.marketDistricts.map(d => d.id === id ? { ...d, ...updates } : d)
    }));
  };

  const toggleDistrictEnabled = (id: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        marketDistricts: prev.marketDistricts.map(d => d.id === id ? { ...d, isEnabled: !d.isEnabled } : d)
      };
      saveStoredPlatformSettings(next);
      return next;
    });
  };

  const deleteDistrict = (id: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        marketDistricts: prev.marketDistricts.filter(d => d.id !== id)
      };
      saveStoredPlatformSettings(next);
      return next;
    });
  };

  const handleToggleAboutSection = (key: keyof PlatformAboutSettings, value: boolean) => {
    setSettings(prev => {
      const next = {
        ...prev,
        about: {
          ...(prev.about || DEFAULT_ABOUT_SETTINGS),
          [key]: value
        }
      };
      saveStoredPlatformSettings(next);
      return next;
    });
  };

  const handleAddNewDistrict = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistrict.district) return;
    const id = newDistrict.district.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const created: MarketDistrictConfig = {
      id,
      rank: String(settings.marketDistricts.length + 1).padStart(2, '0'),
      district: newDistrict.district || 'New District',
      districtAr: newDistrict.districtAr || newDistrict.district || 'منطقة جديدة',
      subDistrict: newDistrict.district || '',
      subDistrictAr: newDistrict.districtAr || '',
      category: newDistrict.category || 'Prime District',
      categoryAr: newDistrict.categoryAr || 'منطقة راقية',
      pricePerSqm: Number(newDistrict.pricePerSqm) || 40000,
      medianTotal: newDistrict.medianTotal || '30.0M EGP',
      medianTotalAr: newDistrict.medianTotalAr || '٣٠.٠ مليون ج.م',
      fiveYearGain: newDistrict.fiveYearGain || '+50.0%',
      historical5Yr: [20, 25, 30, 35, 40],
      insight: newDistrict.insight || 'High liquidity and steady appreciation.',
      insightAr: newDistrict.insightAr || 'عائد استثماري وسيولة مرتفعة.',
      isEnabled: true
    };
    setSettings(prev => {
      const next = {
        ...prev,
        marketDistricts: [...prev.marketDistricts, created]
      };
      saveStoredPlatformSettings(next);
      return next;
    });
    setIsAddingNew(false);
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
  };

  const tabs: { key: TabKey; labelEn: string; labelAr: string; icon: any }[] = [
    { key: 'radar', labelEn: 'Market Valuation Radar', labelAr: 'مؤشر أسعار المتر والمناطق', icon: BarChart3 },
    { key: 'contact', labelEn: 'Public Advisory Desk', labelAr: 'بيانات التواصل والمقر', icon: PhoneCall },
    { key: 'whatsapp', labelEn: 'WhatsApp Lead Dispatch', labelAr: 'محرك إشعارات الواتساب', icon: Zap },
    { key: 'about', labelEn: 'About Page Editorial CMS', labelAr: 'محتوى صفحة من نحن', icon: BookOpen },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif)" }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ─── 1. Prestige Settings Header ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(16, 20, 29, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {isAr ? 'إعدادات المنصة ومؤشرات السوق' : 'Platform & Market Radar Settings'}
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '9999px',
              background: 'rgba(229, 184, 105, 0.12)',
              color: '#E5B869',
              border: '1px solid rgba(229, 184, 105, 0.3)'
            }}>
              {isAr ? 'لوحة التحكم المركزية' : 'Master Control'}
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px', margin: '4px 0 0', fontWeight: 500 }}>
            {isAr 
              ? 'إدارة أسعار المتر المربع بالمناطق، وأرقام التواصل الرسمية، وأتمتة إشعارات الواتساب، وتخصيص محتوى المنصة'
              : 'Configure market district benchmarks, official contact details, automated WhatsApp dispatches, and brand editorial.'}
          </p>
        </div>

        {/* Global Save Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button" 
            onClick={handleResetDefaults}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.75)',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            <RefreshCw size={13} />
            <span>{isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 800,
              background: savedSuccess 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                : 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)',
              color: '#0A0C10',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 3px 14px rgba(229, 184, 105, 0.3)',
              transition: 'all 150ms ease'
            }}
          >
            {savedSuccess ? (
              <>
                <Check size={15} strokeWidth={2.5} />
                <span>{isAr ? 'تم الحفظ المباشر!' : 'Saved Live!'}</span>
              </>
            ) : (
              <>
                <Save size={15} strokeWidth={2.5} />
                <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 2. Segmented Navigation Tabs ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px',
        background: 'rgba(16, 20, 29, 0.75)',
        backdropFilter: 'blur(20px)',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflowX: 'auto'
      }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#0A0C10' : 'rgba(255, 255, 255, 0.7)',
                background: isActive ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 4px 12px rgba(229, 184, 105, 0.25)' : 'none'
              }}
            >
              <Icon size={14} />
              <span>{isAr ? t.labelAr : t.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: Market Valuation Radar & District Benchmarks ─── */}
      {activeTab === 'radar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Feature Display Flags Card */}
          <div style={{
            background: 'rgba(16, 20, 29, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#E5B869', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Eye size={16} />
              </div>
              <div>
                <h2 style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {isAr ? 'خيارات العرض العامة بالكتالوج' : 'Catalog Display & Feature Flags'}
                </h2>
                <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)' }}>
                  {isAr ? 'التحكم في ظهور ويدجت مؤشر الأسعار ونموذج التنبيهات' : 'Control visibility of the Valuation Radar and VIP Alerts in the catalog sidebar.'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                padding: '14px 18px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                cursor: 'pointer'
              }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF', display: 'block' }}>
                    {isAr ? 'مؤشر أسعار المتر الكلي (Valuation Radar)' : 'Show Valuation Radar Widget'}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '2px', display: 'block' }}>
                    {isAr ? 'عرض مؤشر أسعار المتر في الشريط الجانبي للكتالوج' : 'Display EGP/m² benchmarks widget in the properties sidebar'}
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.showMarketRadar} 
                  onChange={(e) => {
                    const next = { ...settings, showMarketRadar: e.target.checked };
                    setSettings(next);
                    saveStoredPlatformSettings(next);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#E5B869', cursor: 'pointer' }}
                />
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                padding: '14px 18px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                cursor: 'pointer'
              }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF', display: 'block' }}>
                    {isAr ? 'بطاقة التنبيهات الفاخرة (VIP Alerts Card)' : 'Show VIP Property Alerts Card'}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '2px', display: 'block' }}>
                    {isAr ? 'تمكين نموذج الاشتراك بالبريد الإلكتروني بالكتالوج' : 'Enable email alerts subscription box in the properties sidebar'}
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.showVIPAlerts} 
                  onChange={(e) => {
                    const next = { ...settings, showVIPAlerts: e.target.checked };
                    setSettings(next);
                    saveStoredPlatformSettings(next);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#E5B869', cursor: 'pointer' }}
                />
              </label>
            </div>
          </div>

          {/* District Benchmarks Table */}
          <div style={{
            background: 'rgba(16, 20, 29, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#E5B869', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {isAr ? 'مصفوفة أسعار المتر المربع حسب المناطق' : 'Valuation Radar Districts & EGP/m² Benchmarks'}
                  </h2>
                  <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)' }}>
                    {isAr ? 'تعديل أسعار المتر، نسبة النمو السنوية، وحالة العرض في شريط الموقع' : 'Configure active districts, benchmark prices per square meter, and 5-year growth metrics.'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingNew(!isAddingNew)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '9px',
                  background: 'rgba(229, 184, 105, 0.12)',
                  border: '1px solid rgba(229, 184, 105, 0.3)',
                  color: '#E5B869',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>{isAr ? 'إضافة منطقة جديدة' : 'Add New District'}</span>
              </button>
            </div>

            {/* Add District Inline Box */}
            {isAddingNew && (
              <form onSubmit={handleAddNewDistrict} style={{
                background: 'rgba(229, 184, 105, 0.04)',
                border: '1px solid rgba(229, 184, 105, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                alignItems: 'flex-end'
              }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    District Name (EN)
                  </label>
                  <input
                    type="text"
                    required
                    value={newDistrict.district || ''}
                    onChange={(e) => setNewDistrict(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="e.g. New Cairo"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    اسم المنطقة (عربي)
                  </label>
                  <input
                    type="text"
                    required
                    value={newDistrict.districtAr || ''}
                    onChange={(e) => setNewDistrict(prev => ({ ...prev, districtAr: e.target.value }))}
                    placeholder="مثال: القاهرة الجديدة"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    Price / m² (EGP)
                  </label>
                  <input
                    type="number"
                    required
                    value={newDistrict.pricePerSqm || ''}
                    onChange={(e) => setNewDistrict(prev => ({ ...prev, pricePerSqm: Number(e.target.value) }))}
                    placeholder="45000"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '4px' }}>
                    5-Yr Growth Gain
                  </label>
                  <input
                    type="text"
                    value={newDistrict.fiveYearGain || ''}
                    onChange={(e) => setNewDistrict(prev => ({ ...prev, fiveYearGain: e.target.value }))}
                    placeholder="+65.0%"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: '9px', borderRadius: '8px', background: '#E5B869', color: '#0A0C10', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {isAr ? 'إضافة' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}

            {/* Table Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {settings.marketDistricts.map((dist) => {
                return (
                  <div
                    key={dist.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                      <button
                        type="button"
                        onClick={() => toggleDistrictEnabled(dist.id)}
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: dist.isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: dist.isEnabled ? '#34D399' : 'rgba(255, 255, 255, 0.4)',
                          border: dist.isEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer'
                        }}
                      >
                        {dist.isEnabled ? (isAr ? 'نشط بالرادار' : 'Active') : (isAr ? 'مخفي' : 'Hidden')}
                      </button>

                      <div>
                        <strong style={{ fontSize: '13px', color: '#FFFFFF', display: 'block' }}>
                          {isAr ? dist.districtAr : dist.district}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {isAr ? dist.district : dist.districtAr}
                        </span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Price/m²:</span>
                        <input
                          type="number"
                          value={dist.pricePerSqm}
                          onChange={(e) => updateDistrict(dist.id, { pricePerSqm: Number(e.target.value) })}
                          style={{
                            width: '90px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#E5B869',
                            fontWeight: 700,
                            fontSize: '12px',
                            textAlign: 'right'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#E5B869' }}>EGP</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>5-Yr:</span>
                        <input
                          type="text"
                          value={dist.fiveYearGain}
                          onChange={(e) => updateDistrict(dist.id, { fiveYearGain: e.target.value })}
                          style={{
                            width: '75px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#34D399',
                            fontWeight: 700,
                            fontSize: '12px',
                            textAlign: 'center'
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteDistrict(dist.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(244, 63, 94, 0.6)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 2: Public Advisory Desk & Contact Info ─── */}
      {activeTab === 'contact' && (
        <div style={{
          background: 'rgba(16, 20, 29, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#E5B869', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {isAr ? 'أرقام وبيانات التواصل المعتمدة للمكتب' : 'Public Contact & Advisory Desk Details'}
              </h2>
              <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)' }}>
                {isAr ? 'تعديل الهاتف المباشر، البريد الإلكتروني، رقم الواتساب، وعنوان المقر' : 'Shown across website header, footer, property detail cards, and direct contact CTAs.'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Direct Phone Number */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                <Phone size={13} style={{ color: '#E5B869' }} />
                <span>{isAr ? 'رقم الهاتف المباشر (Hotline / Direct Phone)' : 'Direct Phone Hotline'}</span>
              </label>
              <input 
                type="text" 
                value={settings.contact?.phone || ''} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  contact: { ...(prev.contact || DEFAULT_PLATFORM_SETTINGS.contact), phone: e.target.value }
                }))}
                placeholder="+20 2 19688"
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                {isAr ? 'يظهر في تذييل الموقع، صفحة الاتصال، ومربعات طلب الاتصال' : 'Shown in website footer, contact page, and direct call CTAs'}
              </span>
            </div>

            {/* Official Concierge Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                <Mail size={13} style={{ color: '#E5B869' }} />
                <span>{isAr ? 'البريد الإلكتروني الرسمي (Official Email)' : 'Official Advisory Email'}</span>
              </label>
              <input 
                type="email" 
                value={settings.contact?.email || ''} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  contact: { ...(prev.contact || DEFAULT_PLATFORM_SETTINGS.contact), email: e.target.value }
                }))}
                placeholder="concierge@zakariafarid.com"
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                {isAr ? 'يستقبل استفسارات العملاء ويظهر في تذييل الموقع' : 'Used for official correspondence and inquiry channels'}
              </span>
            </div>

            {/* WhatsApp VIP Desk Number */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                <MessageCircle size={13} style={{ color: '#34D399' }} />
                <span>{isAr ? 'رقم الواتساب المعتمد (WhatsApp Concierge)' : 'WhatsApp Desk Number'}</span>
              </label>
              <input 
                type="text" 
                value={settings.contact?.whatsapp || ''} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  contact: { ...(prev.contact || DEFAULT_PLATFORM_SETTINGS.contact), whatsapp: e.target.value }
                }))}
                placeholder="+20 100 999 8888"
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                {isAr ? 'يستخدم لروابط المحادثة المشفرة وزر الواتساب السريع' : 'Powers encrypted chat links and floating WhatsApp concierge'}
              </span>
            </div>

            {/* Office Address (English) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                <MapPin size={13} style={{ color: '#E5B869' }} />
                <span>{isAr ? 'عنوان المقر الرئيسي (إنجليزي)' : 'Headquarters Address (English)'}</span>
              </label>
              <input 
                type="text" 
                value={settings.contact?.addressEn || ''} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  contact: { ...(prev.contact || DEFAULT_PLATFORM_SETTINGS.contact), addressEn: e.target.value }
                }))}
                placeholder="G-08 Grand Tower, Financial District, New Cairo, Egypt"
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Office Address (Arabic) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                <MapPin size={13} style={{ color: '#E5B869' }} />
                <span>{isAr ? 'عنوان المقر الرئيسي (عربي)' : 'Headquarters Address (Arabic)'}</span>
              </label>
              <input 
                type="text" 
                value={settings.contact?.addressAr || ''} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  contact: { ...(prev.contact || DEFAULT_PLATFORM_SETTINGS.contact), addressAr: e.target.value }
                }))}
                placeholder="برج جراند G-08، الحي المالي، محور التسعين الجنوبي، القاهرة الجديدة، مصر"
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

          </div>
        </div>
      )}

      {/* ─── TAB 3: WhatsApp Lead Dispatch & Automation ─── */}
      {activeTab === 'whatsapp' && (
        <div style={{
          background: 'rgba(16, 20, 29, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} />
              </div>
              <div>
                <h2 style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {isAr ? 'محرك إرسال إشعارات الواتساب الفورية (WhatsApp Lead Dispatch)' : 'WhatsApp Automated Lead Dispatch Engine'}
                </h2>
                <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)' }}>
                  {isAr ? 'إرسال تفاصيل العميل فورياً إلى هاتف فريد زكريا بمجرد إرسال أي طلب' : 'Instantly dispatches structured WhatsApp notifications to Farid Zakaria upon every buyer inquiry.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isTestingDispatch}
              onClick={handleTestWhatsAppDispatch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                fontSize: '12px',
                fontWeight: 700,
                background: 'rgba(229, 184, 105, 0.12)',
                border: '1px solid rgba(229, 184, 105, 0.3)',
                color: '#E5B869',
                cursor: isTestingDispatch ? 'wait' : 'pointer'
              }}
            >
              <Send size={13} />
              <span>{isTestingDispatch ? (isAr ? 'جاري الإرسال التجريبي...' : 'Dispatching...') : (isAr ? 'إرسال إشعار تجريبي' : 'Send Test Notification')}</span>
            </button>
          </div>

          {testDispatchResult && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: testDispatchResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
              border: testDispatchResult.success ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(244, 63, 94, 0.35)',
              color: testDispatchResult.success ? '#34D399' : '#FB7185',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {testDispatchResult.success ? <Check size={15} /> : <ShieldAlert size={15} />}
              <span>{testDispatchResult.message}</span>
            </div>
          )}

          {/* Toggle Card */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '14px 18px',
            background: 'rgba(229, 184, 105, 0.05)',
            border: '1px solid rgba(229, 184, 105, 0.2)',
            borderRadius: '12px',
            cursor: 'pointer'
          }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#FFFFFF', display: 'block' }}>
                {isAr ? 'تفعيل الإرسال التلقائي الفوري لطلبات العملاء' : 'Enable Automatic Real-Time Lead Dispatch'}
              </strong>
              <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '2px', display: 'block' }}>
                {isAr ? 'عند وصول أي طلب جديد يتم إرسال رسالة واتساب منسقة فوراً إلى رقم زكريا فريد' : 'Automatically triggers a WhatsApp notification upon every lead submission'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.whatsappAutomation?.isEnabled ?? true}
              onChange={(e) => {
                const next = {
                  ...settings,
                  whatsappAutomation: {
                    ...(settings.whatsappAutomation || DEFAULT_WHATSAPP_AUTOMATION_SETTINGS),
                    isEnabled: e.target.checked
                  }
                };
                setSettings(next);
                saveStoredPlatformSettings(next);
              }}
              style={{ width: '18px', height: '18px', accentColor: '#E5B869', cursor: 'pointer' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Recipient Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                <Phone size={13} style={{ color: '#E5B869' }} />
                <span>{isAr ? 'رقم هاتف زكريا فريد لاستقبال الإشعارات' : 'Farid Zakaria Alert Phone'}</span>
              </label>
              <input
                type="text"
                value={settings.whatsappAutomation?.faridAlertPhone || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatsappAutomation: {
                    ...(prev.whatsappAutomation || DEFAULT_WHATSAPP_AUTOMATION_SETTINGS),
                    faridAlertPhone: e.target.value
                  }
                }))}
                placeholder="+20 100 997 0776"
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Provider Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                <Radio size={13} style={{ color: '#E5B869' }} />
                <span>{isAr ? 'مزود خدمة الأتمتة (API Provider)' : 'Automation Dispatch Provider'}</span>
              </label>
              <select
                value={settings.whatsappAutomation?.provider || 'meta_cloud_api'}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatsappAutomation: {
                    ...(prev.whatsappAutomation || DEFAULT_WHATSAPP_AUTOMATION_SETTINGS),
                    provider: e.target.value as any
                  }
                }))}
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(10, 14, 24, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="meta_cloud_api">{isAr ? 'Meta WhatsApp Cloud API (الرسمي للأعمال)' : 'Meta WhatsApp Cloud API (Official)'}</option>
                <option value="ultramsg">{isAr ? 'UltraMsg / WhatsApp Gateway' : 'UltraMsg Gateway Instance'}</option>
                <option value="twilio">{isAr ? 'Twilio WhatsApp API' : 'Twilio for WhatsApp'}</option>
                <option value="custom_webhook">{isAr ? 'Webhook مخصص (Make / Zapier / Telegram)' : 'Custom Webhook (Make / Zapier / n8n)'}</option>
                <option value="direct_link">{isAr ? 'روابط واتساب مباشرة فقط (يدوي)' : 'Direct WhatsApp Links Only'}</option>
              </select>
            </div>

            {/* Meta Cloud API Parameters */}
            {(!settings.whatsappAutomation?.provider || settings.whatsappAutomation.provider === 'meta_cloud_api') && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                    <Key size={13} style={{ color: '#E5B869' }} />
                    <span>{isAr ? 'معرف رقم الهاتف (Meta Phone Number ID)' : 'Meta Phone Number ID'}</span>
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappAutomation?.metaPhoneNumberId || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsappAutomation: {
                        ...(prev.whatsappAutomation || DEFAULT_WHATSAPP_AUTOMATION_SETTINGS),
                        metaPhoneNumberId: e.target.value
                      }
                    }))}
                    placeholder="e.g. 104829104859102"
                    style={{
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                    <Key size={13} style={{ color: '#E5B869' }} />
                    <span>{isAr ? 'رمز وصول النظام (Meta Access Token)' : 'Meta Permanent Access Token'}</span>
                  </label>
                  <input
                    type="password"
                    value={settings.whatsappAutomation?.metaAccessToken || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsappAutomation: {
                        ...(prev.whatsappAutomation || DEFAULT_WHATSAPP_AUTOMATION_SETTINGS),
                        metaAccessToken: e.target.value
                      }
                    }))}
                    placeholder="EAA..."
                    style={{
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ─── TAB 4: About Page Editorial & Heritage CMS ─── */}
      {activeTab === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Section Visibility Toggles Card */}
          <div style={{
            background: 'rgba(16, 20, 29, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(229, 184, 105, 0.12)', color: '#E5B869', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {isAr ? 'خيارات ظهور أقسام صفحة من نحن' : 'About Page Section Display Toggles'}
                  </h2>
                  <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)' }}>
                    {isAr ? 'تفعيل أو إخفاء أي من الأقسام الرئيسية لصفحة العلامة التجارية' : 'Toggle individual sections of the public About page on or off.'}
                  </span>
                </div>
              </div>

              <Link
                href={`/${adminLocale}/about`}
                target="_blank"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#E5B869',
                  textDecoration: 'none'
                }}
              >
                <span>{isAr ? 'معاينة الصفحة الحية' : 'Preview About Page'}</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {[
                { key: 'showHero', labelEn: 'Hero Headline & Coordinates', labelAr: 'الترويسة الرئيسية والإحداثيات' },
                { key: 'showManifesto', labelEn: 'Advisory Manifesto Statement', labelAr: 'بيان الرؤية والمنهجية الاستشارية' },
                { key: 'showMonograph', labelEn: 'Founder Monograph & Quote', labelAr: 'كلمة المؤسس ومونوجراف العمارة' },
                { key: 'showBadges', labelEn: 'Heritage Badges & Coordinates', labelAr: 'شارات العراقة والريادة الجغرافية' },
                { key: 'showStats', labelEn: 'Key Advisory Statistics Bar', labelAr: 'شريط الإحصائيات والأرقام القياسية' },
                { key: 'showClosingCta', labelEn: 'Confidential Acquisition Desk CTA', labelAr: 'قسم دعوة التواصل السري النهائي' },
              ].map((item) => {
                const isEnabled = settings.about ? settings.about[item.key as keyof PlatformAboutSettings] as boolean : true;
                return (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '12.5px', color: '#FFFFFF', fontWeight: 600 }}>
                      {isAr ? item.labelAr : item.labelEn}
                    </span>
                    <input
                      type="checkbox"
                      checked={isEnabled ?? true}
                      onChange={(e) => handleToggleAboutSection(item.key as keyof PlatformAboutSettings, e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: '#E5B869', cursor: 'pointer' }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Heritage Badges & Titles Card */}
          <div style={{
            background: 'rgba(16, 20, 29, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              {isAr ? '١. شارات العراقة وعناوين الترويسة' : '1. Heritage Badges & Hero Titles'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>Heritage Badge (English)</label>
                <input
                  type="text"
                  value={settings.about?.badgeEn || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), badgeEn: e.target.value }
                  }))}
                  style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>شارة العراقة (عربي)</label>
                <input
                  type="text"
                  value={settings.about?.badgeAr || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), badgeAr: e.target.value }
                  }))}
                  style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12.5px' }}
                />
              </div>
            </div>
          </div>

          {/* Sovereign Manifesto Statement */}
          <div style={{
            background: 'rgba(16, 20, 29, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              {isAr ? '٢. بيان الرؤية والمنهجية الاستشارية' : '2. Sovereign Manifesto Statement'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>Manifesto Paragraph (English)</label>
                <textarea
                  rows={4}
                  value={settings.about?.manifestoEn || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), manifestoEn: e.target.value }
                  }))}
                  style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>بيان المنهجية (عربي)</label>
                <textarea
                  rows={4}
                  value={settings.about?.manifestoAr || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), manifestoAr: e.target.value }
                  }))}
                  style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Founder Monograph Quote */}
          <div style={{
            background: 'rgba(16, 20, 29, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              {isAr ? '٣. اقتباس المؤسس ومونوجراف العمارة' : '3. Founder Monograph & Quote'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>Quote (English)</label>
                <textarea
                  rows={3}
                  value={settings.about?.founderQuoteEn || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), founderQuoteEn: e.target.value }
                  }))}
                  style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>اقتباس المؤسس (عربي)</label>
                <textarea
                  rows={3}
                  value={settings.about?.founderQuoteAr || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), founderQuoteAr: e.target.value }
                  }))}
                  style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12.5px' }}
                />
              </div>
            </div>
          </div>

          {/* 4. Metrology & Authority Scale Stats (EN + AR) */}
          <div style={{
            background: 'rgba(16, 20, 29, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px 0' }}>
                {isAr ? '٤. المؤشرات الإحصائية ومصفوفة الأرقام' : '4. Metrology & Authority Scale Stats'}
              </h2>
              <p style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
                {isAr ? 'تحديد الأرقام والقيم الإحصائية باللغتين الإنجليزية والعربية' : 'Configure metric values and labels for English and Arabic displays'}
              </p>
            </div>

            {/* Stat 1 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#E5B869' }}>{isAr ? 'المؤشر الأول (I)' : 'Stat I'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Value (EN)</label>
                  <input
                    type="text"
                    placeholder="2.5B+ EGP"
                    value={settings.about?.stat1Value || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat1Value: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>القيمة (عربي)</label>
                  <input
                    type="text"
                    placeholder="٢.٥+ مليار ج.م"
                    value={settings.about?.stat1ValueAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat1ValueAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Label (EN)</label>
                  <input
                    type="text"
                    placeholder="Curated Asset Volume"
                    value={settings.about?.stat1LabelEn || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat1LabelEn: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>الوصف (عربي)</label>
                  <input
                    type="text"
                    placeholder="حجم المحفظة الاستشارية"
                    value={settings.about?.stat1LabelAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat1LabelAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 2 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#E5B869' }}>{isAr ? 'المؤشر الثاني (II)' : 'Stat II'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Value (EN)</label>
                  <input
                    type="text"
                    placeholder="15+ Districts"
                    value={settings.about?.stat2Value || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat2Value: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>القيمة (عربي)</label>
                  <input
                    type="text"
                    placeholder="+١٥ منطقة"
                    value={settings.about?.stat2ValueAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat2ValueAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Label (EN)</label>
                  <input
                    type="text"
                    placeholder="Prime Egyptian Markets"
                    value={settings.about?.stat2LabelEn || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat2LabelEn: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>الوصف (عربي)</label>
                  <input
                    type="text"
                    placeholder="مناطق استراتيجية"
                    value={settings.about?.stat2LabelAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat2LabelAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 3 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#E5B869' }}>{isAr ? 'المؤشر الثالث (III)' : 'Stat III'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Value (EN)</label>
                  <input
                    type="text"
                    placeholder="98%"
                    value={settings.about?.stat3Value || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat3Value: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>القيمة (عربي)</label>
                  <input
                    type="text"
                    placeholder="٩٨٪"
                    value={settings.about?.stat3ValueAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat3ValueAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Label (EN)</label>
                  <input
                    type="text"
                    placeholder="Client Retention Rate"
                    value={settings.about?.stat3LabelEn || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat3LabelEn: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>الوصف (عربي)</label>
                  <input
                    type="text"
                    placeholder="نسبة رضا واستمرارية العملاء"
                    value={settings.about?.stat3LabelAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat3LabelAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 4 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#E5B869' }}>{isAr ? 'المؤشر الرابع (IV)' : 'Stat IV'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Value (EN)</label>
                  <input
                    type="text"
                    placeholder="10+ Years"
                    value={settings.about?.stat4Value || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat4Value: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>القيمة (عربي)</label>
                  <input
                    type="text"
                    placeholder="+١٠ سنوات"
                    value={settings.about?.stat4ValueAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat4ValueAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Label (EN)</label>
                  <input
                    type="text"
                    placeholder="Bespoke Advisory Heritage"
                    value={settings.about?.stat4LabelEn || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat4LabelEn: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>الوصف (عربي)</label>
                  <input
                    type="text"
                    placeholder="سنوات من الخبرة المعمارية"
                    value={settings.about?.stat4LabelAr || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      about: { ...(prev.about || DEFAULT_ABOUT_SETTINGS), stat4LabelAr: e.target.value }
                    }))}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
