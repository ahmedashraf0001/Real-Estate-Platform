import { getAllPropertiesAdmin } from '@/lib/supabase/queries';
import PropertiesAdminClient from '@/components/admin/PropertiesAdminClient';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  return {
    title: isAr ? 'محفظة العقارات الفاخرة' : 'Properties Portfolio',
  };
}

export default async function AdminPropertiesPage({ params }: Props) {
  const { adminLocale } = await params;
  const properties = await getAllPropertiesAdmin().catch(() => []);

  return <PropertiesAdminClient initialProperties={properties} adminLocale={adminLocale} />;
}
