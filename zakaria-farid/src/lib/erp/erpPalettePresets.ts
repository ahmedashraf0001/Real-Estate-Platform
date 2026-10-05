export interface ERPPalettePreset {
  id: string;
  nameEn: string;
  nameAr: string;
  accent: string;       // Maps to --erp-accent
  hover: string;        // Maps to --erp-accent-hover
  subtle: string;       // Maps to --erp-accent-subtle
  tint: string;         // Maps to --erp-accent-tint
  border: string;        // accent at 25% alpha, light mode
  onAccent: string;      // text color on a solid accent background, light mode
  chartPrimary: string; // Used for ApexCharts primary series
  contrastRatio: string;
  dark: { accent: string; hover: string; subtle: string; tint: string; border: string; onAccent: string };
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
    border: 'rgba(37, 99, 235, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#2563eb',
    contrastRatio: '5.17:1',
    dark: {
      accent: '#3b82f6',
      hover: '#60a5fa',
      subtle: 'rgba(59, 130, 246, 0.18)',
      tint: 'rgba(59, 130, 246, 0.10)',
      border: 'rgba(59, 130, 246, 0.35)',
      onAccent: '#ffffff',
    },
  },
  {
    id: 'executive_gold',
    nameEn: 'Executive Gold',
    nameAr: 'الذهبي التنفيذي',
    accent: '#946f23',
    hover: '#7c5c1b',
    subtle: '#fdf8ee',
    tint: 'rgba(148, 111, 35, 0.08)',
    border: 'rgba(148, 111, 35, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#b48c36',
    contrastRatio: '4.61:1',
    dark: {
      accent: '#c9a24a',
      hover: '#ddb965',
      subtle: 'rgba(201, 162, 74, 0.18)',
      tint: 'rgba(201, 162, 74, 0.10)',
      border: 'rgba(201, 162, 74, 0.35)',
      onAccent: '#1a1405',
    },
  },
  {
    id: 'midnight_navy',
    nameEn: 'Midnight Navy',
    nameAr: 'الكحلي الداكن',
    accent: '#1e3a8a',
    hover: '#172554',
    subtle: '#f0f4f8',
    tint: 'rgba(30, 58, 138, 0.08)',
    border: 'rgba(30, 58, 138, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#1e3a8a',
    contrastRatio: '10.36:1',
    dark: {
      accent: '#6d8fd8',
      hover: '#8eaae6',
      subtle: 'rgba(109, 143, 216, 0.18)',
      tint: 'rgba(109, 143, 216, 0.10)',
      border: 'rgba(109, 143, 216, 0.35)',
      onAccent: '#0b1220',
    },
  },
  {
    id: 'steel_slate',
    nameEn: 'Institutional Slate',
    nameAr: 'الرمادي الفولاذي',
    accent: '#334155',
    hover: '#1e293b',
    subtle: '#f1f5f9',
    tint: 'rgba(51, 65, 85, 0.08)',
    border: 'rgba(51, 65, 85, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#334155',
    contrastRatio: '10.35:1',
    dark: {
      accent: '#94a3b8',
      hover: '#cbd5e1',
      subtle: 'rgba(148, 163, 184, 0.18)',
      tint: 'rgba(148, 163, 184, 0.10)',
      border: 'rgba(148, 163, 184, 0.35)',
      onAccent: '#0f172a',
    },
  },
  {
    id: 'deep_emerald',
    nameEn: 'Deep Teal',
    nameAr: 'الزمردي التيل',
    accent: '#0f766e',
    hover: '#115e59',
    subtle: '#f0fdfa',
    tint: 'rgba(15, 118, 110, 0.08)',
    border: 'rgba(15, 118, 110, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#0f766e',
    contrastRatio: '5.47:1',
    dark: {
      accent: '#2dd4bf',
      hover: '#5eead4',
      subtle: 'rgba(45, 212, 191, 0.16)',
      tint: 'rgba(45, 212, 191, 0.10)',
      border: 'rgba(45, 212, 191, 0.35)',
      onAccent: '#042f2e',
    },
  },
  {
    id: 'sovereign_indigo',
    nameEn: 'Sovereign Indigo',
    nameAr: 'النيلي الوقور',
    accent: '#4338ca',
    hover: '#3730a3',
    subtle: '#eef2ff',
    tint: 'rgba(67, 56, 202, 0.08)',
    border: 'rgba(67, 56, 202, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#4338ca',
    contrastRatio: '7.90:1',
    dark: {
      accent: '#818cf8',
      hover: '#a5b4fc',
      subtle: 'rgba(129, 140, 248, 0.18)',
      tint: 'rgba(129, 140, 248, 0.10)',
      border: 'rgba(129, 140, 248, 0.35)',
      onAccent: '#1e1b4b',
    },
  },
  {
    id: 'deep_bordeaux',
    nameEn: 'Deep Bordeaux',
    nameAr: 'الخمري الرصين',
    accent: '#991b1b',
    hover: '#7f1d1d',
    subtle: '#fef2f2',
    tint: 'rgba(153, 27, 27, 0.08)',
    border: 'rgba(153, 27, 27, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#991b1b',
    contrastRatio: '8.31:1',
    dark: {
      accent: '#e0707a',
      hover: '#ec959c',
      subtle: 'rgba(224, 112, 122, 0.18)',
      tint: 'rgba(224, 112, 122, 0.10)',
      border: 'rgba(224, 112, 122, 0.35)',
      onAccent: '#2a0a0d',
    },
  },
  {
    id: 'obsidian_charcoal',
    nameEn: 'Obsidian Charcoal',
    nameAr: 'الفحمي الأوبسيديان',
    accent: '#18181b',
    hover: '#09090b',
    subtle: '#f4f4f5',
    tint: 'rgba(24, 24, 27, 0.08)',
    border: 'rgba(24, 24, 27, 0.25)',
    onAccent: '#ffffff',
    chartPrimary: '#18181b',
    contrastRatio: '17.50:1',
    dark: {
      accent: '#e4e4e7',
      hover: '#ffffff',
      subtle: 'rgba(228, 228, 231, 0.14)',
      tint: 'rgba(228, 228, 231, 0.08)',
      border: 'rgba(228, 228, 231, 0.30)',
      onAccent: '#18181b',
    },
  },
];

export const DEFAULT_PALETTE_PRESET = ERP_PALETTE_PRESETS[0];

export const FIN_OS_PALETTE_STORAGE_KEY = 'fin_os_accent_preset_v1';

export function getPresetById(id: string): ERPPalettePreset {
  if (id === 'corporate_bronze') {
    return ERP_PALETTE_PRESETS.find(p => p.id === 'executive_gold') || ERP_PALETTE_PRESETS[0]; // maps legacy corporate_bronze to executive_gold
  }
  return ERP_PALETTE_PRESETS.find(p => p.id === id) || DEFAULT_PALETTE_PRESET;
}
