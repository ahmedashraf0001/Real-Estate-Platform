import { redirect } from 'next/navigation';
export default async function PageContentPage({params}:{params:Promise<{adminLocale:string}>}) {
  const {adminLocale}=await params;
  redirect(`/admin/${adminLocale}/settings?group=about`);
}
