import React from 'react'
import Link from 'next/link'
import { Card } from '@/app/components/ui/Card'
import { MarketImpactBadge } from './MarketImpactBadge'
import type { NewsArticle, NewsCategory } from '@/app/types/news'

const CATEGORY_CONFIG: Record<NewsCategory, { label: string; emoji: string; borderColor: string }> = {
  stock:      { label: '주식',     emoji: '📈', borderColor: 'border-t-blue-500' },
  forex:      { label: '외환',     emoji: '💱', borderColor: 'border-t-green-500' },
  realestate: { label: '부동산',   emoji: '🏢', borderColor: 'border-t-orange-500' },
  crypto:     { label: '코인',     emoji: '₿',  borderColor: 'border-t-purple-500' },
  indicator:  { label: '경제지표', emoji: '📊', borderColor: 'border-t-yellow-500' },
  global:     { label: '해외주식', emoji: '🌐', borderColor: 'border-t-indigo-500' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export function NewsCard({ article }: { article: NewsArticle }) {
  const cat = CATEGORY_CONFIG[article.category]
  return (
    <Link href={`/news/${article.id}`} className="block">
      <Card
        variant="elevated"
        hover={true}
        className={`border-t-2 ${cat.borderColor} p-4 gap-2 h-full`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-400">
            {cat.emoji} {cat.label}
          </span>
          <MarketImpactBadge impact={article.market_impact} />
        </div>
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-xs text-gray-400 line-clamp-1">{article.summary}</p>
        )}
        <p className="text-xs text-gray-600 mt-auto">
          {article.source_name && <span>{article.source_name} · </span>}
          {timeAgo(article.published_at)}
        </p>
      </Card>
    </Link>
  )
}
