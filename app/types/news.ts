export type MarketImpact = 'bullish' | 'bearish' | 'neutral'
export type NewsCategory = 'stock' | 'forex' | 'realestate' | 'crypto' | 'indicator' | 'global'

export interface NewsArticle {
  id: string
  title: string
  summary: string | null
  key_points: string[] | null
  market_impact: MarketImpact | null
  category: NewsCategory
  source_name: string | null
  source_url: string | null
  published_at: string
  created_at: string
}
