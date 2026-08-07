'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

interface ConditionalFooterProps {
  locale: string;
}

export default function ConditionalFooter({ locale }: ConditionalFooterProps) {
  const pathname = usePathname();
  
  // Hide footer on full-screen map page
  if (pathname.includes('/map')) {
    return null;
  }

  return <Footer locale={locale} />;
}
