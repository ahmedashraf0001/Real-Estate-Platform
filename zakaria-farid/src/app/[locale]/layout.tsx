import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import '@/app/globals.css';
import { routing } from '@/i18n/routing';
import { LenisProvider } from '@/components/LenisProvider';
import { ClientAppShell } from '@/components/ClientAppShell';
import { FavoritesProvider } from '@/lib/context/FavoritesContext';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Agentation } from 'agentation';

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
    title: locale === 'ar' ? 'آل زكريا للعقارات الفاخرة' : 'AL ZAKARIA Real Estate',
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
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('zf_theme')?.value;
  const initialTheme = (themeCookie === 'light' || themeCookie === 'dark') ? themeCookie : 'dark';

  return (
    <html lang={locale} dir={dir} data-theme={initialTheme} suppressHydrationWarning>
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function() {
  try {
    var cookieMatch = document.cookie.match(/(?:^|;\\s*)zf_theme=([^;]*)/);
    var cookieTheme = cookieMatch ? cookieMatch[1] : null;
    var saved = localStorage.getItem('zf_theme') || cookieTheme;
    var theme = (saved === 'light' || saved === 'dark') ? saved : '${initialTheme}';
    document.documentElement.setAttribute('data-theme', theme);
    if (saved && (!cookieTheme || cookieTheme !== theme)) {
      document.cookie = 'zf_theme=' + theme + '; path=/; max-age=31536000; SameSite=Lax';
    }
  } catch(e) {
    document.documentElement.setAttribute('data-theme', '${initialTheme}');
  }
})();`,
          }}
        />
        {process.env.NODE_ENV === 'production' && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "5f67cf7227994033ada6c4fa8498d0a2"}'
            strategy="afterInteractive"
          />
        )}
        <NextIntlClientProvider messages={messages}>
          <FavoritesProvider>
            <LenisProvider locale={locale}>
              <ClientAppShell locale={locale}>
                {children}
              </ClientAppShell>
            </LenisProvider>
          </FavoritesProvider>
          <Toaster
            position="bottom-right"
            theme="system"
            gap={10}
            toastOptions={{
              duration: 4000,
            }}
          />
        </NextIntlClientProvider>
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
