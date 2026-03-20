import React from 'react'
import { Newspaper } from 'lucide-react'
import { getSupabase } from '@/app/lib/supabaseClient'
import { CategoryTabs } from '@/app/components/news/CategoryTabs'
import type { NewsArticle } from '@/app/types/news'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '경제 뉴스 | StockJournal',
  description: '투자에 도움되는 최신 경제 분석 — 주식, 외환, 부동산, 코인, 경제지표, 해외주식',
}

async function fetchArticles(): Promise<NewsArticle[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .order('published_at', { ascending: false })
  if (error) {
    console.error('뉴스 조회 오류:', error)
    return []
  }
  return (data ?? []) as NewsArticle[]
}

export default async function NewsPage() {
  const articles = await fetchArticles()

  return (
    <main className="min-h-screen bg-[#070a12] text-white pt-14 pb-16 md:pb-0">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Newspaper size={20} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">경제 뉴스</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">투자에 도움되는 최신 경제 분석</p>

        {/* Category Tabs + Grid */}
        <CategoryTabs allArticles={articles} />
      </div>
    </main>
  )
}
