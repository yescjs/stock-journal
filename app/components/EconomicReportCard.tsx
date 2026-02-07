'use client';

import React from 'react';
import { DailyEconomicReport, KeyIssue, NewsItem } from '@/app/types/economicReports';
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
  FileText,
  Target,
  Flag,
} from 'lucide-react';

interface EconomicReportCardProps {
  report: DailyEconomicReport;
  darkMode: boolean;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const sentimentConfig = {
  bullish: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: '상승' },
  bearish: { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', label: '하락' },
  neutral: { icon: Minus, color: 'text-slate-500', bg: 'bg-slate-500/10', label: '중립' },
  volatile: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '변동성' },
};

const impactConfig = {
  high: { color: 'bg-rose-500', label: '높음' },
  medium: { color: 'bg-amber-500', label: '중간' },
  low: { color: 'bg-blue-500', label: '낮음' },
};

function extractCheckpoint(summary?: string | null) {
  if (!summary) return '';
  const sentences = summary
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences || sentences.length === 0) return summary.trim();
  return sentences.slice(-2).join(' ').trim();
}

export function EconomicReportCard({
  report,
  darkMode,
  onMarkAsRead,
  onDelete,
}: EconomicReportCardProps) {
  const sentiment = sentimentConfig[report.market_sentiment] ?? sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;
  const checkpoint = extractCheckpoint(report.summary);

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        report.is_read ? 'opacity-70' : ''
      } ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
    >
      {!report.is_read && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      )}

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
                  AI 분석
                </span>
              )}
            </p>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              darkMode ? 'border-slate-700' : 'border-slate-200'
            } ${sentiment.bg}`}
          >
            <SentimentIcon className={`w-4 h-4 ${sentiment.color}`} />
            <span className={`text-sm font-semibold ${sentiment.color}`}>
              {sentiment.label}
            </span>
          </div>
        </div>
      </div>

      {report.summary && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <FileText className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
            <h4 className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              시장 개요
            </h4>
          </div>
          <p className={`text-base leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {report.summary}
          </p>
        </div>
      )}

      {report.key_issues && report.key_issues.length > 0 && (
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Target className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
            <h4 className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              주요 동인
            </h4>
          </div>
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
        </div>
      )}

      <div className="px-4 py-4 space-y-4 border-b border-slate-200 dark:border-slate-800">
        {report.korean_news && report.korean_news.length > 0 && (
          <NewsSection
            title="국내 주요 뉴스"
            icon={Newspaper}
            news={report.korean_news}
            darkMode={darkMode}
          />
        )}

        {report.global_news && report.global_news.length > 0 && (
          <NewsSection
            title="해외 주요 뉴스"
            icon={Globe}
            news={report.global_news}
            darkMode={darkMode}
          />
        )}
      </div>

      {checkpoint && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Flag className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
            <h4 className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              체크포인트
            </h4>
          </div>
          <div
            className={`p-3 rounded-lg border-l-4 ${
              darkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <p className="text-sm leading-relaxed">{checkpoint}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        {!report.is_read && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMarkAsRead(report.id)}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-1.5" />
            읽음 처리
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

function NewsSection({
  title,
  icon: Icon,
  news,
  darkMode,
}: {
  title: string;
  icon: React.ElementType;
  news: NewsItem[];
  darkMode: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const displayNews = expanded ? news : news.slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
        <h4 className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {title}
        </h4>
        <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          ({news.length}건)
        </span>
      </div>
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
          {expanded ? '접기' : `+${news.length - 3}건 더보기`}
        </button>
      )}
    </div>
  );
}
