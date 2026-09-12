import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Script from 'next/script';
import '@/app/globals.css';
import { Toaster } from 'sonner';
import { Agentation } from 'agentation';

export const metadata: Metadata = {
  title: {
    template: '%s | Al Zakaria Admin',
    default: 'Executive Command Center | Al Zakaria Luxury Estates',
  },
  description: 'Al Zakaria Real Estate Private Portfolio Management & Command Suite.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('zf_theme')?.value;
  const initialTheme = (themeCookie === 'light' || themeCookie === 'dark') ? themeCookie : 'dark';

  return (
    <html lang="en" data-theme={initialTheme} suppressHydrationWarning>
      <head>
        <Script
          id="admin-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function() {
  try {
    var cookieMatch = document.cookie.match(/(?:^|;\\s*)zf_theme=([^;]*)/);
    var cookieTheme = cookieMatch ? cookieMatch[1] : null;
    var saved = localStorage.getItem('zf_theme') || cookieTheme;
    var theme = (saved === 'light' || saved === 'dark') ? saved : '${initialTheme}';
    document.documentElement.setAttribute('data-theme', theme);
    if (saved && (!cookieTheme || cookieTheme !== theme)) {
      document.cookie = 'zf_theme=' + theme + '; path=/; max-age=31536000; SameSite=Lax';
    }
  } catch(e) {
    document.documentElement.setAttribute('data-theme', '${initialTheme}');
  }
})();`,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', background: 'var(--admin-canvas-bg, var(--bg-primary, #080A0F))', color: 'var(--admin-text-title, var(--text-primary, #FFFFFF))', fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        {children}
        <Toaster position="top-left" dir="auto" richColors />
        {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_AGENTATION === 'true') && <Agentation />}
      </body>
    </html>
  );
}
