export interface ERPPalettePreset {
  id: string;
  nameEn: string;
  nameAr: string;
  accent: string;       // Maps to --erp-accent
  hover: string;        // Maps to --erp-accent-hover
  subtle: string;       // Maps to --erp-accent-subtle
  tint: string;         // Maps to --erp-accent-tint
  chartPrimary: string; // Used for ApexCharts primary series
  contrastRatio: string;
}

export const ERP_PALETTE_PRESETS: ERPPalettePreset[] = [
  {
    id: 'royal_blue',
    nameEn: 'Royal Blue',
    nameAr: 'الأزرق الملكي (الافتراضي)',
    accent: '#2563eb',
    hover: '#1d4ed8',
    subtle: '#eff6ff',
    tint: 'rgba(37, 99, 235, 0.08)',
    chartPrimary: '#2563eb',
    contrastRatio: '5.17:1',
  },
  {
    id: 'midnight_navy',
    nameEn: 'Midnight Navy',
    nameAr: 'الكحلي الداكن',
    accent: '#1e3a8a',
    hover: '#172554',
    subtle: '#f0f4f8',
    tint: 'rgba(30, 58, 138, 0.08)',
    chartPrimary: '#1e3a8a',
    contrastRatio: '10.36:1',
  },
  {
    id: 'steel_slate',
    nameEn: 'Institutional Slate',
    nameAr: 'الرمادي الفولاذي',
    accent: '#334155',
    hover: '#1e293b',
    subtle: '#f1f5f9',
    tint: 'rgba(51, 65, 85, 0.08)',
    chartPrimary: '#334155',
    contrastRatio: '10.35:1',
  },
  {
    id: 'deep_emerald',
    nameEn: 'Deep Teal',
    nameAr: 'الزمردي التيل',
    accent: '#0f766e',
    hover: '#115e59',
    subtle: '#f0fdfa',
    tint: 'rgba(15, 118, 110, 0.08)',
    chartPrimary: '#0f766e',
    contrastRatio: '5.47:1',
  },
  {
    id: 'sovereign_indigo',
    nameEn: 'Sovereign Indigo',
    nameAr: 'النيلي الوقور',
    accent: '#4338ca',
    hover: '#3730a3',
    subtle: '#eef2ff',
    tint: 'rgba(67, 56, 202, 0.08)',
    chartPrimary: '#4338ca',
    contrastRatio: '7.90:1',
  },
  {
    id: 'deep_bordeaux',
    nameEn: 'Deep Bordeaux',
    nameAr: 'الخمري الرصين',
    accent: '#991b1b',
    hover: '#7f1d1d',
    subtle: '#fef2f2',
    tint: 'rgba(153, 27, 27, 0.08)',
    chartPrimary: '#991b1b',
    contrastRatio: '8.31:1',
  },
  {
    id: 'corporate_bronze',
    nameEn: 'Warm Bronze',
    nameAr: 'البرونزي المكتبي',
    accent: '#854d0e',
    hover: '#713f12',
    subtle: '#fefce8',
    tint: 'rgba(133, 77, 14, 0.08)',
    chartPrimary: '#854d0e',
    contrastRatio: '6.85:1',
  },
  {
    id: 'obsidian_charcoal',
    nameEn: 'Obsidian Charcoal',
    nameAr: 'الفحمي الأوبسيديان',
    accent: '#18181b',
    hover: '#09090b',
    subtle: '#f4f4f5',
    tint: 'rgba(24, 24, 27, 0.08)',
    chartPrimary: '#18181b',
    contrastRatio: '17.50:1',
  },
];

export const DEFAULT_PALETTE_PRESET = ERP_PALETTE_PRESETS[0];

export const FIN_OS_PALETTE_STORAGE_KEY = 'fin_os_accent_preset_v1';

export function getPresetById(id: string): ERPPalettePreset {
  return ERP_PALETTE_PRESETS.find(p => p.id === id) || DEFAULT_PALETTE_PRESET;
}
