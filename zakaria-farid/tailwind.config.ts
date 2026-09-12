export interface TailwindConfig {
  content: string[];
  darkMode?: string | string[];
  theme?: {
    extend?: Record<string, unknown>;
  };
  plugins?: unknown[];
  [key: string]: unknown;
}

const config: TailwindConfig = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ─── Executive Alabaster / Warm Architectural Canvas ───
        alabaster: {
          50: '#FCFAF7',
          100: '#F7F4EE',
          200: '#F4F1EA',
          300: '#EAE6DC',
          400: '#DDD7C9',
          500: '#C8BFAC',
          DEFAULT: '#F7F4EE',
        },
        // ─── Deep Obsidian / Charcoal Hierarchy ───
        charcoal: {
          void: '#0A0C10',
          surface: '#11141B',
          card: '#16171C',
          dark: '#0D1117',
          hover: '#1E2028',
          DEFAULT: '#0F172A',
        },
        // ─── Deep Emerald / Architectural Green ───
        emerald: {
          deep: '#1E4D3D',
          dark: '#153A2E',
          accent: '#286B55',
          wash: 'rgba(5, 150, 105, 0.08)',
          border: 'rgba(5, 150, 105, 0.25)',
          DEFAULT: '#1E4D3D',
        },
        // ─── Egyptian & Andalusian Gold System ───
        gold: {
          primary: '#E5B869',
          light: '#FFF0C2',
          dark: '#946f23',
          andalusian: '#C5A059',
          border: 'rgba(229, 184, 105, 0.28)',
          glow: 'rgba(229, 184, 105, 0.25)',
          wash: 'rgba(148, 111, 35, 0.08)',
          DEFAULT: '#C9A96A',
        },
        // ─── Semantic Accounting States (Matte & Restrained) ───
        status: {
          open: '#0369a1',
          pending: '#b45309',
          paid: '#15803d',
          partial: '#946f23',
          defaulted: '#b91c1c',
          superseded: '#64748b',
          void: '#475569',
          locked: '#92400e',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', 'sans-serif'],
        body: ['var(--font-body)', 'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', 'sans-serif'],
        serif: ['var(--font-serif)', 'ThmanyahSerifDisplay', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '14px',
        panel: '20px',
      },
      boxShadow: {
        alabaster: '0 2px 8px rgba(30, 24, 16, 0.05), 0 10px 28px rgba(30, 24, 16, 0.07)',
        gold: '0 8px 30px rgba(229, 184, 105, 0.22)',
        glass: '0 20px 48px rgba(0, 0, 0, 0.38), inset 0 1.5px 2px rgba(255, 255, 255, 0.65)',
      },
    },
  },
  plugins: [],
};

export default config;
