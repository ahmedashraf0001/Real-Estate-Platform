import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import '@/app/globals.css';
import { ZFToaster } from '@/components/admin/erp/v2/common/ZFToaster';
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
    <html 
      lang="ar" 
      dir="rtl" 
      data-theme="light" 
      data-erp-workstation-root="true"
      style={{ height: '100%', width: '100%', overflow: 'hidden', scrollbarGutter: 'auto' }}
    >
      <body 
        data-erp-workstation-root="true"
        style={{ margin: 0, padding: 0, height: '100%', width: '100%', overflow: 'hidden', background: '#f8fafc', color: '#0f172a', fontFamily: "'IBM Plex Sans Arabic', 'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' }}
      >
        {children}
        <ZFToaster />
        {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_AGENTATION === 'true') && <Agentation />}
      </body>
    </html>
  );
}
