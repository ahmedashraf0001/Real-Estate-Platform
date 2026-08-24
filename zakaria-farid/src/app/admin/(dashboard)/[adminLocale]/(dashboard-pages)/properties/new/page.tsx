import AdminPropertyForm from '@/components/admin/AdminPropertyForm';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';
  return {
    title: isAr ? 'إدراج عقار جديد' : 'New Property Listing',
  };
}

export default async function NewPropertyPage({ params }: Props) {
  const { adminLocale } = await params;
  const isAr = adminLocale === 'ar';

  return (
    <div style={{ width: '100%' }}>
      <AdminPropertyForm isAr={isAr} />
    </div>
  );
}
