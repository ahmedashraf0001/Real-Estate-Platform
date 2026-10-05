import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { AdminMainContent } from '@/components/admin/AdminMainContent';
import { AdminAccentBridge } from '@/components/admin/AdminAccentBridge';
import styles from '../../../admin.module.css';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ adminLocale: string }>;
}

export default async function DashboardGroupLayout({ children, params }: LayoutProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { adminLocale } = await params;
  const dir = adminLocale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className={styles.adminWrapper} dir={dir} data-admin-wrapper="true">
      <AdminAccentBridge />
      <AdminSidebar adminLocale={adminLocale} />
      <AdminMainContent>
        {children}
      </AdminMainContent>
    </div>
  );
}
