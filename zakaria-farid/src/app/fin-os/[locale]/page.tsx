import { redirect } from 'next/navigation';
import { resolveTabRedirect } from '@/lib/erp/routing/tabRedirectMap';
import { CockpitRouteView } from '@/components/admin/erp/views/CockpitRouteView';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'قمرة القيادة والعمليات المالية | FIN-OS' : 'Executive Cockpit | FIN-OS',
  };
}

export default async function FinOSCockpitPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};

  if (sp.tab) {
    const redirectUrl = resolveTabRedirect(locale, sp);
    if (redirectUrl) {
      redirect(redirectUrl);
    }
  }

  return <CockpitRouteView />;
}
