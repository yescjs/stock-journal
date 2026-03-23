import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Footer } from '@/app/components/Footer'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });
  return { title: t('pageTitle') };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">{t('heading')}</h1>

        <div className="space-y-8 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section1Title')}</h2>
            <p>{t('section1Intro')}</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>{t('section1Item1')}</li>
              <li>{t('section1Item2')}</li>
              <li>{t('section1Item3')}</li>
              <li>{t('section1Item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section2Title')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('section2Item1')}</li>
              <li>{t('section2Item2')}</li>
              <li>{t('section2Item3')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section3Title')}</h2>
            <p>{t('section3Content')}</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>{t('section3Item1')}</li>
              <li>{t('section3Item2')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section4Title')}</h2>
            <p>{t('section4Content')}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section5Title')}</h2>
            <p>{t('section5Content')}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section6Title')}</h2>
            <p>{t('section6Content')}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('section7Title')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('section7Name')}</li>
              <li>{t('section7Contact')}</li>
            </ul>
          </section>

          <p className="text-white/30 pt-4">{t('effectiveDate')}</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
