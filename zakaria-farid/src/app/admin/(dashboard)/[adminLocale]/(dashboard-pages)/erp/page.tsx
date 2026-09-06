import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ adminLocale: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function AdminERPPage({ params, searchParams }: Props) {
  const { adminLocale } = await params;
  const sp = searchParams ? await searchParams : {};
  const query = sp.tab ? `?tab=${encodeURIComponent(sp.tab)}` : '';
  redirect(`/fin-os/${adminLocale}${query}`);
}
