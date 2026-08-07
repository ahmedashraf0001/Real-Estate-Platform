import AdminPropertyForm from '@/components/admin/AdminPropertyForm';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export default async function NewPropertyPage({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>
        {isAr ? 'إضافة عقار جديد' : 'Add New Property'}
      </h1>
      <AdminPropertyForm isAr={isAr} />
    </div>
  );
}
