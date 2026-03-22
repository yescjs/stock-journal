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
  // i18n fields
  title_en?: string | null
  summary_en?: string | null
  key_points_en?: string[] | null
}

export function localizeArticle(article: NewsArticle, locale: string): NewsArticle {
  if (locale === 'en') {
    return {
      ...article,
      title: article.title_en ?? article.title,
      summary: article.summary_en ?? article.summary,
      key_points: article.key_points_en ?? article.key_points,
    };
  }
  return article;
}
