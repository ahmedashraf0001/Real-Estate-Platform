import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminERPHub from '@/components/admin/erp/AdminERPHub';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'نظام زكريا فريد المالي والـ ERP (FIN-OS)' : 'ZF FIN-OS v2.4 | Financial Workstation',
  };
}

export default async function FinOSPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && process.env.NODE_ENV !== 'development') {
    redirect('/admin/login');
  }

  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  const initialTab = typeof sp.tab === 'string' ? sp.tab : undefined;

  return <AdminERPHub adminLocale={locale} initialTab={initialTab} />;
}
