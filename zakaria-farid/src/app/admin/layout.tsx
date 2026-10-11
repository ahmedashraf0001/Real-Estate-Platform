import type { Metadata } from 'next';
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <Script
          id="admin-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme', 'light');`,
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
