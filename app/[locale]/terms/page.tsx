import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Footer } from '@/app/components/Footer'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.terms' });
  return { title: t('pageTitle') };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal.terms' });

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">{t('heading')}</h1>

        <div className="space-y-8 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article1Title')}</h2>
            <p>{t('article1Content')}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article2Title')}</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('article2Item1')}</li>
              <li>{t('article2Item2')}</li>
              <li>{t('article2Item3')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article3Title')}</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('article3Item1')}</li>
              <li>{t('article3Item2')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article4Title')}</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('article4Item1')}</li>
              <li>{t('article4Item2')}</li>
              <li>{t('article4Item3')}</li>
              <li>{t('article4Item4')}</li>
              <li>{t('article4Item5')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article5Title')}</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('article5Item1')}</li>
              <li>{t('article5Item2')}</li>
              <li>{t('article5Item3')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article6Title')}</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('article6Item1')}</li>
              <li>{t('article6Item2')}</li>
              <li>{t('article6Item3')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article7Title')}</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('article7Item1')}</li>
              <li>{t('article7Item2')}</li>
              <li>{t('article7Item3')}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">{t('article8Title')}</h2>
            <p>{t('article8Content')}</p>
          </section>

          <p className="text-white/30 pt-4">{t('effectiveDate')}</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
