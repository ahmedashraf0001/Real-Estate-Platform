import { getTranslations } from 'next-intl/server';
import { AboutView } from '@/components/about/AboutView';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: locale === 'ar' ? 'عن زكريا فريد | الريادة المعمارية والعقارية' : 'About Zakaria Farid | Sovereign Architectural Heritage',
    description: 'Learn about Zakaria Farid — Egypt\'s premier architectural and luxury real estate acquisitions office.',
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  return <AboutView locale={locale} />;
}
