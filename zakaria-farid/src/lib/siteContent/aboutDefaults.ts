import type { PlatformAboutSettings } from '@/lib/services/marketIntelligence';

export type BilingualText = { ar: string; en: string };
export type AboutStat = { value: BilingualText; label: BilingualText };
export type AboutChapter = { year: BilingualText; tag: BilingualText; title: BilingualText; subtitle: BilingualText; narrative: BilingualText; metrics: AboutStat[] };
export type CharterStage = { title: BilingualText; description: BilingualText; accept: BilingualText[]; reject: BilingualText[] };
type EditorialKey = Exclude<keyof PlatformAboutSettings, `stat${string}` | `chap${string}` | `pillar${string}`>;
export type AboutPageContent = Required<Pick<PlatformAboutSettings, EditorialKey>> & {
  coordinates: BilingualText; imageAlt: BilingualText; chapterLabel: BilingualText;
  founderEst: BilingualText; portalCatalog: BilingualText;
  acceptLabel: BilingualText; rejectLabel: BilingualText; reportPrompt: BilingualText; reportLink: BilingualText;
  stats: AboutStat[]; chapters: AboutChapter[]; stages: CharterStage[];
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
  chap2NarrativeEn: 'As Greater Cairo expanded eastward and westward, AL ZAKARIA rejected developer offerings that failed acoustic attenuation, freehold documentation, or long-term liquidity benchmarks.',
  chap2NarrativeAr: 'مع التوسع العمراني شرقاً وغرباً، رفضنا المشاريع التي لا ترقى لمواصفات العزل الصوتي والإنشائي وسندات الملكية الحرة الموثقة.',

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

const editorial = Object.fromEntries(Object.entries(DEFAULT_ABOUT_SETTINGS).filter(([key]) => !/^(stat|chap|pillar)/.test(key))) as Required<Pick<PlatformAboutSettings, EditorialKey>>;
export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  ...editorial,
  curationDescAr: 'كل عقار يمر بثلاث مراحل فحص قبل أن يظهر في دليلنا. إن تعثّر في واحدة، لا يُدرج.',
  curationDescEn: 'Every property passes three inspection stages before it appears in our directory. If it fails one, it is not listed.',
  coordinates: {
  "ar": "٢٩.٩٨٧٠° شمالاً، ٣١.٤٢٨٥° شرقاً • القاهرة • رأس الحكمة • البحر الأحمر",
  "en": "29.9870° N, 31.4285° E • CAIRO • RAS EL HEKMA • RED SEA"
},
  imageAlt: {
  "ar": "المكتب المعماري لزكريا فريد",
  "en": "AL ZAKARIA Architectural Atelier"
},
  chapterLabel: {
  "ar": "المحطة",
  "en": "CHAPTER"
},
  founderEst: {
  "ar": "تأسست ٢٠١٦ • القاهرة",
  "en": "EST. 2016 • CAIRO"
},
  portalCatalog: {
  "ar": "استعراض الدليل الحصري",
  "en": "Explore Sovereign Directory"
},
  acceptLabel: {
  "ar": "نقبل",
  "en": "Accept"
},
  rejectLabel: {
  "ar": "نستبعد",
  "en": "Exclude"
},
  reportPrompt: {
  "ar": "تريد تقرير الفحص لعقار معين؟",
  "en": "Want the inspection report for a particular property?"
},
  reportLink: {
  "ar": "اطلب تقرير الفحص",
  "en": "Request an inspection report"
},
  stats: [
  {
    "value": {
      "ar": "٢.٥+ مليار ج.م",
      "en": "2.5B+ EGP"
    },
    "label": {
      "ar": "حجم المحفظة الاستشارية",
      "en": "Curated Asset Volume"
    }
  },
  {
    "value": {
      "ar": "+١٥ منطقة",
      "en": "15+ Districts"
    },
    "label": {
      "ar": "مناطق استراتيجية",
      "en": "Prime Egyptian Markets"
    }
  },
  {
    "value": {
      "ar": "٩٨٪",
      "en": "98%"
    },
    "label": {
      "ar": "نسبة رضا واستمرارية العملاء",
      "en": "Client Retention Rate"
    }
  },
  {
    "value": {
      "ar": "+١٠ سنوات",
      "en": "10+ Years"
    },
    "label": {
      "ar": "سنوات من الخبرة المعمارية",
      "en": "Bespoke Advisory Heritage"
    }
  }
],
  chapters: [
  {
    "year": {
      "ar": "2016",
      "en": "2016"
    },
    "tag": {
      "ar": "التأسيس وميثاق الاستشارات",
      "en": "GENESIS & ADVISORY CHARTER"
    },
    "title": {
      "ar": "تأسيس المكتب الاستشاري المعماري الأول",
      "en": "Founding the Architectural Advisory Desk"
    },
    "subtitle": {
      "ar": "إعادة تعريف الاستشارات العقارية بإنهاء عصر السمسرة العشوائية وتكريس الفحص الهندسي والتدقيق القانوني المستقل.",
      "en": "Challenging speculative brokerage through structural due diligence and legal title forensic audits."
    },
    "narrative": {
      "ar": "انطلقت مسيرتنا في القاهرة كمكتب استشاري خاص بقيادة المهندس فريد زكريا، برؤية واضحة: العقارات الفاخرة في مصر تستحق معايير هندسية صارمة وتدقيقاً قانونياً شاملاً يحمي استثمارات العائلات ورواد الأعمال.",
      "en": "Established in Cairo as a private practice under Eng. Farid Zakaria, our charter was born out of an uncompromising conviction: luxury real estate in Egypt demanded engineering precision, not marketing hyperbole."
    },
    "metrics": [
      {
        "value": {
          "ar": "100%",
          "en": "100%"
        },
        "label": {
          "ar": "مخططات مدققة",
          "en": "CAD Title Verified"
        }
      },
      {
        "value": {
          "ar": "0",
          "en": "0"
        },
        "label": {
          "ar": "نزاعات قانونية",
          "en": "Compromised Titles"
        }
      },
      {
        "value": {
          "ar": "12",
          "en": "12"
        },
        "label": {
          "ar": "عقارات تأسيسية",
          "en": "Founding Estates"
        }
      }
    ]
  },
  {
    "year": {
      "ar": "2019",
      "en": "2019"
    },
    "tag": {
      "ar": "التوسع المؤسسي في العواصم",
      "en": "INSTITUTIONAL METROPOLIS"
    },
    "title": {
      "ar": "التوسع في المحاور والمجتمعات العمرانية الراقية",
      "en": "Expansion into Sovereign Urban Corridors"
    },
    "subtitle": {
      "ar": "انتقاء الصروح السكنية في المربع الذهبي بالقاهرة الجديدة وحزام غرب القاهرة بالشيخ زايد.",
      "en": "Curating flagship architectural statements across New Cairo Golden Square and Sheikh Zayed West Belt."
    },
    "narrative": {
      "ar": "مع التوسع العمراني شرقاً وغرباً، رفضنا المشاريع التي لا ترقى لمواصفات العزل الصوتي والإنشائي وسندات الملكية الحرة الموثقة.",
      "en": "As Greater Cairo expanded eastward and westward, AL ZAKARIA rejected developer offerings that failed acoustic attenuation, freehold documentation, or long-term liquidity benchmarks."
    },
    "metrics": [
      {
        "value": {
          "ar": "",
          "en": ""
        },
        "label": {
          "ar": "نسبة الاستبعاد",
          "en": "Market Disqualification"
        }
      },
      {
        "value": {
          "ar": "1.2B",
          "en": "1.2B"
        },
        "label": {
          "ar": "حجم التدقيق",
          "en": "EGP Portfolio Curated"
        }
      },
      {
        "value": {
          "ar": "98.5%",
          "en": "98.5%"
        },
        "label": {
          "ar": "استمرارية العملاء",
          "en": "Retention Rate"
        }
      }
    ]
  },
  {
    "year": {
      "ar": "2022",
      "en": "2022"
    },
    "tag": {
      "ar": "بروتوكول التحليل المعماري الرقمي",
      "en": "DIGITAL LAYER CAD PROTOCOL"
    },
    "title": {
      "ar": "إطلاق منظومة التحليل الطبقي والمخططات التفاعلية",
      "en": "Proprietary Layering & CAD Due Diligence"
    },
    "subtitle": {
      "ar": "تطوير تقنيات فحص المساقط الأفقية، مسارات الإضاءة الطبيعية، ونماذج التقييم الرأسمالي الحقيقي.",
      "en": "Engineering 1:1 blueprint inspectors, zone sun-path orientations, and private capital yield models."
    },
    "narrative": {
      "ar": "أطلقنا أول منصة رقمية متطورة تتيح للمشترين والمستثمرين الدوليين فحص المخططات الإنشائية والمساقط بدقة ١:١ مع تدقيق بيانات السيولة والعائد الاستثماري المتوقع.",
      "en": "Pioneered Egypt’s first interactive Architectural CAD Blueprint Inspector, providing international buyers with exact structural dimensions, load-bearing verification, and verified secondary market yield forecasts."
    },
    "metrics": [
      {
        "value": {
          "ar": "1:1",
          "en": "1:1"
        },
        "label": {
          "ar": "دقة المخططات",
          "en": "CAD Metric Precision"
        }
      },
      {
        "value": {
          "ar": "15+",
          "en": "15+"
        },
        "label": {
          "ar": "مناطق مغطاة",
          "en": "Prime Districts"
        }
      },
      {
        "value": {
          "ar": "< 2hr",
          "en": "< 2hr"
        },
        "label": {
          "ar": "سرعة الاستجابة",
          "en": "Concierge SLA"
        }
      }
    ]
  },
  {
    "year": {
      "ar": "2025–2026",
      "en": "2025–2026"
    },
    "tag": {
      "ar": "الريادة والآفاق المستقبلية",
      "en": "THE SOVEREIGN HORIZON"
    },
    "title": {
      "ar": "تغطية الساحل الشمالي ورأس الحكمة والبحر الأحمر",
      "en": "Mediterranean Riviera & Ultra-Prime Frontiers"
    },
    "subtitle": {
      "ar": "توجيه الاستثمارات الخاصة نحو قصور رأس الحكمة، سيدي حنيش، وبحيرات الجونة الساحرة.",
      "en": "Directing private capital into Ras El Hekma, Sidi Heneish, and Red Sea lagoon trophy estates."
    },
    "narrative": {
      "ar": "اليوم، يُمثل مكتب زكريا فريد المرجع الأول لنخبة العملاء والمستثمرين، موفراً استشارات سرية واستحواذات آمنة على أرقى القصور والفيلات في أبرز الوجهات السياحية والاستثمارية في مصر.",
      "en": "Today, the atelier represents Egypt’s most discerning patrons, orchestrating confidential acquisitions of waterfront villas and generational trophy assets with absolute legal sovereignty and enduring architectural prestige."
    },
    "metrics": [
      {
        "value": {
          "ar": "2.5B+",
          "en": "2.5B+"
        },
        "label": {
          "ar": "حجم المحفظة",
          "en": "EGP Asset Volume"
        }
      },
      {
        "value": {
          "ar": "10+",
          "en": "10+"
        },
        "label": {
          "ar": "سنوات من الريادة",
          "en": "Years Experience"
        }
      },
      {
        "value": {
          "ar": "100%",
          "en": "100%"
        },
        "label": {
          "ar": "ملكية حرة مؤكدة",
          "en": "Freehold Assured"
        }
      }
    ]
  }
],
  stages: [
  {
    "title": {
      "ar": "الفحص الإنشائي والمعماري",
      "en": "Structural & Architectural Inspection"
    },
    "description": {
      "ar": "تدقيق دقيق لجودة الخرسانة والمساقط والعزل",
      "en": "Verify structural quality, layouts and insulation."
    },
    "accept": [
      {
        "ar": "مساقط مطابقة للمواصفات",
        "en": "Layouts conforming to specifications"
      },
      {
        "ar": "عزل حراري ومائي معتمد",
        "en": "Certified thermal and waterproof insulation"
      },
      {
        "ar": "نسب تحميل وخامات سليمة",
        "en": "Sound structural loads and materials"
      }
    ],
    "reject": [
      {
        "ar": "عيوب بناء أو تشطيب",
        "en": "Construction or finishing defects"
      },
      {
        "ar": "تسريب أو ضعف في العزل",
        "en": "Leaks or inadequate insulation"
      }
    ]
  },
  {
    "title": {
      "ar": "التوثيق القانوني والملكية",
      "en": "Legal Documentation & Ownership"
    },
    "description": {
      "ar": "ضمان خلو العقار من النزاعات وصحة التسجيل",
      "en": "Verify registered ownership and clear legal status."
    },
    "accept": [
      {
        "ar": "ملكية مسجلة واضحة",
        "en": "Clear registered ownership"
      },
      {
        "ar": "تراخيص بناء سارية",
        "en": "Valid building permits"
      },
      {
        "ar": "خلو من الرهونات والنزاعات",
        "en": "Free of mortgages and disputes"
      }
    ],
    "reject": [
      {
        "ar": "سندات غامضة أو ناقصة",
        "en": "Ambiguous or incomplete deeds"
      },
      {
        "ar": "مخالفات بلدية معلقة",
        "en": "Unresolved municipal violations"
      }
    ]
  },
  {
    "title": {
      "ar": "الخصوصية والقيمة",
      "en": "Privacy & Value"
    },
    "description": {
      "ar": "تقييم الخصوصية والسعر وفق بيانات السوق",
      "en": "Assess privacy and pricing against market evidence."
    },
    "accept": [
      {
        "ar": "إطلالة وخصوصية غير مجروحة",
        "en": "Unobstructed views and intact privacy"
      },
      {
        "ar": "سعر متسق مع السوق",
        "en": "Pricing consistent with the market"
      }
    ],
    "reject": [
      {
        "ar": "خصوصية منتهكة",
        "en": "Compromised privacy"
      },
      {
        "ar": "أسعار مبالغ فيها",
        "en": "Inflated prices"
      }
    ]
  }
],
};
