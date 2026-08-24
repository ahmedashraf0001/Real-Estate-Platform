import type { Metadata } from 'next';
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
    <html lang="en" data-theme="dark">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', background: '#080A0F', fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        {children}
        <Toaster position="top-right" richColors />
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
