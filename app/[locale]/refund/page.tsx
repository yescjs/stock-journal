import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Footer } from '@/app/components/Footer'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.refund' });
  return { title: t('pageTitle') };
}

export default async function RefundPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal.refund' });

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">{t('heading')}</h1>
        <div className="space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section1Title')}</h2>
            <p>{t('section1Content')}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section2Title')}</h2>
            <p>{t('section2Content')}</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
