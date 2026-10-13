import AdminPageContent from '@/components/admin/AdminPageContent';
import { getSiteContent } from '@/lib/siteContent/server';

export default async function PageContentPage({ params }: { params: Promise<{ adminLocale: string }> }) {
  const { adminLocale } = await params;
  const initialContent = await getSiteContent('about_page');
  return <AdminPageContent adminLocale={adminLocale} initialContent={initialContent} />;
}
