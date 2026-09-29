import React from 'react';
import { ERPWorkstationProvider } from '@/components/admin/erp/context/ERPWorkstationContext';
import { ERPWorkstationShell } from '@/components/admin/erp/ERPWorkstationShell';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function FinOSLocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  return (
    <ERPWorkstationProvider locale={locale}>
      <ERPWorkstationShell>
        {children}
      </ERPWorkstationShell>
    </ERPWorkstationProvider>
  );
}
