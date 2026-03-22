import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AverageDownCalculator } from '@/app/components/tools/AverageDownCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.pages.ad' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t('jsonLdName'),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0' },
  };

  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDesc'),
      type: 'website',
    },
    other: {
      'script:ld+json': JSON.stringify(jsonLd),
    },
  };
}

export default async function AverageDownPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools.pages' });

  const relatedTools = [
    { href: '/tools/risk-reward', title: t('related.rrTitle'), description: t('related.rrDesc') },
    { href: '/tools/position-size', title: t('related.psTitle'), description: t('related.psDesc') },
  ];

  return (
    <ToolLayout
      title={t('ad.title')}
      description={t('ad.description')}
      relatedTools={relatedTools}
    >
      <AverageDownCalculator />
    </ToolLayout>
  );
}
