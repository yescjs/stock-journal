import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CompoundCalculator } from '@/app/components/tools/CompoundCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.pages.ci' });
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

export default async function CompoundCalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools.pages' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t('ci.jsonLdName'),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0' },
  };

  const relatedTools = [
    { href: '/tools/risk-reward', title: t('related.rrTitle'), description: t('related.rrDesc') },
    { href: '/tools/position-size', title: t('related.psTitle'), description: t('related.psDesc') },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolLayout
        title={t('ci.title')}
        description={t('ci.description')}
        relatedTools={relatedTools}
      >
        <CompoundCalculator />
      </ToolLayout>
    </>
  );
}
