'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, ChevronDown, ChevronUp, Gem, Loader2, Square, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTranslations, useLocale } from 'next-intl';
import type { TradeAnalysis } from '@/app/types/analysis';
import type { SavedReport, AIReportResult } from '@/app/hooks/useAIAnalysis';

const MIN_ROUND_TRIPS = 10;

interface AIPlaybookCardProps {
  analysis: TradeAnalysis | null;
  savedReports: SavedReport[];
  playbookReport: AIReportResult | null;
  loadingPlaybook: boolean;
  isStreamingPlaybook: boolean;
  streamedPlaybookContent: string;
  onGenerate: () => void;
  onStopStreaming: () => void;
  coinCost: number;
  coinBalance?: number;
  onChargeCoins?: () => void;
  isLoggedIn: boolean;
}

export function AIPlaybookCard({
  analysis,
  savedReports,
  playbookReport,
  loadingPlaybook,
  isStreamingPlaybook,
  streamedPlaybookContent,
  onGenerate,
  onStopStreaming,
  coinCost,
  coinBalance = 0,
  onChargeCoins,
  isLoggedIn,
}: AIPlaybookCardProps) {
  const t = useTranslations('aiPlaybook');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  // 최신 저장된 플레이북 가져오기
  const latestSaved = useMemo(
    () => savedReports.filter(r => r.report_type === 'playbook')[0] ?? null,
    [savedReports],
  );

  const displayReport = playbookReport ?? (latestSaved ? { report: latestSaved.report, generatedAt: latestSaved.created_at } : null);
  const displayContent = isStreamingPlaybook ? streamedPlaybookContent : displayReport?.report ?? null;

  const roundTripCount = analysis?.roundTrips.length ?? 0;
  const hasEnoughTrades = roundTripCount >= MIN_ROUND_TRIPS;
  const insufficientCoins = coinBalance < coinCost;

  const generatedAt = displayReport?.generatedAt
    ? new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }).format(new Date(displayReport.generatedAt))
    : null;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-none">
          <BookOpen size={18} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">{t('title')}</h3>
          <p className="text-xs text-white/40 mt-0.5">{t('subtitle')}</p>
        </div>
        {/* Generated date */}
        {generatedAt && !isStreamingPlaybook && (
          <div className="flex items-center gap-1 text-xs text-white/25 flex-none">
            <Clock size={11} />
            <span>{generatedAt}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isStreamingPlaybook && streamedPlaybookContent && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pb-4"
          >
            <div className="prose prose-invert prose-sm max-w-none text-white/80 text-xs leading-relaxed">
              <ReactMarkdown>{streamedPlaybookContent}</ReactMarkdown>
            </div>
            <button
              onClick={onStopStreaming}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:text-white/70 transition-colors"
            >
              <Square size={11} />
              {t('stop')}
            </button>
          </motion.div>
        )}

        {!isStreamingPlaybook && displayContent && (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-2">
            <div className={`prose prose-invert prose-sm max-w-none text-white/80 text-xs leading-relaxed overflow-hidden transition-all ${expanded ? '' : 'max-h-40'}`}>
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
            {/* Expand/Collapse */}
            <button
              onClick={() => setExpanded(p => !p)}
              className="flex items-center gap-1.5 mt-2 mb-3 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? t('collapse') : t('expand')}
            </button>
            {/* Regenerate button */}
            {isLoggedIn && hasEnoughTrades && (
              <div className="flex justify-end pb-2">
                <button
                  onClick={onGenerate}
                  disabled={loadingPlaybook || insufficientCoins}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={11} />
                  {t('regenerate')} ({coinCost})
                </button>
              </div>
            )}
          </motion.div>
        )}

        {!isStreamingPlaybook && !displayContent && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4">
            <p className="text-xs text-white/30 leading-relaxed mb-4">{t('emptyDesc')}</p>

            {/* Not enough trades */}
            {!hasEnoughTrades && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6 text-xs text-white/40">
                <BookOpen size={12} />
                <span>{t('minTradesRequired', { min: MIN_ROUND_TRIPS, current: roundTripCount })}</span>
              </div>
            )}

            {/* Not logged in */}
            {!isLoggedIn && hasEnoughTrades && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6 text-xs text-white/40">
                <BookOpen size={12} />
                <span>{t('loginRequired')}</span>
              </div>
            )}

            {/* Generate button */}
            {isLoggedIn && hasEnoughTrades && (
              <button
                onClick={insufficientCoins ? onChargeCoins : onGenerate}
                disabled={loadingPlaybook}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  insufficientCoins
                    ? 'bg-white/5 text-white/30 border border-white/8'
                    : 'bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30'
                } disabled:opacity-50`}
              >
                {loadingPlaybook ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Gem size={15} />
                )}
                {insufficientCoins
                  ? t('coinShort', { balance: coinBalance, cost: coinCost })
                  : t('generate', { cost: coinCost })}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {loadingPlaybook && !isStreamingPlaybook && (
        <div className="flex items-center gap-2 px-4 pb-4 text-xs text-white/40">
          <Loader2 size={12} className="animate-spin" />
          <span>{t('generating')}</span>
        </div>
      )}
    </div>
  );
}
