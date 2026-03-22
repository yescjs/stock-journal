import { setRequestLocale, getTranslations } from 'next-intl/server';
import { RiskRewardCalculator } from '@/app/components/tools/RiskRewardCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.pages.rr' });
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDesc'),
      type: 'website',
    },
  };
}

export default async function RiskRewardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools.pages' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t('rr.jsonLdName'),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0' },
  };

  const relatedTools = [
    { href: '/tools/position-size', title: t('related.psTitle'), description: t('related.psDesc') },
    { href: '/tools/average-down', title: t('related.adTitle'), description: t('related.adDesc') },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolLayout
        title={t('rr.title')}
        description={t('rr.description')}
        relatedTools={relatedTools}
      >
        <RiskRewardCalculator />
      </ToolLayout>
    </>
  );
}
