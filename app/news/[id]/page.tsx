import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { getSupabase } from '@/app/lib/supabaseClient'
import { MarketImpactBadge } from '@/app/components/news/MarketImpactBadge'
import type { NewsArticle, NewsCategory } from '@/app/types/news'

export const revalidate = 3600

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  stock:      '📈 주식',
  forex:      '💱 외환',
  realestate: '🏢 부동산',
  crypto:     '₿ 코인',
  indicator:  '📊 경제지표',
  global:     '🌐 해외주식',
}

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const article = await fetchArticle(id)
  if (!article) return { title: '기사를 찾을 수 없습니다' }
  return {
    title: `${article.title} | StockJournal`,
    description: article.summary ?? undefined,
    openGraph: {
      title: article.title,
      description: article.summary ?? undefined,
      type: 'article',
    },
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await fetchArticle(id)
  if (!article) notFound()

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-10">
        {/* Back */}
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          뉴스 목록으로
        </Link>

        {/* Category + Impact */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-400">
            {CATEGORY_LABELS[article.category]}
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">핵심 요약</h2>
            <p className="text-gray-200 leading-relaxed">{article.summary}</p>
          </section>
        )}

        {/* Key Points */}
        {article.key_points && article.key_points.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">핵심 포인트</h2>
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">시장 영향</h2>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
              <MarketImpactBadge impact={article.market_impact} />
              <p className="text-sm text-gray-300">
                {article.market_impact === 'bullish' && '이 뉴스는 시장에 긍정적인 영향을 미칠 것으로 분석됩니다.'}
                {article.market_impact === 'bearish' && '이 뉴스는 시장에 부정적인 영향을 미칠 것으로 분석됩니다.'}
                {article.market_impact === 'neutral' && '이 뉴스는 시장에 중립적인 영향을 미칠 것으로 분석됩니다.'}
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
            원문 보기
          </a>
        )}

        {/* CTA Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 p-6 text-center">
          <p className="text-base font-semibold text-white mb-2">
            이 뉴스가 내 포트폴리오에 미치는 영향을 기록해보세요
          </p>
          <p className="text-sm text-gray-400 mb-5">
            매매 일지를 작성하고 AI 분석으로 투자 패턴을 파악하세요
          </p>
          <Link
            href="/trade"
            className="inline-flex items-center justify-center px-6 h-12 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
          >
            주식 일지 작성하기
          </Link>
        </div>
      </div>
    </main>
  )
}
