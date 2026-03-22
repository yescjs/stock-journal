import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PositionSizeCalculator } from '@/app/components/tools/PositionSizeCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.pages.ps' });
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

export default async function PositionSizePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools.pages' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t('ps.jsonLdName'),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0' },
  };

  const relatedTools = [
    { href: '/tools/risk-reward', title: t('related.rrTitle'), description: t('related.rrDesc') },
    { href: '/tools/average-down', title: t('related.adTitle'), description: t('related.adDesc') },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolLayout
        title={t('ps.title')}
        description={t('ps.description')}
        relatedTools={relatedTools}
      >
        <PositionSizeCalculator />
      </ToolLayout>
    </>
  );
}
