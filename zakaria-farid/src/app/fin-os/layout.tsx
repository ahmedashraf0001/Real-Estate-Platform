import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import '@/app/globals.css';
import { Toaster } from 'sonner';

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
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
