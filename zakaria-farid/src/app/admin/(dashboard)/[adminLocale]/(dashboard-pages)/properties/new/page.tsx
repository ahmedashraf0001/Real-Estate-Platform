import AdminPropertyForm from '@/components/admin/AdminPropertyForm';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export default async function NewPropertyPage({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
          {isAr ? 'إضافة عقار جديد' : 'Add New Property'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'rgba(255, 255, 255, 0.65)', fontSize: '13.5px' }}>
          {isAr 
            ? 'إضافة بيانات العقار والصور والمخططات والمواصفات' 
            : 'Add property details, photos, floor plans, and features to list on the platform.'}
        </p>
      </div>
      <AdminPropertyForm isAr={isAr} />
    </div>
  );
}
