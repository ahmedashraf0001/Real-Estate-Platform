import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '@/app/globals.css';
import { routing } from '@/i18n/routing';
import TopLoaderBar from '@/components/layout/TopLoaderBar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import Script from 'next/script';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });
  return {
    metadataBase: new URL(baseUrl),
    title: 'Zakaria Farid Real Estate',
    description: t('subheadline'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        ar: '/ar',
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'ar')) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {process.env.NODE_ENV === 'production' && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "5f67cf7227994033ada6c4fa8498d0a2"}'
            strategy="afterInteractive"
          />
        )}
        <NextIntlClientProvider messages={messages}>
          <TopLoaderBar />
          <Header locale={locale} />
          <main>{children}</main>
          <ConditionalFooter locale={locale} />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: 'var(--font-sans)',
                borderRadius: 'var(--radius-md)',
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
