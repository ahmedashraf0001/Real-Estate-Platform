import { notFound } from 'next/navigation';
import AdminPropertyForm from '@/components/admin/AdminPropertyForm';

type Props = { params: Promise<{ id: string; adminLocale: string }> };

export default async function EditPropertyPage({ params }: Props) {
  const { id, adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data } = await supabase.from('properties').select('*, property_images(*), property_amenities(*)').eq('id', id).single();
  if (!data) notFound();

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>
        {isAr ? 'تعديل العقار' : 'Edit Property'}
      </h1>
      <AdminPropertyForm property={data} isAr={isAr} />
    </div>
  );
}
