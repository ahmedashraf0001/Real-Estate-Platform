import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RSVRedirectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') query.set(k, v);
    else if (Array.isArray(v)) v.forEach(item => query.append(k, item));
  }
  const qStr = query.toString();
  redirect(`/fin-os/${locale}/cost-allocation${qStr ? `?${qStr}` : ''}`);
}
