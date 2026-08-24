import React from 'react';
import AdminPlatformSettings from '@/components/admin/AdminPlatformSettings';

interface AdminSettingsPageProps {
  params: Promise<{
    adminLocale: string;
  }>;
}

export async function generateMetadata({ params }: AdminSettingsPageProps) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  return {
    title: isAr ? 'إعدادات المنصة ومؤشر الأسعار' : 'Platform & Market Radar Settings',
  };
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { adminLocale } = await params;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <AdminPlatformSettings adminLocale={adminLocale} />
    </div>
  );
}
