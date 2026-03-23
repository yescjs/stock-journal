import { setRequestLocale, getTranslations } from 'next-intl/server';
import { RiskRewardCalculator } from '@/app/components/tools/RiskRewardCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.pages.rr' });

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

export default async function RiskRewardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools.pages' });

  const relatedTools = [
    { href: '/tools/position-size', title: t('related.psTitle'), description: t('related.psDesc') },
    { href: '/tools/average-down', title: t('related.adTitle'), description: t('related.adDesc') },
  ];

  return (
    <ToolLayout
      title={t('rr.title')}
      description={t('rr.description')}
      relatedTools={relatedTools}
    >
      <RiskRewardCalculator />
    </ToolLayout>
  );
}
