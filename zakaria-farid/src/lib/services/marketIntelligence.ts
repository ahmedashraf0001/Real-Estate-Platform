export interface MarketDistrictConfig {
  id: string;
  rank: string;
  district: string;
  districtAr: string;
  subDistrict: string;
  subDistrictAr: string;
  category: string;
  categoryAr: string;
  pricePerSqm: number;
  medianTotal: string;
  medianTotalAr: string;
  fiveYearGain: string;
  historical5Yr: number[];
  insight: string;
  insightAr: string;
  isEnabled: boolean;
}

export interface PlatformContactSettings {
  phone: string;
  email: string;
  whatsapp: string;
  addressEn: string;
  addressAr: string;
}

export interface PlatformWhatsAppAutomationSettings {
  isEnabled: boolean;
  provider: 'meta_cloud_api' | 'ultramsg' | 'twilio' | 'custom_webhook' | 'direct_link';
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaBusinessAccountId?: string;
  ultraMsgInstanceId?: string;
  ultraMsgToken?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  webhookUrl?: string;
  faridAlertPhone: string;
}

export interface PlatformAboutSettings {
  // Section visibility toggles
  showHero?: boolean;
  showMetrology?: boolean;
  showParavent?: boolean;
  showCuration?: boolean;
  showFounder?: boolean;
  showPortal?: boolean;

  // Content fields
  badgeEn: string;
  badgeAr: string;
  heroTitle1En: string;
  heroTitle1Ar: string;
  heroTitle2En: string;
  heroTitle2Ar: string;
  manifestoEn: string;
  manifestoAr: string;
  stat1Value: string;
  stat1ValueAr?: string;
  stat1LabelEn: string;
  stat1LabelAr: string;
  stat2Value: string;
  stat2ValueAr?: string;
  stat2LabelEn: string;
  stat2LabelAr: string;
  stat3Value: string;
  stat3ValueAr?: string;
  stat3LabelEn: string;
  stat3LabelAr: string;
  stat4Value: string;
  stat4ValueAr?: string;
  stat4LabelEn: string;
  stat4LabelAr: string;
  founderNameEn: string;
  founderNameAr: string;
  founderTitleEn: string;
  founderTitleAr: string;
  founderQuoteEn: string;
  founderQuoteAr: string;
}

export interface PlatformDisplaySettings {
  showMarketRadar: boolean;
  showVIPAlerts: boolean;
  showFloorPlans: boolean;
  showCommuteTimes: boolean;
  contact: PlatformContactSettings;
  whatsappAutomation?: PlatformWhatsAppAutomationSettings;
  about?: PlatformAboutSettings;
  marketDistricts: MarketDistrictConfig[];
}

export const DEFAULT_ABOUT_SETTINGS: PlatformAboutSettings = {
  showHero: true,
  showMetrology: true,
  showParavent: true,
  showCuration: true,
  showFounder: true,
  showPortal: true,

  badgeEn: 'EST. 2016 • GREATER CAIRO • RED SEA • NORTH COAST',
  badgeAr: 'تأسست ٢٠١٦ • القاهرة الكبرى • البحر الأحمر • الساحل الشمالي',
  heroTitle1En: 'Curating Egypt’s',
  heroTitle1Ar: 'ريادة التميز في',
  heroTitle2En: 'Premier Living & Estates',
  heroTitle2Ar: 'السوق العقاري الراقي',
  manifestoEn: 'We do not merely broker real estate transactions; we curate architectural legacies. AL ZAKARIA is dedicated to providing bespoke advisory, rigorous verification, and securing Egypt’s most exclusive residential and trophy investment opportunities.',
  manifestoAr: 'نحن لا نُبرم مجرد معاملات عقارية، بل نُمثّل أعلى معايير الجودة والشفافية. يلتزم مكتب زكريا فريد بتقديم الاستشارات المتخصصة وتدقيق وتأمين أفضل الفرص السكنية والاستثمارية في مصر.',
  stat1Value: '2.5B+ EGP',
  stat1ValueAr: '٢.٥+ مليار ج.م',
  stat1LabelEn: 'Curated Asset Volume',
  stat1LabelAr: 'حجم المحفظة الاستشارية',
  stat2Value: '15+ Districts',
  stat2ValueAr: '+١٥ منطقة',
  stat2LabelEn: 'Prime Egyptian Markets',
  stat2LabelAr: 'مناطق استراتيجية',
  stat3Value: '98%',
  stat3ValueAr: '٩٨٪',
  stat3LabelEn: 'Client Retention Rate',
  stat3LabelAr: 'نسبة رضا واستمرارية العملاء',
  stat4Value: '10+ Years',
  stat4ValueAr: '+١٠ سنوات',
  stat4LabelEn: 'Bespoke Advisory Heritage',
  stat4LabelAr: 'سنوات من الخبرة المعمارية',
  founderNameEn: 'Eng. Farid Zakaria',
  founderNameAr: 'م. فريد زكريا',
  founderTitleEn: 'Founder & Principal Architectural Advisor',
  founderTitleAr: 'المؤسس والمستشار العقاري الرئيسي',
  founderQuoteEn: 'True luxury is never accidental. It is an exacting union of architectural integrity, verified ownership, and long-term liquidity.',
  founderQuoteAr: 'الفخامة الحقيقية ليست وليدة الصدفة، بل هي التقاء دقيق بين الجودة الإنشائية، الملكية القانونية الموثقة، والقيمة الاستثمارية المتنامية.',
};

export const DEFAULT_WHATSAPP_AUTOMATION_SETTINGS: PlatformWhatsAppAutomationSettings = {
  isEnabled: true,
  provider: 'meta_cloud_api',
  metaPhoneNumberId: '',
  metaAccessToken: '',
  ultraMsgInstanceId: '',
  ultraMsgToken: '',
  faridAlertPhone: '+20 100 997 0776',
};

export const DEFAULT_CONTACT_SETTINGS: PlatformContactSettings = {
  phone: '+20 2 19688',
  email: 'concierge@zakariafarid.com',
  whatsapp: '+20 100 999 8888',
  addressEn: 'G-08 Grand Tower, Financial District, South 90th Axis, New Cairo, Egypt',
  addressAr: 'برج جراند G-08، الحي المالي، محور التسعين الجنوبي، القاهرة الجديدة، مصر'
};

export const DEFAULT_MARKET_DISTRICTS: MarketDistrictConfig[] = [
  {
    id: 'north-coast',
    rank: '01',
    district: 'North Coast',
    districtAr: 'الساحل الشمالي',
    subDistrict: 'Ras El Hekma & Sidi Heneish',
    subDistrictAr: 'رأس الحكمة وسيدي حنيش',
    category: 'Ultra-Prime Coastal',
    categoryAr: 'واجهة ساحلية فائقة الفخامة',
    pricePerSqm: 65000,
    medianTotal: '55.0M EGP',
    medianTotalAr: '٥٥.٠ مليون ج.م',
    fiveYearGain: '+103.5%',
    historical5Yr: [32, 38, 45, 54, 65],
    insight: 'Driven by Ras El Hekma sovereign master developments.',
    insightAr: 'مدعوم بالتطوير السيادي العالمي لمنطقة رأس الحكمة.',
    isEnabled: true
  },
  {
    id: 'el-gouna',
    rank: '02',
    district: 'El Gouna',
    districtAr: 'الجونة',
    subDistrict: 'Red Sea Riviera Lagoon Estates',
    subDistrictAr: 'قصور وبحيرات البحر الأحمر',
    category: 'Resort Estates',
    categoryAr: 'منتجعات سكنية راقية',
    pricePerSqm: 58000,
    medianTotal: '36.5M EGP',
    medianTotalAr: '٣٦.٥ مليون ج.م',
    fiveYearGain: '+88.2%',
    historical5Yr: [28, 34, 41, 49, 58],
    insight: 'High euro-denominated yield with steady European demand.',
    insightAr: 'عوائد استثمارية قوية مع استقرار الطلب الدولي.',
    isEnabled: true
  },
  {
    id: 'new-cairo',
    rank: '03',
    district: 'New Cairo',
    districtAr: 'القاهرة الجديدة',
    subDistrict: 'Golden Square & Diplomatic Gate',
    subDistrictAr: 'المربع الذهبي والحي الدبلوماسي',
    category: 'Sovereign Metro',
    categoryAr: 'متروبوليتان راقي',
    pricePerSqm: 42000,
    medianTotal: '42.5M EGP',
    medianTotalAr: '٤٢.٥ مليون ج.م',
    fiveYearGain: '+74.0%',
    historical5Yr: [22, 26, 31, 36, 42],
    insight: 'Supported by diplomatic delegations and corporate HQs.',
    insightAr: 'مدعوم بالبعثات الدبلوماسية ومقرات الشركات العالمية.',
    isEnabled: true
  },
  {
    id: 'sheikh-zayed',
    rank: '04',
    district: 'Sheikh Zayed',
    districtAr: 'الشيخ زايد',
    subDistrict: 'West Cairo Belt & New Zayed',
    subDistrictAr: 'حزام غرب القاهرة وزايد الجديدة',
    category: 'Prime Suburban',
    categoryAr: 'ضواحي سكنية متميزة',
    pricePerSqm: 39000,
    medianTotal: '29.0M EGP',
    medianTotalAr: '٢٩.٠ مليون ج.م',
    fiveYearGain: '+62.5%',
    historical5Yr: [20, 24, 28, 33, 39],
    insight: 'High family estate demand near elite school clusters.',
    insightAr: 'طلب مرتفع على القصور العائلية والمجتمعات المغلقة.',
    isEnabled: true
  },
  {
    id: 'ain-sokhna',
    rank: '05',
    district: 'Ain Sokhna',
    districtAr: 'العين السخنة',
    subDistrict: 'Galala Plateau & Marina',
    subDistrictAr: 'هضبة الجلالة والمارينا',
    category: 'Seaside Retreat',
    categoryAr: 'منتجع ساحلي قريب',
    pricePerSqm: 34000,
    medianTotal: '28.0M EGP',
    medianTotalAr: '٢٨.٠ مليون ج.م',
    fiveYearGain: '+54.8%',
    historical5Yr: [18, 21, 25, 29, 34],
    insight: 'Direct expressway connectivity driving weekend liquidity.',
    insightAr: 'ربط مباشر بالمحاور السريعة يرفع الجاذبية الاستثمارية.',
    isEnabled: false
  }
];

export const DEFAULT_PLATFORM_SETTINGS: PlatformDisplaySettings = {
  showMarketRadar: true,
  showVIPAlerts: true,
  showFloorPlans: true,
  showCommuteTimes: true,
  contact: DEFAULT_CONTACT_SETTINGS,
  whatsappAutomation: DEFAULT_WHATSAPP_AUTOMATION_SETTINGS,
  about: DEFAULT_ABOUT_SETTINGS,
  marketDistricts: DEFAULT_MARKET_DISTRICTS
};

const SETTINGS_STORAGE_KEY = 'zakaria_farid_platform_settings_v1';

export function getStoredPlatformSettings(): PlatformDisplaySettings {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...parsed,
        contact: {
          ...DEFAULT_CONTACT_SETTINGS,
          ...(parsed.contact || {})
        },
        whatsappAutomation: {
          ...DEFAULT_WHATSAPP_AUTOMATION_SETTINGS,
          ...(parsed.whatsappAutomation || {})
        },
        about: {
          ...DEFAULT_ABOUT_SETTINGS,
          ...(parsed.about || {})
        },
        marketDistricts: parsed.marketDistricts || DEFAULT_MARKET_DISTRICTS
      };
    }
  } catch (e) {
    console.warn('Error reading platform settings', e);
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

export function saveStoredPlatformSettings(settings: PlatformDisplaySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('zf_platform_settings_updated'));
  } catch (e) {
    console.warn('Error saving platform settings', e);
  }
}

