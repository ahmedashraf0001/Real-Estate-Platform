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

export const DEFAULT_ABOUT_SETTINGS: PlatformAboutSettings = {
  showHero: true,
  showMetrology: true,
  showParavent: true,
  showCuration: true,
  showFounder: true,
  showPortal: true,

  // 1. Hero
  badgeEn: 'EST. 2016 • GREATER CAIRO • RED SEA • NORTH COAST',
  badgeAr: 'تأسست ٢٠١٦ • القاهرة الكبرى • البحر الأحمر • الساحل الشمالي',
  heroTitle1En: 'Curating Egypt’s',
  heroTitle1Ar: 'ريادة التميز في',
  heroTitle2En: 'Premier Living & Estates',
  heroTitle2Ar: 'السوق العقاري الراقي',
  manifestoEn: 'We do not merely broker real estate transactions; we curate architectural legacies. AL ZAKARIA is dedicated to providing bespoke advisory, rigorous verification, and securing Egypt’s most exclusive residential and trophy investment opportunities.',
  manifestoAr: 'نحن لا نُبرم مجرد معاملات عقارية، بل نُمثّل أعلى معايير الجودة والشفافية. يلتزم مكتب زكريا فريد بتقديم الاستشارات المتخصصة وتدقيق وتأمين أفضل الفرص السكنية والاستثمارية في مصر.',
  heroCta1TextEn: 'Explore Sovereign Portfolio',
  heroCta1TextAr: 'استعراض الدليل المعماري',
  heroCta2TextEn: 'Private Advisory Desk',
  heroCta2TextAr: 'المكتب الاستشاري الخاص',

  // 2. Metrology
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

  // 3. Paravent Monograph
  paraventEyebrowEn: 'DECADE MONOGRAPH • 2016–2026',
  paraventEyebrowAr: 'سردية العقد الأول • ٢٠١٦ – ٢٠٢٦',
  paraventTitleEn: 'A Decade of Unfolding Mastery',
  paraventTitleAr: 'عقد من الريادة والاستحواذ السيادي',
  paraventDescEn: 'Unfold the four defining chapters that established our private architectural advisory across Egypt’s premier frontiers.',
  paraventDescAr: 'استكشف الفصول الأربعة التي رسخت مكانة زكريا فريد كمرجع هندسي واستشاري أول لمشتري العقارات الفاخرة في مصر.',

  // Chapter 1
  chap1TagEn: 'GENESIS & ADVISORY CHARTER',
  chap1TagAr: 'التأسيس وميثاق الاستشارات',
  chap1TitleEn: 'Founding the Architectural Advisory Desk',
  chap1TitleAr: 'تأسيس المكتب الاستشاري المعماري الأول',
  chap1SubtitleEn: 'Challenging speculative brokerage through structural due diligence and legal title forensic audits.',
  chap1SubtitleAr: 'إعادة تعريف الاستشارات العقارية بإنهاء عصر السمسرة العشوائية وتكريس الفحص الهندسي والتدقيق القانوني المستقل.',
  chap1NarrativeEn: 'Established in Cairo as a private practice under Eng. Farid Zakaria, our charter was born out of an uncompromising conviction: luxury real estate in Egypt demanded engineering precision, not marketing hyperbole.',
  chap1NarrativeAr: 'انطلقت مسيرتنا في القاهرة كمكتب استشاري خاص بقيادة المهندس فريد زكريا، برؤية واضحة: العقارات الفاخرة في مصر تستحق معايير هندسية صارمة وتدقيقاً قانونياً شاملاً يحمي استثمارات العائلات ورواد الأعمال.',

  // Chapter 2
  chap2TagEn: 'INSTITUTIONAL METROPOLIS',
  chap2TagAr: 'التوسع المؤسسي في العواصم',
  chap2TitleEn: 'Expansion into Sovereign Urban Corridors',
  chap2TitleAr: 'التوسع في المحاور والمجتمعات العمرانية الراقية',
  chap2SubtitleEn: 'Curating flagship architectural statements across New Cairo Golden Square and Sheikh Zayed West Belt.',
  chap2SubtitleAr: 'انتقاء الصروح السكنية في المربع الذهبي بالقاهرة الجديدة وحزام غرب القاهرة بالشيخ زايد.',
  chap2NarrativeEn: 'As Greater Cairo expanded eastward and westward, AL ZAKARIA instituted the 70% Exclusion Rule, rejecting hundreds of developer offerings that failed acoustic attenuation, freehold documentation, or long-term liquidity benchmarks.',
  chap2NarrativeAr: 'مع التوسع العمراني شرقاً وغرباً، أرسينا "قاعدة استبعاد الـ ٧٠٪"، رافضين المئات من المشاريع التي لا ترقى لمواصفات العزل الصوتي والإنشائي وسندات الملكية الحرة الموثقة.',

  // Chapter 3
  chap3TagEn: 'DIGITAL LAYER CAD PROTOCOL',
  chap3TagAr: 'بروتوكول التحليل المعماري الرقمي',
  chap3TitleEn: 'Proprietary Layering & CAD Due Diligence',
  chap3TitleAr: 'إطلاق منظومة التحليل الطبقي والمخططات التفاعلية',
  chap3SubtitleEn: 'Engineering 1:1 blueprint inspectors, zone sun-path orientations, and private capital yield models.',
  chap3SubtitleAr: 'تطوير تقنيات فحص المساقط الأفقية، مسارات الإضاءة الطبيعية، ونماذج التقييم الرأسمالي الحقيقي.',
  chap3NarrativeEn: 'Pioneered Egypt’s first interactive Architectural CAD Blueprint Inspector, providing international buyers with exact structural dimensions, load-bearing verification, and verified secondary market yield forecasts.',
  chap3NarrativeAr: 'أطلقنا أول منصة رقمية متطورة تتيح للمشترين والمستثمرين الدوليين فحص المخططات الإنشائية والمساقط بدقة ١:١ مع تدقيق بيانات السيولة والعائد الاستثماري المتوقع.',

  // Chapter 4
  chap4TagEn: 'THE SOVEREIGN HORIZON',
  chap4TagAr: 'الريادة والآفاق المستقبلية',
  chap4TitleEn: 'Mediterranean Riviera & Ultra-Prime Frontiers',
  chap4TitleAr: 'تغطية الساحل الشمالي ورأس الحكمة والبحر الأحمر',
  chap4SubtitleEn: 'Directing private capital into Ras El Hekma, Sidi Heneish, and Red Sea lagoon trophy estates.',
  chap4SubtitleAr: 'توجيه الاستثمارات الخاصة نحو قصور رأس الحكمة، سيدي حنيش، وبحيرات الجونة الساحرة.',
  chap4NarrativeEn: 'Today, the atelier represents Egypt’s most discerning patrons, orchestrating confidential acquisitions of waterfront villas and generational trophy assets with absolute legal sovereignty and enduring architectural prestige.',
  chap4NarrativeAr: 'اليوم، يُمثل مكتب زكريا فريد المرجع الأول لنخبة العملاء والمستثمرين، موفراً استشارات سرية واستحواذات آمنة على أرقى القصور والفيلات في أبرز الوجهات السياحية والاستثمارية في مصر.',

  // 4. Curation Protocol & Pillars
  curationEyebrowEn: 'THE CURATION STANDARD',
  curationEyebrowAr: 'مختبر المعايير الهندسية',
  curationTitleEn: 'The Architectural Due Diligence Protocol',
  curationTitleAr: 'ميثاق الانتقاء والفحص المعماري',
  curationDescEn: 'Every estate in our private directory must pass three forensic inspection protocols before representation.',
  curationDescAr: 'استكشف معايير الفحص الثلاثة التي تحدد قبول أو استبعاد أي عقار من دليلنا الحصري.',

  pillar1TitleEn: 'Forensic Structural & Material Audits',
  pillar1TitleAr: 'الفحص الإنشائي والمعماري',
  pillar1SubtitleEn: 'CAD blueprint verification, structural load integrity, and certified envelopes',
  pillar1SubtitleAr: 'تدقيق دقيق لجودة الخرسانة والمساقط والعزل',
  pillar1DescEn: 'We inspect every property with licensed structural consultants, verifying spatial layouts, moisture barriers, and acoustic attenuation before representation.',
  pillar1DescAr: 'نقوم بفحص كل عقار عبر مهندسين معتمدين للتأكد من سلامة الهيكل الإنشائي وأنظمة العزل وجودة التشطيبات قبل إدراجه.',

  pillar2TitleEn: 'Freehold Title & Legal Cadastral Clearance',
  pillar2TitleAr: 'التوثيق القانوني والملكية الحرة',
  pillar2SubtitleEn: '100% Registered freehold ownership deeds with zero encumbrances',
  pillar2SubtitleAr: 'ضمان خلو العقار من النزاعات وصحة التسجيل',
  pillar2DescEn: 'Comprehensive legal title chain scrutiny, municipal permit ratification, and developer covenant audits to ensure zero legal liability.',
  pillar2DescAr: 'مراجعة تسلسل الملكية وتراخيص البناء وسندات الشهر العقاري لضمان عملية شراء آمنة تماماً بدون أي التزامات معلقة.',

  pillar3TitleEn: 'Capital Valuation & Yield Liquidity',
  pillar3TitleAr: 'دراسة الجدوى والسيولة المالية',
  pillar3SubtitleEn: 'Data-backed price appreciation modeling and rental liquidity',
  pillar3SubtitleAr: 'بيانات حقيقية لمعدلات نمو الأسعار والعائد الإيجاري المتوقع',
  pillar3DescEn: 'We provide discerning patrons with micro-market pricing analyses, historical capital gains forecasting, and secondary market liquidity benchmarks.',
  pillar3DescAr: 'نساعد المشترين على اتخاذ قرارات استثمارية مدروسة من خلال تحليلات دقيقة لحركة الأسعار والسيولة في أرقى مناطق مصر.',

  // 5. Founder Monograph
  founderEyebrowEn: 'FOUNDER’S ARCHITECTURAL MONOGRAPH',
  founderEyebrowAr: 'رسالة ورؤية المؤسس',
  founderNameEn: 'Eng. Farid Zakaria',
  founderNameAr: 'م. فريد زكريا',
  founderTitleEn: 'Founder & Principal Architectural Advisor',
  founderTitleAr: 'المؤسس والمستشار العقاري الرئيسي',
  founderQuoteEn: 'True luxury is never accidental. It is an exacting union of architectural integrity, verified ownership, and long-term liquidity.',
  founderQuoteAr: 'الفخامة الحقيقية ليست وليدة الصدفة، بل هي التقاء دقيق بين الجودة الإنشائية، الملكية القانونية الموثقة، والقيمة الاستثمارية المتنامية.',
  founderStampEn: 'Chartered Architectural Desk',
  founderStampAr: 'مستشار معماري معتمد',

  // 6. Confidential Acquisitions Portal CTA
  portalEyebrowEn: 'CONFIDENTIAL ACQUISITIONS OFFICE',
  portalEyebrowAr: 'المكتب الاستشاري للاستحواذ الخاص',
  portalHeadingEn: 'Own Your Generational Architectural Statement',
  portalHeadingAr: 'امتلك صرحك المعماري للأجيال القادمة',
  portalParagraphEn: 'Connect directly with our Private Assets Director for a bespoke, unreleased portfolio presentation or discrete representation of your exceptional estate.',
  portalParagraphAr: 'تواصل مباشرة مع مدير الأصول الخاصة للحصول على ملفات العقارات الحصرية غير المعلنة أو لتمثيل عقارك الاستثنائي بأعلى درجات السرية.',
  portalCtaBtnEn: 'Request Private Consultation',
  portalCtaBtnAr: 'طلب استشارة شراء خاصة'
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
  home: DEFAULT_HOME_SETTINGS,
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
        home: {
          ...DEFAULT_HOME_SETTINGS,
          ...(parsed.home || {})
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
