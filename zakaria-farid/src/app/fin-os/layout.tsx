import type { Metadata } from 'next';
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

export default function FinOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body style={{ margin: 0, padding: 0, height: '100vh', width: '100vw', overflow: 'hidden', background: '#07080b', fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
