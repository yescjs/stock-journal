'use client';

import React, { useState } from 'react';
import {
  DailyEconomicReport,
  KeyIssue,
  NewsItem,
  SectorAnalysis,
  MarketIndicator,
  InvestmentInsight,
} from '@/app/types/economicReports';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Newspaper,
  Globe,
  ExternalLink,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Lightbulb,
  Target,
  Eye,
  AlertTriangle,
  Activity,
} from 'lucide-react';

interface EconomicReportCardProps {
  report: DailyEconomicReport;
  darkMode: boolean;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const sentimentConfig = {
  bullish: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: '긍정적' },
  bearish: { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', label: '부정적' },
  neutral: { icon: Minus, color: 'text-slate-500', bg: 'bg-slate-500/10', label: '중립' },
  volatile: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '변동성' },
};

const impactConfig = {
  high: { color: 'bg-rose-500', label: '높음' },
  medium: { color: 'bg-amber-500', label: '중간' },
  low: { color: 'bg-blue-500', label: '낮음' },
};

type SectionKey = 'summary' | 'market_overview' | 'market_indicators' | 'sector_analysis' | 'investment_insights' | 'key_issues' | 'korean_news' | 'global_news';

export function EconomicReportCard({
  report,
  darkMode,
  onMarkAsRead,
  onDelete,
}: EconomicReportCardProps) {
  const sentiment = sentimentConfig[report.market_sentiment];
  const SentimentIcon = sentiment.icon;

  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    summary: true,
    market_overview: false,
    market_indicators: false,
    sector_analysis: false,
    investment_insights: false,
    key_issues: true,
    korean_news: false,
    global_news: false,
  });

  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        report.is_read ? 'opacity-70' : ''
      } ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
    >
      {/* Unread Indicator */}
      {!report.is_read && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      )}

      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {report.title}
            </h3>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {new Date(report.report_date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
              {report.ai_generated && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500">
                  AI 생성
                </span>
              )}
            </p>
          </div>

          {/* Sentiment Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${sentiment.bg}`}>
            <SentimentIcon className={`w-4 h-4 ${sentiment.color}`} />
            <span className={`text-sm font-medium ${sentiment.color}`}>
              {sentiment.label}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <CollapsibleSection
        title="요약"
        icon={<Activity className="w-4 h-4" />}
        expanded={expandedSections.summary}
        onToggle={() => toggleSection('summary')}
        darkMode={darkMode}
      >
        <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {report.summary}
        </p>
      </CollapsibleSection>

      {/* Market Overview */}
      {report.market_overview && (
        <CollapsibleSection
          title="시장 개요"
          icon={<BarChart3 className="w-4 h-4" />}
          expanded={expandedSections.market_overview}
          onToggle={() => toggleSection('market_overview')}
          darkMode={darkMode}
        >
          <div className={`text-sm leading-relaxed whitespace-pre-line ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {report.market_overview}
          </div>
        </CollapsibleSection>
      )}

      {/* Market Indicators */}
      {report.market_indicators && report.market_indicators.length > 0 && (
        <CollapsibleSection
          title="경제 지표"
          icon={<Target className="w-4 h-4" />}
          expanded={expandedSections.market_indicators}
          onToggle={() => toggleSection('market_indicators')}
          darkMode={darkMode}
          badge={`${report.market_indicators.length}개`}
        >
          <div className="flex flex-wrap gap-2">
            {report.market_indicators.map((indicator: MarketIndicator, idx: number) => (
              <MarketIndicatorChip
                key={idx}
                indicator={indicator}
                darkMode={darkMode}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Sector Analysis */}
      {report.sector_analysis && report.sector_analysis.length > 0 && (
        <CollapsibleSection
          title="섹터 분석"
          icon={<BarChart3 className="w-4 h-4" />}
          expanded={expandedSections.sector_analysis}
          onToggle={() => toggleSection('sector_analysis')}
          darkMode={darkMode}
          badge={`${report.sector_analysis.length}개`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.sector_analysis.map((sector: SectorAnalysis, idx: number) => (
              <SectorCard key={idx} sector={sector} darkMode={darkMode} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Investment Insights */}
      {report.investment_insights && report.investment_insights.length > 0 && (
        <CollapsibleSection
          title="투자 시사점"
          icon={<Lightbulb className="w-4 h-4" />}
          expanded={expandedSections.investment_insights}
          onToggle={() => toggleSection('investment_insights')}
          darkMode={darkMode}
          badge={`${report.investment_insights.length}개`}
        >
          <div className="space-y-2">
            {report.investment_insights.map((insight: InvestmentInsight, idx: number) => (
              <InsightCard key={idx} insight={insight} darkMode={darkMode} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Key Issues */}
      {report.key_issues && report.key_issues.length > 0 && (
        <CollapsibleSection
          title="핵심 이슈"
          icon={<AlertCircle className="w-4 h-4" />}
          expanded={expandedSections.key_issues}
          onToggle={() => toggleSection('key_issues')}
          darkMode={darkMode}
          badge={`${report.key_issues.length}개`}
        >
          <div className="space-y-2">
            {report.key_issues.map((issue: KeyIssue, idx: number) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  darkMode ? 'bg-slate-800' : 'bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${impactConfig[issue.impact].color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {issue.topic}
                    </span>
                    <Badge variant={issue.impact === 'high' ? 'red' : issue.impact === 'medium' ? 'blue' : 'gray'}>
                      {impactConfig[issue.impact].label}
                    </Badge>
                  </div>
                  {issue.description && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {issue.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* News Sections */}
      {report.korean_news && report.korean_news.length > 0 && (
        <CollapsibleSection
          title="국내 뉴스"
          icon={<Newspaper className="w-4 h-4" />}
          expanded={expandedSections.korean_news}
          onToggle={() => toggleSection('korean_news')}
          darkMode={darkMode}
          badge={`${report.korean_news.length}건`}
        >
          <NewsList news={report.korean_news} darkMode={darkMode} />
        </CollapsibleSection>
      )}

      {report.global_news && report.global_news.length > 0 && (
        <CollapsibleSection
          title="해외 뉴스"
          icon={<Globe className="w-4 h-4" />}
          expanded={expandedSections.global_news}
          onToggle={() => toggleSection('global_news')}
          darkMode={darkMode}
          badge={`${report.global_news.length}건`}
        >
          <NewsList news={report.global_news} darkMode={darkMode} />
        </CollapsibleSection>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        {!report.is_read && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMarkAsRead(report.id)}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-1.5" />
            읽음 표시
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(report.id)}
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  darkMode,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  darkMode: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
          darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
            {icon}
          </span>
          <span className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {title}
          </span>
          {badge && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'
            }`}>
              {badge}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
          : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        }
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Market Indicator Chip Component
function MarketIndicatorChip({
  indicator,
  darkMode,
}: {
  indicator: MarketIndicator;
  darkMode: boolean;
}) {
  const directionConfig = {
    up: { icon: TrendingUp, color: 'text-emerald-500', bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50' },
    down: { icon: TrendingDown, color: 'text-rose-500', bg: darkMode ? 'bg-rose-500/10' : 'bg-rose-50' },
    stable: { icon: Minus, color: 'text-slate-500', bg: darkMode ? 'bg-slate-700' : 'bg-slate-100' },
  };

  const config = directionConfig[indicator.direction];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      <div>
        <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {indicator.name}
        </span>
        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {indicator.description}
        </p>
      </div>
    </div>
  );
}

// Sector Card Component
function SectorCard({
  sector,
  darkMode,
}: {
  sector: SectorAnalysis;
  darkMode: boolean;
}) {
  const trendConfig = {
    up: { label: '상승', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    down: { label: '하락', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    neutral: { label: '보합', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  };

  const config = trendConfig[sector.trend];

  return (
    <div className={`p-3 rounded-lg border ${config.border} ${darkMode ? 'bg-slate-800/50' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {sector.sector}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>
      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {sector.summary}
      </p>
      {sector.relatedStocks && sector.relatedStocks.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {sector.relatedStocks.map((stock, idx) => (
            <span
              key={idx}
              className={`text-xs px-1.5 py-0.5 rounded ${
                darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stock}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Investment Insight Card Component
function InsightCard({
  insight,
  darkMode,
}: {
  insight: InvestmentInsight;
  darkMode: boolean;
}) {
  const typeConfig = {
    opportunity: {
      icon: Eye,
      label: '기회',
      color: 'text-emerald-500',
      bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50',
      border: 'border-emerald-500/20',
    },
    risk: {
      icon: AlertTriangle,
      label: '리스크',
      color: 'text-rose-500',
      bg: darkMode ? 'bg-rose-500/10' : 'bg-rose-50',
      border: 'border-rose-500/20',
    },
    watch: {
      icon: Target,
      label: '관심',
      color: 'text-amber-500',
      bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50',
      border: 'border-amber-500/20',
    },
  };

  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.border} ${config.bg}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {insight.title}
          </span>
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {insight.description}
        </p>
      </div>
    </div>
  );
}

// News List Component
function NewsList({
  news,
  darkMode,
}: {
  news: NewsItem[];
  darkMode: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayNews = expanded ? news : news.slice(0, 3);

  return (
    <div>
      <div className="space-y-1">
        {displayNews.map((item: NewsItem, idx: number) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-start gap-2 p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-slate-800 text-slate-300'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {item.source}
                </span>
                {item.publishedAt && (
                  <span className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                    {new Date(item.publishedAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
      {news.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-xs mt-2 px-2 py-1 rounded transition-colors ${
            darkMode
              ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          {expanded ? '접기' : `+${news.length - 3}개 더보기`}
        </button>
      )}
    </div>
  );
}
