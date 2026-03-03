// AI Report Card component — renders markdown reports with custom styled components
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, RefreshCw, X, ChevronDown, ChevronUp, Sparkles, Gem } from 'lucide-react';
import { markdownComponents } from '@/app/components/AIReportHistory';

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
}: AIReportCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`rounded-2xl border transition-all ${report
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
              {report && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  <Sparkles size={9} />
                  AI 생성
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-white/30 truncate">{subtitle}</p>}
            {generatedAt && (
              <p className="text-xs text-white/20">
                {new Date(generatedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 생성
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-none">
          {report && !compact && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
              title={collapsed ? '펼치기' : '접기'}
            >
              {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
          {report && onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-white/20 hover:text-white/40 transition-colors"
              title="초기화"
            >
              <X size={14} />
            </button>
          )}
          {!isLoggedIn ? (
            <div className="text-xs text-white/30 px-2">로그인 필요</div>
          ) : coinCost !== undefined && coinBalance < coinCost && !report ? (
            <button
              onClick={onChargeCoins}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/25 transition-all"
            >
              <Gem size={11} />
              코인 부족 ({coinBalance}/{coinCost})
            </button>
          ) : (
            <button
              onClick={onGenerate}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${loading
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20 cursor-wait'
                  : report
                    ? 'text-white/40 bg-white/5 border-white/8 hover:text-white/70 hover:bg-white/8'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
                }`}
            >
              <Sparkles size={11} />
              {loading ? '생성 중...' : report ? '재생성' : coinCost ? `AI 분석 (${coinCost}💎)` : 'AI 분석'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-xs text-red-400">
          ⚠ {error}
        </div>
      )}

      {/* Report Content — custom styled markdown */}
      {report && !collapsed && (
        <div className="px-4 sm:px-5 pb-5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {report}
          </ReactMarkdown>
        </div>
      )}

      {/* Empty state prompt */}
      {!report && !loading && !error && (
        <div className="px-5 pb-5 text-xs text-white/20 leading-relaxed">
          {compact
            ? '이 거래에 대한 AI 피드백을 받아보세요.'
            : '매매 데이터를 기반으로 AI가 투자 코치 리포트를 생성합니다. 승률, 감정 패턴, 전략 효과 등을 종합 분석합니다.'
          }
        </div>
      )}
    </div>
  );
}
