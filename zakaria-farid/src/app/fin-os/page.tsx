import { redirect } from 'next/navigation';
import { resolveTabRedirect } from '@/lib/erp/routing/tabRedirectMap';

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinOSRootPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const redirectUrl = resolveTabRedirect('ar', sp);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') query.set(k, v);
    else if (Array.isArray(v)) v.forEach(item => query.append(k, item));
  }
  const qStr = query.toString();
  redirect(`/fin-os/ar${qStr ? `?${qStr}` : ''}`);
}
