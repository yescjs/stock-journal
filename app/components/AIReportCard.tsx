// AI Report Card component — renders markdown reports with custom styled components
// Supports real-time streaming with progressive markdown rendering
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, RefreshCw, X, ChevronDown, ChevronUp, Sparkles, Gem, Square } from 'lucide-react';
import { markdownComponents } from '@/app/components/AIReportHistory';
import { useTranslations, useLocale } from 'next-intl';

interface AIReportCardProps {
  title: string;
  subtitle?: string;
  report: string | null;
  generatedAt?: string | null;
  loading: boolean;
  error: string | null;
  onGenerate?: () => void;
  onClear?: () => void;
  compact?: boolean; // Compact mode for inline trade review
  coinCost?: number;
  coinBalance?: number;
  onChargeCoins?: () => void;
  isLoggedIn?: boolean;
  // Streaming props
  isStreaming?: boolean;
  streamedContent?: string;
  onStopStreaming?: () => void;
}

export function AIReportCard({
  title,
  subtitle,
  report,
  generatedAt,
  loading,
  error,
  onGenerate,
  onClear,
  compact = false,
  coinCost,
  coinBalance = 0,
  onChargeCoins,
  isLoggedIn = true,
  isStreaming = false,
  streamedContent = '',
  onStopStreaming,
}: AIReportCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations('analysis.aiReport');
  const tc = useTranslations('common');
  const locale = useLocale();
  const numLocale = locale === 'ko' ? 'ko-KR' : 'en-US';

  // Show streamed content during streaming, or final report when done
  const displayContent = isStreaming ? streamedContent : report;

  return (
    <div className={`rounded-2xl border transition-all ${displayContent
        ? 'border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-transparent'
        : 'border-white/8 bg-white/3'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${loading ? 'bg-indigo-500/20 animate-pulse' : 'bg-indigo-500/15'
            }`}>
            {loading
              ? <RefreshCw size={16} className="text-indigo-400 animate-spin" />
              : <Bot size={16} className="text-indigo-400" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{title}</h3>
              {displayContent && !isStreaming && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  <Sparkles size={9} />
                  {t('aiGenerated')}
                </span>
              )}
              {isStreaming && (
                <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full animate-pulse">
                  <Sparkles size={9} />
                  {t('streaming')}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-white/30 truncate">{subtitle}</p>}
            {generatedAt && !isStreaming && (
              <p className="text-xs text-white/20">
                {new Date(generatedAt).toLocaleString(numLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} {t('generated')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-none">
          {/* Stop button during streaming */}
          {isStreaming && onStopStreaming && (
            <button
              onClick={onStopStreaming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25 transition-all"
            >
              <Square size={10} className="fill-current" />
              {t('stop')}
            </button>
          )}

          {displayContent && !compact && !isStreaming && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
              title={collapsed ? t('expand') : t('collapse')}
            >
              {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
          {displayContent && onClear && !isStreaming && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-white/20 hover:text-white/40 transition-colors"
              title={t('reset')}
            >
              <X size={14} />
            </button>
          )}
          {!isStreaming && (
            <>
              {!isLoggedIn ? (
                <div className="text-xs text-white/30 px-2">{tc('loginRequired')}</div>
              ) : coinCost !== undefined && coinBalance < coinCost && !displayContent ? (
                <button
                  onClick={onChargeCoins}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/25 transition-all"
                >
                  <Gem size={11} />
                  {t('coinShort', { balance: coinBalance, cost: coinCost })}
                </button>
              ) : (
                <button
                  onClick={onGenerate}
                  disabled={loading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${loading
                      ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20 cursor-wait'
                      : displayContent
                        ? 'text-white/40 bg-white/5 border-white/8 hover:text-white/70 hover:bg-white/8'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
                    }`}
                >
                  <Sparkles size={11} />
                  {loading ? t('generating') : displayContent ? t('regenerate') : coinCost ? t('analyzeWithCoin', { cost: coinCost }) : t('analyze')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Report Content — custom styled markdown (shows during streaming too) */}
      {displayContent && !collapsed && (
        <div className="px-4 sm:px-5 pb-5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {displayContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      )}

      {/* Empty state prompt */}
      {!displayContent && !loading && !error && (
        <div className="px-5 pb-5 text-xs text-white/20 leading-relaxed">
          {compact
            ? t('emptyCompact')
            : t('emptyFull')
          }
        </div>
      )}
    </div>
  );
}
