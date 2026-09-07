import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import '@/app/globals.css';
import { Toaster } from 'sonner';
import { Agentation } from 'agentation';

export const metadata: Metadata = {
  title: {
    template: '%s | ZF FIN-OS',
    default: 'ZF FIN-OS v2.4 | Executive Financial Workstation',
  },
  description: 'Zakaria Farid Real Estate ERP & Financial Operating System Workstation.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function FinOSLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && process.env.NODE_ENV !== 'development') {
    redirect('/admin/login?next=/fin-os');
  }

  return (
    <html lang="ar" dir="rtl" data-theme="light" style={{ height: '100%', overflow: 'hidden' }}>
      <body style={{ margin: 0, padding: 0, height: '100vh', width: '100vw', overflow: 'hidden', background: '#f8f9fa', color: '#0f172a', fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        {children}
        <Toaster
          position="top-center"
          offset={32}
          expand={true}
          dir="auto"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              boxShadow: '0 20px 45px -8px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            },
          }}
        />
        {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_AGENTATION === 'true') && <Agentation />}
      </body>
    </html>
  );
}
