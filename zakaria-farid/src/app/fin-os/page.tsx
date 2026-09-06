import { redirect } from 'next/navigation';

interface Props {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function FinOSRootPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const query = sp.tab ? `?tab=${encodeURIComponent(sp.tab)}` : '';
  redirect(`/fin-os/ar${query}`);
}
