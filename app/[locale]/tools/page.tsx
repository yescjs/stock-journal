import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ShieldAlert, Calculator, TrendingUp, Target } from 'lucide-react';
import { ToolCard } from '@/app/components/tools/ToolCard';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools' });
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    openGraph: {
      title: t('pageTitle'),
      description: t('pageDescription'),
      type: 'website',
    },
    alternates: {
      languages: {
        ko: 'https://www.xn--9z2ba455hkgc.com/ko/tools',
        en: 'https://www.xn--9z2ba455hkgc.com/en/tools',
      },
    },
  };
}

export default async function ToolsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools' });

  const tools = [
    {
      href: '/tools/risk-reward',
      title: t('riskReward.title'),
      description: t('riskReward.description'),
      icon: ShieldAlert,
    },
    {
      href: '/tools/average-down',
      title: t('averageDown.title'),
      description: t('averageDown.description'),
      icon: Calculator,
    },
    {
      href: '/tools/compound-calculator',
      title: t('compound.title'),
      description: t('compound.description'),
      icon: TrendingUp,
    },
    {
      href: '/tools/position-size',
      title: t('positionSize.title'),
      description: t('positionSize.description'),
      icon: Target,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
      <div className="mb-10 text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400/70">
          Free Tools
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">
          {t('heading')}
        </h1>
        <p className="text-sm text-white/40">
          {t('subheading')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-2xl border border-white/8 bg-white/3 p-8 text-center">
        <h2 className="mb-2 text-lg font-bold">{t('ctaTitle')}</h2>
        <p className="mb-5 text-sm text-white/40">
          {t('ctaDesc')}
        </p>
        <Link
          href="/trade"
          className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-toss-sm transition-colors hover:bg-primary/90"
        >
          {t('ctaButton')}
        </Link>
      </div>
    </div>
  );
}
