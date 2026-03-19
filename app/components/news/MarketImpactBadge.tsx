import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MarketImpact } from '@/app/types/news'

const CONFIG: Record<MarketImpact, { label: string; icon: React.ElementType; className: string }> = {
  bullish: { label: '상승', icon: TrendingUp, className: 'text-emerald-400 bg-emerald-500/10' },
  bearish: { label: '하락', icon: TrendingDown, className: 'text-red-400 bg-red-500/10' },
  neutral: { label: '중립', icon: Minus, className: 'text-gray-400 bg-gray-500/10' },
}

export function MarketImpactBadge({ impact }: { impact: MarketImpact | null }) {
  if (!impact) return null
  const { label, icon: Icon, className } = CONFIG[impact]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}
