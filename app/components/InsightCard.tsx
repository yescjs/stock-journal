'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Brain, X, Sparkles, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DetectedPattern, PatternType } from '@/app/hooks/usePatternDetection';

// ─── Icon mapping ────────────────────────────────────────────────────────

const PATTERN_ICONS: Record<PatternType, React.ReactNode> = {
  win_rate_drop: <TrendingDown size={18} className="text-red-400" />,
  win_rate_rise: <TrendingUp size={18} className="text-emerald-400" />,
  overtrading: <Activity size={18} className="text-amber-400" />,
  emotion_shift: <Brain size={18} className="text-purple-400" />,
  losing_streak: <AlertTriangle size={18} className="text-red-400" />,
};

const PATTERN_COLORS: Record<PatternType, { border: string; bg: string; icon: string; title: string }> = {
  win_rate_drop: {
    border: 'border-red-500/20',
    bg: 'bg-red-950/40',
    icon: 'bg-red-500/15',
    title: 'text-red-300',
  },
  win_rate_rise: {
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-950/40',
    icon: 'bg-emerald-500/15',
    title: 'text-emerald-300',
  },
  overtrading: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-950/40',
    icon: 'bg-amber-500/15',
    title: 'text-amber-300',
  },
  emotion_shift: {
    border: 'border-purple-500/20',
    bg: 'bg-purple-950/40',
    icon: 'bg-purple-500/15',
    title: 'text-purple-300',
  },
  losing_streak: {
    border: 'border-red-500/20',
    bg: 'bg-red-950/40',
    icon: 'bg-red-500/15',
    title: 'text-red-300',
  },
};

// ─── Component ───────────────────────────────────────────────────────────

interface InsightCardProps {
  pattern: DetectedPattern;
  onDismiss: (type: PatternType) => void;
  onRequestAI: (pattern: DetectedPattern) => Promise<void>;
  aiComment?: string;
  aiLoading?: boolean;
  isLoggedIn: boolean;
  coinBalance?: number;
  onLoginPrompt?: () => void;
  onChargeCoins?: () => void;
}

export function InsightCard({
  pattern,
  onDismiss,
  onRequestAI,
  aiComment,
  aiLoading = false,
  isLoggedIn,
  coinBalance = 0,
  onLoginPrompt,
  onChargeCoins,
}: InsightCardProps) {
  const t = useTranslations('insight');
  const [error, setError] = useState<string | null>(null);

  const colors = PATTERN_COLORS[pattern.type];
  const icon = PATTERN_ICONS[pattern.type];

  const handleAIRequest = async () => {
    if (!isLoggedIn) {
      onLoginPrompt?.();
      return;
    }
    if (coinBalance < 1) {
      onChargeCoins?.();
      return;
    }
    setError(null);
    try {
      await onRequestAI(pattern);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('INSUFFICIENT_COINS')) {
        onChargeCoins?.();
      } else {
        setError(msg);
      }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`rounded-2xl border ${colors.border} ${colors.bg} backdrop-blur-sm overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${colors.icon}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold ${colors.title}`}>
            {t(`title.${pattern.type}`)}
          </h4>
          <p className="text-xs text-white/60 mt-1 leading-relaxed">
            {t(pattern.summaryKey, pattern.summaryValues)}
          </p>
        </div>
        <button
          onClick={() => onDismiss(pattern.type)}
          className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors"
          aria-label={t('dismiss')}
        >
          <X size={14} />
        </button>
      </div>

      {/* AI Comment or Request Button */}
      <div className="px-4 pb-4 pt-2">
        <AnimatePresence mode="wait">
          {aiComment ? (
            <motion.div
              key="comment"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-white/70 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/5"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={12} className="text-blue-400" />
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                  AI Insight
                </span>
              </div>
              {aiComment}
            </motion.div>
          ) : (
            <motion.div key="button" className="flex items-center gap-2">
              {!isLoggedIn ? (
                <button
                  onClick={onLoginPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors"
                >
                  <LogIn size={12} />
                  {t('loginForAI')}
                </button>
              ) : (
                <button
                  onClick={handleAIRequest}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiLoading ? (
                    <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {aiLoading ? t('analyzing') : t('getAIComment')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Container Component ─────────────────────────────────────────────────

interface InsightCardListProps {
  patterns: DetectedPattern[];
  onDismiss: (type: PatternType) => void;
  onRequestAI: (pattern: DetectedPattern) => Promise<void>;
  aiComments: Record<string, string>;
  aiLoading: Record<string, boolean>;
  isLoggedIn: boolean;
  coinBalance?: number;
  onLoginPrompt?: () => void;
  onChargeCoins?: () => void;
}

export function InsightCardList({
  patterns,
  onDismiss,
  onRequestAI,
  aiComments,
  aiLoading,
  isLoggedIn,
  coinBalance,
  onLoginPrompt,
  onChargeCoins,
}: InsightCardListProps) {
  if (patterns.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      <AnimatePresence mode="popLayout">
        {patterns.map(pattern => (
          <InsightCard
            key={pattern.type}
            pattern={pattern}
            onDismiss={onDismiss}
            onRequestAI={onRequestAI}
            aiComment={aiComments[pattern.type]}
            aiLoading={aiLoading[pattern.type]}
            isLoggedIn={isLoggedIn}
            coinBalance={coinBalance}
            onLoginPrompt={onLoginPrompt}
            onChargeCoins={onChargeCoins}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
