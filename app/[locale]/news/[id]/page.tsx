import React from 'react'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getSupabase } from '@/app/lib/supabaseClient'
import { MarketImpactBadge } from '@/app/components/news/MarketImpactBadge'
import { localizeArticle, type NewsArticle } from '@/app/types/news'

export const revalidate = 3600

async function fetchArticle(id: string): Promise<NewsArticle | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as NewsArticle
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params
  const rawArticle = await fetchArticle(id)
  const t = await getTranslations({ locale, namespace: 'newsDetail' })
  if (!rawArticle) return { title: t('articleNotFound') }
  const article = localizeArticle(rawArticle, locale)
  return {
    title: `${article.title} | StockJournal`,
    description: article.summary ?? undefined,
    openGraph: {
      title: article.title,
      description: article.summary ?? undefined,
      type: 'article',
    },
    alternates: {
      languages: {
        ko: `https://www.xn--9z2ba455hkgc.com/ko/news/${id}`,
        en: `https://www.xn--9z2ba455hkgc.com/en/news/${id}`,
      },
    },
  }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'newsDetail' })
  const tTime = await getTranslations({ locale, namespace: 'news.timeAgo' })
  const rawArticle = await fetchArticle(id)
  if (!rawArticle) notFound()
  const article = localizeArticle(rawArticle, locale)

  // eslint-disable-next-line react-hooks/purity -- server component renders once
  const now = Date.now()
  function timeAgo(dateStr: string): string {
    const diff = now - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return tTime('minutes', { count: mins })
    const hours = Math.floor(mins / 60)
    if (hours < 24) return tTime('hours', { count: hours })
    return tTime('days', { count: Math.floor(hours / 24) })
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-10">
        {/* Back */}
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          {t('backToList')}
        </Link>

        {/* Category + Impact */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-400">
            {t(`categories.${article.category}`)}
          </span>
          <MarketImpactBadge impact={article.market_impact} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold leading-snug mb-3">{article.title}</h1>

        {/* Source + Time */}
        <p className="text-sm text-gray-500 mb-6">
          {article.source_name && <span>{article.source_name} · </span>}
          {timeAgo(article.published_at)}
        </p>

        <hr className="border-white/10 mb-8" />

        {/* Summary */}
        {article.summary && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('keySummary')}</h2>
            <p className="text-gray-200 leading-relaxed">{article.summary}</p>
          </section>
        )}

        {/* Key Points */}
        {article.key_points && article.key_points.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('keyPoints')}</h2>
            <ul className="space-y-2">
              {article.key_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-200">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Market Impact */}
        {article.market_impact && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('marketImpact')}</h2>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
              <MarketImpactBadge impact={article.market_impact} />
              <p className="text-sm text-gray-300">
                {article.market_impact === 'bullish' && t('impactBullish')}
                {article.market_impact === 'bearish' && t('impactBearish')}
                {article.market_impact === 'neutral' && t('impactNeutral')}
              </p>
            </div>
          </section>
        )}

        {/* Source Link */}
        {article.source_url && (
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-colors mb-10"
          >
            <ExternalLink size={14} />
            {t('viewSource')}
          </a>
        )}

        {/* CTA Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 p-6 text-center">
          <p className="text-base font-semibold text-white mb-2">
            {t('ctaTitle')}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {t('ctaDesc')}
          </p>
          <Link
            href="/trade"
            className="inline-flex items-center justify-center px-6 h-12 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
          >
            {t('ctaButton')}
          </Link>
        </div>
      </div>
    </main>
  )
}
