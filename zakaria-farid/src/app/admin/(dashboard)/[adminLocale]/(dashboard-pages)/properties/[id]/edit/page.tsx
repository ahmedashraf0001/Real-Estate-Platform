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
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
          {isAr ? 'تعديل العقار' : 'Edit Property'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'rgba(255, 255, 255, 0.65)', fontSize: '13.5px' }}>
          {isAr 
            ? 'تعديل بيانات العقار والوسائط والمخططات الهندسية ومواصفات التشطيب' 
            : 'Update architectural specifications, CAD blueprints, and engineering trade layers.'}
        </p>
      </div>
      <AdminPropertyForm property={data} isAr={isAr} />
    </div>
  );
}
