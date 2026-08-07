import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from '../../../admin.module.css';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ adminLocale: string }>;
}

export default async function DashboardGroupLayout({ children, params }: LayoutProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && process.env.NODE_ENV === 'production') {
    redirect('/admin/login');
  }

  const { adminLocale } = await params;
  const dir = adminLocale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className={styles.adminWrapper} dir={dir}>
      <AdminSidebar adminLocale={adminLocale} />
      <div className={styles.adminMain}>
        <div className={styles.adminContainer}>
          {children}
        </div>
      </div>
    </div>
  );
}
