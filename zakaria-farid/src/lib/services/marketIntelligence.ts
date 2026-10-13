import { DEFAULT_ABOUT_SETTINGS } from '@/lib/siteContent/aboutDefaults';
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

export interface PlatformHomeSettings {
  // Section display toggles
  showHero?: boolean;
  showStatsRibbon?: boolean;
  showFeaturedGrid?: boolean;
  showMapExplorer?: boolean;
  showSovereignAdvisory?: boolean;
  showSellerConsignment?: boolean;

  // Hero Section Editorial
  heroBadgeEn?: string;
  heroBadgeAr?: string;
  heroTitle1En?: string;
  heroTitle1Ar?: string;
  heroTitle2En?: string;
  heroTitle2Ar?: string;
  heroSubtitleEn?: string;
  heroSubtitleAr?: string;

  // Featured Collection Title
  featuredEyebrowEn?: string;
  featuredEyebrowAr?: string;
  featuredTitle1En?: string;
  featuredTitle1Ar?: string;
  featuredTitle2En?: string;
  featuredTitle2Ar?: string;

  // Seller Consignment CTA
  sellerTitle1En?: string;
  sellerTitle1Ar?: string;
  sellerTitle2En?: string;
  sellerTitle2Ar?: string;
  sellerDescEn?: string;
  sellerDescAr?: string;
}

export interface PlatformAboutSettings {
  // 1. Section visibility toggles
  showHero?: boolean;
  showMetrology?: boolean;
  showParavent?: boolean;
  showCuration?: boolean;
  showFounder?: boolean;
  showPortal?: boolean;

  // 2. Hero Section
  badgeEn?: string;
  badgeAr?: string;
  heroTitle1En?: string;
  heroTitle1Ar?: string;
  heroTitle2En?: string;
  heroTitle2Ar?: string;
  manifestoEn?: string;
  manifestoAr?: string;
  heroCta1TextEn?: string;
  heroCta1TextAr?: string;
  heroCta2TextEn?: string;
  heroCta2TextAr?: string;

  // 3. Metrology Stats (I to IV)
  stat1Value?: string;
  stat1ValueAr?: string;
  stat1LabelEn?: string;
  stat1LabelAr?: string;
  stat2Value?: string;
  stat2ValueAr?: string;
  stat2LabelEn?: string;
  stat2LabelAr?: string;
  stat3Value?: string;
  stat3ValueAr?: string;
  stat3LabelEn?: string;
  stat3LabelAr?: string;
  stat4Value?: string;
  stat4ValueAr?: string;
  stat4LabelEn?: string;
  stat4LabelAr?: string;

  // 4. Paravent Decade Monograph
  paraventEyebrowEn?: string;
  paraventEyebrowAr?: string;
  paraventTitleEn?: string;
  paraventTitleAr?: string;
  paraventDescEn?: string;
  paraventDescAr?: string;
  // Chapter 1 (Genesis)
  chap1TagEn?: string;
  chap1TagAr?: string;
  chap1TitleEn?: string;
  chap1TitleAr?: string;
  chap1SubtitleEn?: string;
  chap1SubtitleAr?: string;
  chap1NarrativeEn?: string;
  chap1NarrativeAr?: string;
  // Chapter 2 (Metropolis)
  chap2TagEn?: string;
  chap2TagAr?: string;
  chap2TitleEn?: string;
  chap2TitleAr?: string;
  chap2SubtitleEn?: string;
  chap2SubtitleAr?: string;
  chap2NarrativeEn?: string;
  chap2NarrativeAr?: string;
  // Chapter 3 (CAD Protocol)
  chap3TagEn?: string;
  chap3TagAr?: string;
  chap3TitleEn?: string;
  chap3TitleAr?: string;
  chap3SubtitleEn?: string;
  chap3SubtitleAr?: string;
  chap3NarrativeEn?: string;
  chap3NarrativeAr?: string;
  // Chapter 4 (Sovereign Horizon)
  chap4TagEn?: string;
  chap4TagAr?: string;
  chap4TitleEn?: string;
  chap4TitleAr?: string;
  chap4SubtitleEn?: string;
  chap4SubtitleAr?: string;
  chap4NarrativeEn?: string;
  chap4NarrativeAr?: string;

  // 5. Curation Protocol & 3 Pillars
  curationEyebrowEn?: string;
  curationEyebrowAr?: string;
  curationTitleEn?: string;
  curationTitleAr?: string;
  curationDescEn?: string;
  curationDescAr?: string;
  // Pillar 1
  pillar1TitleEn?: string;
  pillar1TitleAr?: string;
  pillar1SubtitleEn?: string;
  pillar1SubtitleAr?: string;
  pillar1DescEn?: string;
  pillar1DescAr?: string;
  // Pillar 2
  pillar2TitleEn?: string;
  pillar2TitleAr?: string;
  pillar2SubtitleEn?: string;
  pillar2SubtitleAr?: string;
  pillar2DescEn?: string;
  pillar2DescAr?: string;
  // Pillar 3
  pillar3TitleEn?: string;
  pillar3TitleAr?: string;
  pillar3SubtitleEn?: string;
  pillar3SubtitleAr?: string;
  pillar3DescEn?: string;
  pillar3DescAr?: string;

  // 6. Founder Monograph
  founderEyebrowEn?: string;
  founderEyebrowAr?: string;
  founderQuoteEn?: string;
  founderQuoteAr?: string;
  founderNameEn?: string;
  founderNameAr?: string;
  founderTitleEn?: string;
  founderTitleAr?: string;
  founderStampEn?: string;
  founderStampAr?: string;

  // 7. Confidential Acquisitions Portal CTA
  portalEyebrowEn?: string;
  portalEyebrowAr?: string;
  portalHeadingEn?: string;
  portalHeadingAr?: string;
  portalParagraphEn?: string;
  portalParagraphAr?: string;
  portalCtaBtnEn?: string;
  portalCtaBtnAr?: string;
}

export interface PlatformDisplaySettings {
  showMarketRadar: boolean;
  showVIPAlerts: boolean;
  showFloorPlans: boolean;
  showCommuteTimes: boolean;
  hidePropertyPrices?: boolean;
  contact: PlatformContactSettings;
  whatsappAutomation?: PlatformWhatsAppAutomationSettings;
  home?: PlatformHomeSettings;
  about?: PlatformAboutSettings;
  marketDistricts: MarketDistrictConfig[];
}

export const DEFAULT_HOME_SETTINGS: PlatformHomeSettings = {
  showHero: true,
  showStatsRibbon: true,
  showFeaturedGrid: true,
  showMapExplorer: true,
  showSovereignAdvisory: true,
  showSellerConsignment: true,

  heroBadgeEn: 'CAIRO • NORTH COAST • RED SEA • SHEIKH ZAYED',
  heroBadgeAr: 'القاهرة • الساحل الشمالي • البحر الأحمر • الشيخ زايد',
  heroTitle1En: "Discover Egypt's Premier Residences &",
  heroTitle1Ar: 'استكشف أندر الصروح المعمارية و',
  heroTitle2En: 'Luxury Living & Sovereign Estates',
  heroTitle2Ar: 'القصور الفاخرة في مصر',
  heroSubtitleEn: 'Curating and representing architecturally significant residences, coastal sanctuaries, and prime estates with forensic CAD audits and freehold ownership assurance.',
  heroSubtitleAr: 'ننتقي ونمثل أندر العقارات والقصور الفاخرة التي تجمع بين الهيبة المعمارية، التدقيق الإنشائي الصارم، وسندات الملكية الحرة الموثقة.',

  featuredEyebrowEn: 'CURATED SELECTION • 2026 DIRECTORY',
  featuredEyebrowAr: 'مجموعة منتقاة • دليل ٢٠٢٦',
  featuredTitle1En: 'Featured Architectural ',
  featuredTitle1Ar: 'أحدث الصروح المعمارية و ',
  featuredTitle2En: 'Masterpieces',
  featuredTitle2Ar: 'القصور الاستثنائية',

  sellerTitle1En: 'Looking to List or Consign Your ',
  sellerTitle1Ar: 'هل ترغب في بيع أو تمثيل ',
  sellerTitle2En: 'Generational Estate?',
  sellerTitle2Ar: 'قصرك واستثمارك؟',
  sellerDescEn: 'Entrust your architectural statement to our private placement practice. Reach verified buyers, family offices, and sovereign wealth trustees actively seeking rare trophy assets.',
  sellerDescAr: 'اعرض عقارك عبر مكتب زكريا فريد وتواصل مباشرة مع نخبة المشترين والمستثمرين والمكاتب العائلية الباحثة عن الأصول النادرة بأعلى درجات السرية.'
};

export { DEFAULT_ABOUT_SETTINGS } from '@/lib/siteContent/aboutDefaults';

export const DEFAULT_WHATSAPP_AUTOMATION_SETTINGS: PlatformWhatsAppAutomationSettings = {
  isEnabled: true,
  provider: 'meta_cloud_api',
  metaPhoneNumberId: '',
  metaAccessToken: '',
  ultraMsgInstanceId: '',
  ultraMsgToken: '',
  metaBusinessAccountId: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: '',
  webhookUrl: '',
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
  hidePropertyPrices: false,
  contact: DEFAULT_CONTACT_SETTINGS,
  whatsappAutomation: DEFAULT_WHATSAPP_AUTOMATION_SETTINGS,
  home: DEFAULT_HOME_SETTINGS,
  about: DEFAULT_ABOUT_SETTINGS,
  marketDistricts: DEFAULT_MARKET_DISTRICTS
};
