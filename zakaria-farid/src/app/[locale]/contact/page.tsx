import { getTranslations } from 'next-intl/server';
import { ContactView } from '@/components/contact/ContactView';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return {
    title: locale === 'ar' ? 'اتصل بنا | زكريا فريد' : 'Executive Concierge | Zakaria Farid',
    description: 'Contact Zakaria Farid directly for private viewings and luxury property inquiries in Egypt.',
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  return <ContactView locale={locale} />;
}
