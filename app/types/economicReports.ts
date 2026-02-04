export interface NewsItem {
  title: string;
  source: string;
  url: string;
  summary?: string;
  publishedAt?: string;
}

export interface KeyIssue {
  topic: string;
  impact: 'high' | 'medium' | 'low';
  stocks?: string[]; // 관련 종목 코드
  description?: string;
}

export interface SectorAnalysis {
  sector: string;
  trend: 'up' | 'down' | 'neutral';
  summary: string;
  relatedStocks?: string[];
}

export interface MarketIndicator {
  name: string;
  direction: 'up' | 'down' | 'stable';
  description: string;
}

export interface InvestmentInsight {
  type: 'opportunity' | 'risk' | 'watch';
  title: string;
  description: string;
}

export interface DailyEconomicReport {
  id: string;
  user_id?: string;
  report_date: string; // YYYY-MM-DD
  title: string;
  summary: string;
  korean_news: NewsItem[];
  global_news: NewsItem[];
  key_issues: KeyIssue[];
  market_sentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  market_overview?: string;
  sector_analysis?: SectorAnalysis[];
  market_indicators?: MarketIndicator[];
  investment_insights?: InvestmentInsight[];
  ai_generated: boolean;
  is_read: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  id?: string;
  user_id?: string;
  enable_daily_report: boolean;
  report_time: string; // HH:MM
  preferred_sources: string[];
  created_at?: string;
  updated_at?: string;
}

export interface RawNewsItem {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  source: string;
}
