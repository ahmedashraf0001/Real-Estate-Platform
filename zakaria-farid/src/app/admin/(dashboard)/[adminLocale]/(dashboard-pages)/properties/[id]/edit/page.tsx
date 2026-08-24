import { notFound } from 'next/navigation';
import AdminPropertyForm from '@/components/admin/AdminPropertyForm';

type Props = { params: Promise<{ id: string; adminLocale: string }> };

export async function generateMetadata({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  return {
    title: isAr ? 'تعديل بيانات العقار' : 'Edit Property',
  };
}

export default async function EditPropertyPage({ params }: Props) {
  const { id, adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data } = await supabase.from('properties').select('*, property_images(*), property_amenities(*)').eq('id', id).single();
  if (!data) notFound();

  return (
    <div style={{ width: '100%' }}>
      <AdminPropertyForm property={data} isAr={isAr} />
    </div>
  );
}
