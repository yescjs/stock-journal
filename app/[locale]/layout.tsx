import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Analytics } from '@vercel/analytics/next';
import { SharedTopNav } from '../components/ui/SharedTopNav';
import { AppBottomNav } from '../components/ui/AppBottomNav';
import { fontVariables } from '../fonts';
import type { Locale } from '@/i18n/config';

// Generate static params for all locales
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return {
    title: 'Stock Journal',
    description: t('appDescription'),
    icons: { icon: '/favicon.ico' },
    alternates: {
      languages: {
        ko: 'https://www.xn--9z2ba455hkgc.com/ko',
        en: 'https://www.xn--9z2ba455hkgc.com/en',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} dir="ltr" className={`${fontVariables} dark`} suppressHydrationWarning>
      <body className="antialiased tracking-tight bg-background text-foreground min-h-screen" style={{ colorScheme: 'dark' }}>
        <NextIntlClientProvider messages={messages}>
          <SharedTopNav />
          {children}
          <AppBottomNav />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
