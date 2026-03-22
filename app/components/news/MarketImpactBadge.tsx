'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { MarketImpact } from '@/app/types/news'

const CONFIG: Record<MarketImpact, { icon: React.ElementType; className: string }> = {
  bullish: { icon: TrendingUp, className: 'text-emerald-400 bg-emerald-500/10' },
  bearish: { icon: TrendingDown, className: 'text-red-400 bg-red-500/10' },
  neutral: { icon: Minus, className: 'text-gray-400 bg-gray-500/10' },
}

export function MarketImpactBadge({ impact }: { impact: MarketImpact | null }) {
  const t = useTranslations('news.impact')
  if (!impact) return null
  const { icon: Icon, className } = CONFIG[impact]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${className}`}>
      <Icon size={12} />
      {t(impact)}
    </span>
  )
}
