'use client'

import React, { useMemo } from 'react'
import { Link } from '@/i18n/navigation'
import { Card } from '@/app/components/ui/Card'
import { MarketImpactBadge } from './MarketImpactBadge'
import { useTranslations } from 'next-intl'
import type { NewsArticle, NewsCategory } from '@/app/types/news'

const CATEGORY_EMOJI: Record<NewsCategory, string> = {
  stock:      '📈',
  forex:      '💱',
  realestate: '🏢',
  crypto:     '₿',
  indicator:  '📊',
  global:     '🌐',
}

const CATEGORY_BORDER: Record<NewsCategory, string> = {
  stock:      'border-t-blue-500',
  forex:      'border-t-green-500',
  realestate: 'border-t-orange-500',
  crypto:     'border-t-purple-500',
  indicator:  'border-t-yellow-500',
  global:     'border-t-indigo-500',
}

export function NewsCard({ article }: { article: NewsArticle }) {
  const t = useTranslations('news')
  const borderColor = CATEGORY_BORDER[article.category]
  const emoji = CATEGORY_EMOJI[article.category]
  const categoryLabel = t(`categories.${article.category}`)

  const timeAgoText = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- safe inside useMemo, evaluated once at mount
    const diff = Date.now() - new Date(article.published_at).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return t('timeAgo.minutes', { count: mins })
    const hours = Math.floor(mins / 60)
    if (hours < 24) return t('timeAgo.hours', { count: hours })
    return t('timeAgo.days', { count: Math.floor(hours / 24) })
  }, [article.published_at, t])

  return (
    <Link href={`/news/${article.id}`} className="block">
      <Card
        variant="elevated"
        hover={true}
        className={`border-t-2 ${borderColor} p-4 gap-2 h-full`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-400">
            {emoji} {categoryLabel}
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
          {timeAgoText}
        </p>
      </Card>
    </Link>
  )
}
