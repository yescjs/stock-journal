// Pattern detection hook — compares last 7 days vs previous 7 days
// Detects significant trading pattern changes and returns insight cards
// Works in both guest and user modes (local computation, no API call)

import { useMemo, useState, useCallback } from 'react';
import { Trade } from '@/app/types/trade';

// ─── Constants ───────────────────────────────────────────────────────────

const DISMISSED_KEY = 'stock-journal-dismissed-insights-v1';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_VISIBLE_INSIGHTS = 2;

export type PatternType = 'win_rate_drop' | 'win_rate_rise' | 'overtrading' | 'emotion_shift' | 'losing_streak';

export type PatternSeverity = 'warning' | 'critical';

export interface DetectedPattern {
  type: PatternType;
  severity: PatternSeverity;
  /** i18n key for the summary text */
  summaryKey: string;
  /** Values to interpolate into the i18n summary */
  summaryValues: Record<string, string | number>;
  /** Raw data for AI prompt */
  rawData: Record<string, unknown>;
}

// ─── Dismissed State Helpers ─────────────────────────────────────────────

interface DismissedEntry {
  type: PatternType;
  dismissedAt: number; // timestamp
}

function getDismissedEntries(): DismissedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DismissedEntry[];
  } catch {
    return [];
  }
}

function saveDismissedEntries(entries: DismissedEntry[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(entries));
}

function isDismissed(type: PatternType): boolean {
  const entries = getDismissedEntries();
  const entry = entries.find(e => e.type === type);
  if (!entry) return false;
  return Date.now() - entry.dismissedAt < DISMISS_DURATION_MS;
}

function dismissPattern(type: PatternType) {
  const entries = getDismissedEntries().filter(e => e.type !== type);
  entries.push({ type, dismissedAt: Date.now() });
  saveDismissedEntries(entries);
}

// ─── Detection Logic ─────────────────────────────────────────────────────

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function splitByPeriod(trades: Trade[]): { recent: Trade[]; previous: Trade[] } {
  const cutoff7 = getDateNDaysAgo(7);
  const cutoff14 = getDateNDaysAgo(14);

  const recent = trades.filter(t => t.date >= cutoff7);
  const previous = trades.filter(t => t.date >= cutoff14 && t.date < cutoff7);

  return { recent, previous };
}

/** Approximate win rate from sell trades by matching with earlier buys */
function calcWinRate(trades: Trade[]): { winRate: number; wins: number; total: number } {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const sells = sorted.filter(t => t.side === 'SELL');
  let wins = 0;
  let total = 0;

  for (const sell of sells) {
    const matchingBuy = sorted.find(
      t => t.side === 'BUY' && t.symbol === sell.symbol && t.date <= sell.date
    );
    if (matchingBuy) {
      total++;
      if (sell.price >= matchingBuy.price) wins++;
    }
  }

  return { winRate: total > 0 ? (wins / total) * 100 : 0, wins, total };
}

function detectWinRateChange(recent: Trade[], previous: Trade[]): DetectedPattern | null {
  const recentStats = calcWinRate(recent);
  const prevStats = calcWinRate(previous);

  // Need at least 1 round trip in each period
  if (recentStats.total < 1 || prevStats.total < 1) return null;

  const diff = recentStats.winRate - prevStats.winRate;

  if (diff <= -10) {
    return {
      type: 'win_rate_drop',
      severity: diff <= -20 ? 'critical' : 'warning',
      summaryKey: 'winRateDrop',
      summaryValues: {
        previous: Math.round(prevStats.winRate),
        current: Math.round(recentStats.winRate),
        diff: Math.round(Math.abs(diff)),
      },
      rawData: { recentWinRate: recentStats.winRate, prevWinRate: prevStats.winRate, diff },
    };
  }

  if (diff >= 10) {
    return {
      type: 'win_rate_rise',
      severity: 'warning', // positive, but still notable
      summaryKey: 'winRateRise',
      summaryValues: {
        previous: Math.round(prevStats.winRate),
        current: Math.round(recentStats.winRate),
        diff: Math.round(diff),
      },
      rawData: { recentWinRate: recentStats.winRate, prevWinRate: prevStats.winRate, diff },
    };
  }

  return null;
}

function detectOvertrading(recent: Trade[], previous: Trade[]): DetectedPattern | null {
  if (previous.length === 0) return null;

  // Calculate average daily trade count
  const recentDays = new Set(recent.map(t => t.date)).size || 1;
  const prevDays = new Set(previous.map(t => t.date)).size || 1;

  const recentAvg = recent.length / recentDays;
  const prevAvg = previous.length / prevDays;

  if (prevAvg > 0 && recentAvg >= prevAvg * 2 && recentAvg >= 2) {
    return {
      type: 'overtrading',
      severity: recentAvg >= prevAvg * 3 ? 'critical' : 'warning',
      summaryKey: 'overtrading',
      summaryValues: {
        previousAvg: prevAvg.toFixed(1),
        currentAvg: recentAvg.toFixed(1),
        multiplier: (recentAvg / prevAvg).toFixed(1),
      },
      rawData: { recentAvg, prevAvg },
    };
  }

  return null;
}

function detectEmotionShift(recent: Trade[], previous: Trade[]): DetectedPattern | null {
  if (recent.length < 2 || previous.length < 2) return null;

  const NEGATIVE_TAGS = new Set(['FOMO', 'REVENGE', 'IMPULSE', 'FEAR']);

  const recentNeg = recent.filter(t => t.emotion_tag && NEGATIVE_TAGS.has(t.emotion_tag)).length;
  const prevNeg = previous.filter(t => t.emotion_tag && NEGATIVE_TAGS.has(t.emotion_tag)).length;

  const recentRatio = recentNeg / recent.length;
  const prevRatio = prevNeg / previous.length;
  const diffPp = (recentRatio - prevRatio) * 100;

  if (diffPp >= 20) {
    // Find the most common negative tag in recent period
    const tagCounts: Record<string, number> = {};
    recent.forEach(t => {
      if (t.emotion_tag && NEGATIVE_TAGS.has(t.emotion_tag)) {
        tagCounts[t.emotion_tag] = (tagCounts[t.emotion_tag] || 0) + 1;
      }
    });
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FOMO';

    return {
      type: 'emotion_shift',
      severity: diffPp >= 40 ? 'critical' : 'warning',
      summaryKey: 'emotionShift',
      summaryValues: {
        tag: topTag,
        previousPercent: Math.round(prevRatio * 100),
        currentPercent: Math.round(recentRatio * 100),
        diff: Math.round(diffPp),
      },
      rawData: { recentRatio, prevRatio, topTag, diffPp },
    };
  }

  return null;
}

function detectLosingStreak(trades: Trade[]): DetectedPattern | null {
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));
  const sells = sorted.filter(t => t.side === 'SELL');

  let streak = 0;
  for (const sell of sells) {
    const matchingBuy = sorted.find(
      t => t.side === 'BUY' && t.symbol === sell.symbol && t.date <= sell.date
    );
    if (matchingBuy && sell.price < matchingBuy.price) {
      streak++;
    } else {
      break;
    }
  }

  if (streak >= 3) {
    return {
      type: 'losing_streak',
      severity: streak >= 5 ? 'critical' : 'warning',
      summaryKey: 'losingStreak',
      summaryValues: { count: streak },
      rawData: { streak },
    };
  }

  return null;
}

// ─── Hook ────────────────────────────────────────────────────────────────

export interface UsePatternDetectionReturn {
  patterns: DetectedPattern[];
  dismissPatern: (type: PatternType) => void;
  /** AI comment state per pattern type */
  aiComments: Record<string, string>;
  aiLoading: Record<string, boolean>;
  requestAIComment: (pattern: DetectedPattern) => Promise<void>;
}

interface UsePatternDetectionOptions {
  user: { id: string } | null;
  locale?: string;
  coinBalance?: number;
  onCoinsConsumed?: () => void;
}

export function usePatternDetection(
  trades: Trade[],
  options: UsePatternDetectionOptions
): UsePatternDetectionReturn {
  const { user, locale = 'ko', onCoinsConsumed } = options;

  const [dismissedTypes, setDismissedTypes] = useState<Set<PatternType>>(() => {
    const entries = getDismissedEntries();
    const now = Date.now();
    return new Set(
      entries
        .filter(e => now - e.dismissedAt < DISMISS_DURATION_MS)
        .map(e => e.type)
    );
  });

  const [aiComments, setAiComments] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const allPatterns = useMemo<DetectedPattern[]>(() => {
    if (trades.length < 3) return [];

    const { recent, previous } = splitByPeriod(trades);
    if (recent.length === 0) return [];

    const detectors = [
      () => detectWinRateChange(recent, previous),
      () => detectOvertrading(recent, previous),
      () => detectEmotionShift(recent, previous),
      () => detectLosingStreak(trades),
    ];

    return detectors
      .map(fn => fn())
      .filter((p): p is DetectedPattern => p !== null);
  }, [trades]);

  const patterns = useMemo(() => {
    return allPatterns
      .filter(p => !dismissedTypes.has(p.type) && !isDismissed(p.type))
      .sort((a, b) => {
        const order = { critical: 0, warning: 1 };
        return order[a.severity] - order[b.severity];
      })
      .slice(0, MAX_VISIBLE_INSIGHTS);
  }, [allPatterns, dismissedTypes]);

  const dismissPatern = useCallback((type: PatternType) => {
    dismissPattern(type);
    setDismissedTypes(prev => new Set([...prev, type]));
  }, []);

  const requestAIComment = useCallback(async (pattern: DetectedPattern) => {
    if (!user) return;

    setAiLoading(prev => ({ ...prev, [pattern.type]: true }));
    try {
      const { supabase } = await import('@/app/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'pattern_insight',
          patternType: pattern.type,
          patternData: pattern.rawData,
          summaryValues: pattern.summaryValues,
          locale,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'AI request failed');
      }

      const data = await res.json();
      setAiComments(prev => ({ ...prev, [pattern.type]: data.report }));
      onCoinsConsumed?.();
    } catch (err) {
      console.error('AI insight error:', err);
      throw err;
    } finally {
      setAiLoading(prev => ({ ...prev, [pattern.type]: false }));
    }
  }, [user, locale, onCoinsConsumed]);

  return {
    patterns,
    dismissPatern,
    aiComments,
    aiLoading,
    requestAIComment,
  };
}
