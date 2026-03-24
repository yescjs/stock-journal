'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SavedReport } from '@/app/hooks/useAIAnalysis';
import { supabase } from '@/app/lib/supabaseClient';
import { COIN_COSTS } from '@/app/types/coins';
import { markdownComponents } from './AIReportHistory';

// Chart colors matching the project convention
const TREND_COLORS = {
  winRate: '#818cf8',    // indigo
  pnlPercent: '#34d399', // green
  rrRatio: '#fbbf24',   // yellow
  tradeCount: '#f472b6', // pink
};

const SESSION_STORAGE_KEY = 'stock-journal-trend-summary-v1';

interface TrendDataPoint {
  index: number;       // unique numeric index for XAxis (Bug 1 fix)
  date: string;
  displayDate: string;
  reportId: string;
  winRate?: number;
  totalTrades?: number;
  pnlPercent?: number;
  rrRatio?: number;
}

interface ReportTrendViewProps {
  reports: SavedReport[];
  onNavigateToReport?: (reportId: string) => void;
  userBalance?: number;
  onCoinsConsumed?: () => void;
  isLoggedIn?: boolean;
}

/** Compute a fingerprint from report IDs to detect changes */
function reportsFingerprint(reports: SavedReport[]): string {
  return reports
    .filter(r => r.report_type === 'weekly_report')
    .map(r => r.id)
    .sort()
    .join(',');
}

export function ReportTrendView({ reports, onNavigateToReport, userBalance, onCoinsConsumed, isLoggedIn = false }: ReportTrendViewProps) {
  const t = useTranslations('analysis.reportTrend');
  const locale = useLocale();

  // Bug 5: Restore cached trend summary from sessionStorage on mount
  const [trendSummary, setTrendSummary] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      // Only restore if reports haven't changed
      if (parsed.fingerprint === reportsFingerprint(reports)) {
        return parsed.summary;
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    } catch {
      return null;
    }
  });
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  // M4: In-flight guard to prevent double-click
  const inFlightRef = useRef(false);
  // M5: AbortController for fetch cancellation on unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  // Bug 5: Clear cached summary when reports change
  const prevFingerprintRef = useRef(reportsFingerprint(reports));
  useEffect(() => {
    const current = reportsFingerprint(reports);
    if (current !== prevFingerprintRef.current) {
      prevFingerprintRef.current = current;
      setTrendSummary(null);
      try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* noop */ }
    }
  }, [reports]);

  // M5: Abort in-flight fetch on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Extract metrics from report metadata, sorted oldest-first for chart
  const trendData = useMemo<TrendDataPoint[]>(() => {
    // Filter only weekly reports (they have consistent metrics in metadata)
    const weeklyReports = reports
      .filter(r => r.report_type === 'weekly_report')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-12); // Last 12 reports max

    return weeklyReports.map((r, idx) => {
      const meta = r.metadata || {};
      const date = (meta.generatedAt as string) || r.created_at;
      const displayDate = new Date(date).toLocaleDateString(
        locale === 'ko' ? 'ko-KR' : 'en-US',
        { month: 'short', day: 'numeric' }
      );

      const point: TrendDataPoint = {
        index: idx,
        date,
        displayDate,
        reportId: r.id,
      };

      if (typeof meta.winRate === 'number') point.winRate = meta.winRate;
      if (typeof meta.totalTrades === 'number') point.totalTrades = meta.totalTrades;
      if (typeof meta.pnlPercent === 'number') point.pnlPercent = meta.pnlPercent;
      if (typeof meta.rrRatio === 'number') point.rrRatio = meta.rrRatio;

      return point;
    });
  }, [reports, locale]);

  // Which metrics have at least 2 data points
  const availableMetrics = useMemo(() => {
    const metrics: { key: keyof TrendDataPoint; label: string; color: string }[] = [];
    const countWith = (key: keyof TrendDataPoint) => trendData.filter(d => d[key] != null).length;

    if (countWith('winRate') >= 2) metrics.push({ key: 'winRate', label: t('winRate'), color: TREND_COLORS.winRate });
    if (countWith('totalTrades') >= 2) metrics.push({ key: 'totalTrades', label: t('tradeCount'), color: TREND_COLORS.tradeCount });
    if (countWith('pnlPercent') >= 2) metrics.push({ key: 'pnlPercent', label: t('pnlPercent'), color: TREND_COLORS.pnlPercent });
    if (countWith('rrRatio') >= 2) metrics.push({ key: 'rrRatio', label: t('rrRatio'), color: TREND_COLORS.rrRatio });

    return metrics;
  }, [trendData, t]);

  // Bug 3: Handle click on chart data point to navigate to that report
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = useCallback((data: any) => {
    const payload = data?.activePayload?.[0]?.payload;
    if (!payload?.reportId || !onNavigateToReport) return;
    onNavigateToReport(payload.reportId);
  }, [onNavigateToReport]);

  const cost = COIN_COSTS.report_trend;
  const canAfford = (userBalance ?? 0) >= cost;

  const requestTrendSummary = useCallback(async () => {
    if (!canAfford) return;
    // M4: Prevent double-click
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // M5: Abort previous request if any, create new controller
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingTrend(true);
    setTrendError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const trendPayload = trendData.map(d => ({
        date: d.displayDate,
        winRate: d.winRate,
        totalTrades: d.totalTrades,
        pnlPercent: d.pnlPercent,
        rrRatio: d.rrRatio,
      }));

      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'report_trend',
          trendData: trendPayload,
          locale,
        }),
        signal: controller.signal,
      });

      if (res.status === 402) {
        setTrendError(t('coinShort', { balance: userBalance ?? 0, cost }));
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || 'Unknown error');
      }

      const data = await res.json();
      setTrendSummary(data.report);
      onCoinsConsumed?.();

      // Bug 5: Persist to sessionStorage
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          summary: data.report,
          fingerprint: reportsFingerprint(reports),
        }));
      } catch { /* sessionStorage full or unavailable */ }
    } catch (err) {
      // M5: Don't set error state if request was aborted
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setTrendError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      inFlightRef.current = false;
      setLoadingTrend(false);
    }
  }, [canAfford, trendData, locale, t, userBalance, cost, onCoinsConsumed, reports]);

  // Guest mode guard
  if (!isLoggedIn) {
    return (
      <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white">{t('title')}</h3>
        </div>
        <p className="text-sm text-white/40 text-center py-6">
          {t('guestNotice')}
        </p>
      </div>
    );
  }

  // Empty state: less than 2 weekly reports
  if (trendData.length < 2) {
    return (
      <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white">{t('title')}</h3>
        </div>
        <p className="text-sm text-white/40 text-center py-6">
          {t('emptyState')}
        </p>
      </div>
    );
  }

  // No usable metrics even though reports exist
  if (availableMetrics.length === 0) {
    return (
      <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white">{t('title')}</h3>
        </div>
        <p className="text-sm text-white/40 text-center py-6">
          {t('noMetrics')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={16} className="text-indigo-400" />
        <h3 className="text-sm font-bold text-white">{t('title')}</h3>
        <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
          {trendData.length} {t('reports')}
        </span>
      </div>

      {/* Chart */}
      <div className="mt-4 -ml-2">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={trendData}
            onClick={handleChartClick}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            {/* Bug 1 fix: Use numeric index as dataKey for correct tooltip alignment,
                render displayDate as the tick label via tickFormatter */}
            <XAxis
              dataKey="index"
              type="number"
              domain={[0, trendData.length - 1]}
              tickCount={trendData.length}
              tickFormatter={(idx: number) => trendData[idx]?.displayDate ?? ''}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 30, 46, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.8)',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
              labelFormatter={(idx: number) => trendData[idx]?.displayDate ?? ''}
              cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}
            />
            {availableMetrics.map(m => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={{ r: 4, fill: m.color, strokeWidth: 0, cursor: 'pointer' }}
                activeDot={{ r: 6, fill: m.color, strokeWidth: 2, stroke: '#fff' }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI Trend Summary section */}
      <div className="mt-4 pt-4 border-t border-white/5">
        {trendSummary ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-white/70">{t('aiTrendTitle')}</span>
            </div>
            <div className="text-sm text-white/60 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {trendSummary}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={requestTrendSummary}
              disabled={loadingTrend || !canAfford}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                canAfford
                  ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {loadingTrend ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('aiTrendLoading')}
                </>
              ) : canAfford ? (
                <>
                  <Sparkles size={14} />
                  {t('aiTrendButton', { cost })}
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  {t('coinShort', { balance: userBalance ?? 0, cost })}
                </>
              )}
            </button>
          </div>
        )}
        {trendError && !trendSummary && (
          <p className="text-xs text-red-400 mt-2">{trendError}</p>
        )}
      </div>
    </div>
  );
}
