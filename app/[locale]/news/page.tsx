import React from 'react'
import { Newspaper } from 'lucide-react'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getSupabase } from '@/app/lib/supabaseClient'
import { CategoryTabs } from '@/app/components/news/CategoryTabs'
import { localizeArticle, type NewsArticle } from '@/app/types/news'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'news' });
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: {
      languages: {
        ko: 'https://www.xn--9z2ba455hkgc.com/ko/news',
        en: 'https://www.xn--9z2ba455hkgc.com/en/news',
      },
    },
  }
}

async function fetchArticles(): Promise<NewsArticle[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .order('published_at', { ascending: false })
  if (error) {
    console.error('News fetch error:', error)
    return []
  }
  return (data ?? []) as NewsArticle[]
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'news' });
  const rawArticles = await fetchArticles()
  const articles = rawArticles.map(a => localizeArticle(a, locale))

  return (
    <main className="min-h-screen bg-[#070a12] text-white pt-14 pb-16 md:pb-0">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Newspaper size={20} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">{t('heading')}</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">{t('subheading')}</p>

        {/* Category Tabs + Grid */}
        <CategoryTabs allArticles={articles} />
      </div>
    </main>
  )
}
