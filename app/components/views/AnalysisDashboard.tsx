import React, { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import {
  TradeAnalysis,
  PatternStats,
  InsightItem,
  GRADE_COLORS,
} from '@/app/types/analysis';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
  AreaChart, Area,
  RadarChart, Radar, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
} from 'recharts';
import {
  Brain, TrendingUp, Zap, Shield,
  Calendar, Clock, Heart,
  AlertTriangle, CheckCircle, Info, XCircle,
  ChevronDown, MessageSquare, Gem, Sparkles, RefreshCw,
  BarChart2, Bot, ListOrdered, Award, Briefcase, Share2, Grid3X3, ArrowUpRight, ArrowDownRight, Minus, GitCompareArrows,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AIReportCard } from '@/app/components/AIReportCard';
import { AIReportHistory } from '@/app/components/AIReportHistory';
import { PortfolioView } from '@/app/components/PortfolioView';
import { PerformanceShareCard } from '@/app/components/PerformanceShareCard';
import { useAIAnalysis } from '@/app/hooks/useAIAnalysis';
import { calcEquityCurve, calcMonthlyStats, calcSymbolMonthlyHeatmap, calcPeriodComparison, getAvailableMonths } from '@/app/utils/tradeAnalysis';
import type { RoundTrip, HeatmapCell } from '@/app/types/analysis';
import type { PortfolioSummary } from '@/app/hooks/usePortfolio';

interface AnalysisDashboardProps {
  analysis: TradeAnalysis | null;
  darkMode: boolean;
  tradesCount: number;
  buyCount?: number;
  sellCount?: number;
  currentUser: User | null;
  username?: string;
  coinBalance?: number;
  exchangeRate?: number;
  onChargeCoins?: () => void;
  onCoinsConsumed?: () => void;
  onCompleteAIReportStep?: () => void;
  portfolio?: PortfolioSummary;
  pricesLoading?: boolean;
  onRefreshPrices?: () => void;
  initialTab?: DashboardTab;
}

// ─── Chart Colors ────────────────────────────────────────────────────────

const CHART_COLORS = {
  positive: '#34d399',
  negative: '#f87171',
  neutral: '#94a3b8',
  bar: '#818cf8',
  pie: ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb923c', '#a78bfa', '#4ade80'],
};

function getBarColor(value: number): string {
  if (value > 0) return CHART_COLORS.positive;
  if (value < 0) return CHART_COLORS.negative;
  return CHART_COLORS.neutral;
}

function formatPnl(pnl: number, currency?: 'KRW' | 'USD' | 'mixed'): string {
  if (currency === 'USD') return `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`;
  return `${pnl >= 0 ? '+' : ''}${pnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

// ─── Tab Types ────────────────────────────────────────────────────────────

type DashboardTab = 'performance' | 'charts' | 'portfolio' | 'ai' | 'trades';

const TAB_IDS: { id: DashboardTab; icon: React.ReactNode }[] = [
  { id: 'performance', icon: <Award size={14} /> },
  { id: 'charts',      icon: <BarChart2 size={14} /> },
  { id: 'portfolio',   icon: <Briefcase size={14} /> },
  { id: 'ai',          icon: <Bot size={14} /> },
  { id: 'trades',      icon: <ListOrdered size={14} /> },
];

// ─── Empty State ─────────────────────────────────────────────────────────

function EmptyState({ count, buyCount = 0, sellCount = 0 }: { count: number; buyCount?: number; sellCount?: number }) {
  const t = useTranslations('analysis.empty');

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
          <Brain size={36} className="text-white/20" />
        </div>
        <h3 className="text-xl font-bold text-white/60 mb-2">{t('noDataTitle')}</h3>
        <p className="text-sm text-white/30 max-w-md">
          {t('noDataDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <Brain size={36} className="text-white/20" />
      </div>
      <h3 className="text-xl font-bold text-white/60 mb-2">{t('noRoundTripsTitle')}</h3>
      <p className="text-sm text-white/30 max-w-md mb-6">
        {t('noRoundTripsDesc')}
      </p>

      {/* Current trade status */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <TrendingUp size={13} className="text-blue-400" />
          <span className="text-xs font-bold text-blue-400">{t('buyCount', { count: buyCount })}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <TrendingUp size={13} className="text-rose-400" />
          <span className="text-xs font-bold text-rose-400">{t('sellCount', { count: sellCount })}</span>
        </div>
      </div>

      {/* Explanation card */}
      <div className="w-full max-w-sm p-4 rounded-2xl border border-white/8 bg-white/3 text-left">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-indigo-400 flex-none" />
          <span className="text-xs font-bold text-white/60">{t('roundTripTitle')}</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="text-xs text-white/20 flex-none mt-0.5">1.</span>
            <span className="text-xs text-white/40 leading-relaxed">{t.rich('roundTripStep1', { bold: (chunks) => <span className="text-white/60 font-semibold">{chunks}</span> })}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-white/20 flex-none mt-0.5">2.</span>
            <span className="text-xs text-white/40 leading-relaxed">{t.rich('roundTripStep2', { bold: (chunks) => <span className="text-white/60 font-semibold">{chunks}</span> })}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-white/20 flex-none mt-0.5">3.</span>
            <span className="text-xs text-white/40 leading-relaxed">{t.rich('roundTripStep3', { bold: (chunks) => <span className="text-white/60 font-semibold">{chunks}</span> })}</span>
          </div>
        </div>
        {buyCount > 0 && sellCount === 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
              <AlertTriangle size={12} className="flex-none" />
              {t('addSellHint')}
            </p>
          </div>
        )}
        {buyCount === 0 && sellCount > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
              <AlertTriangle size={12} className="flex-none" />
              {t('addBuyHint')}
            </p>
          </div>
        )}
        {buyCount > 0 && sellCount > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
              <AlertTriangle size={12} className="flex-none" />
              {t('checkSymbolHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Equity Curve ─────────────────────────────────────────────────────────

type CurvePeriod = '1M' | '3M' | 'ALL';

function EquityCurveSection({ analysis, exchangeRate = 1 }: { analysis: TradeAnalysis; exchangeRate?: number }) {
  const [period, setPeriod] = useState<CurvePeriod>('ALL');
  const locale = useLocale();
  const t = useTranslations('analysis.equityCurve');

  // EN: normalize to USD, KO: normalize to KRW
  const normalizedTrips = useMemo(() => {
    const trips = analysis.roundTrips;
    const hasMixed = trips.length > 1 && trips.some(t => t.currency !== trips[0]?.currency);
    if (!hasMixed) return trips;
    if (locale === 'ko') {
      // KO: convert USD → KRW
      return trips.map(t => ({
        ...t,
        pnl: t.currency === 'KRW' ? t.pnl : t.pnl * exchangeRate,
        currency: 'KRW' as const,
      }));
    }
    // EN: convert KRW → USD
    return trips.map(t => ({
      ...t,
      pnl: t.currency === 'USD' ? t.pnl : t.pnl / exchangeRate,
      currency: 'USD' as const,
    }));
  }, [analysis.roundTrips, exchangeRate, locale]);

  const isMixed = analysis.roundTrips.length > 1 &&
    analysis.roundTrips.some(t => t.currency !== analysis.roundTrips[0]?.currency);
  // EN: default to USD, KO: default to KRW
  const isKRW = isMixed ? locale === 'ko' : analysis.roundTrips[0]?.currency === 'KRW';

  const rawCurve = useMemo(() => calcEquityCurve(normalizedTrips, locale), [normalizedTrips, locale]);

  const filtered = useMemo(() => {
    if (period === 'ALL') return rawCurve;
    const now = new Date();
    const monthsBack = period === '1M' ? 1 : 3;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate());
    return rawCurve.filter(p => new Date(p.date) >= cutoff);
  }, [rawCurve, period]);

  if (filtered.length === 0) return null;

  const maxPnl = Math.max(...filtered.map(p => p.cumulativePnl));
  const minPnl = Math.min(...filtered.map(p => p.cumulativePnl));
  const lastPnl = filtered[filtered.length - 1]?.cumulativePnl ?? 0;
  const isProfit = lastPnl >= 0;

  const formatVal = (v: number) => {
    if (locale !== 'ko') {
      // EN: always show USD
      const usdVal = isKRW ? v / exchangeRate : v;
      return `${usdVal >= 0 ? '+' : '-'}$${Math.abs(usdVal).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    // KO: show KRW for KRW stocks, USD for USD stocks
    return isKRW
      ? `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ko-KR')}원`
      : `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`;
  };

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className={isProfit ? 'text-emerald-400' : 'text-red-400'} />
            <h3 className="text-sm font-bold text-white">{t('title')}</h3>
            {isMixed && (
              <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{t('usdToKrw')}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`text-lg font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatVal(lastPnl)}
            </span>
            <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
              {t('highest', { value: formatVal(maxPnl) })}
            </span>
            {minPnl < 0 && (
              <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                {t('lowest', { value: formatVal(minPnl) })}
              </span>
            )}
          </div>
        </div>
        {/* Period Toggle */}
        <div className="flex p-0.5 rounded-lg bg-white/5 border border-white/8 gap-0.5">
          {(['1M', '3M', 'ALL'] as CurvePeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                period === p ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={filtered} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="equityGradientPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="equityGradientNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v: number) => {
              if (locale !== 'ko') {
                const usdVal = isKRW ? v / exchangeRate : v;
                const sign = usdVal < 0 ? '-' : '';
                const abs = Math.abs(usdVal);
                return abs >= 1000 ? `${sign}$${Math.round(abs / 1000)}K` : `${sign}$${Math.round(abs)}`;
              }
              return isKRW ? `${(v / 10000).toFixed(0)}만` : `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(0)}`;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(20,22,32,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#fff',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
            formatter={(value: number | undefined) => [formatVal(value ?? 0), t('cumulativePnl')]}
          />
          <Area
            type="monotone"
            dataKey="cumulativePnl"
            stroke={isProfit ? CHART_COLORS.positive : CHART_COLORS.negative}
            strokeWidth={2}
            fill={isProfit ? 'url(#equityGradientPos)' : 'url(#equityGradientNeg)'}
            dot={false}
            activeDot={{ r: 4, fill: isProfit ? CHART_COLORS.positive : CHART_COLORS.negative }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Profile Card & Badges ────────────────────────────────────────────────

interface BadgeDef {
  id: string;
  icon: string;
  label: string;
  unlocked: boolean;
  desc: string;
}

function buildBadges(analysis: TradeAnalysis, t: (key: string) => string): BadgeDef[] {
  const { roundTrips, profile, streaks } = analysis;
  return [
    { id: 'first_trade', icon: '🎯', label: t('firstTrade'), unlocked: roundTrips.length >= 1, desc: t('firstTradeDesc') },
    { id: 'ten_trades', icon: '🏅', label: t('tenTrades'), unlocked: roundTrips.length >= 10, desc: t('tenTradesDesc') },
    { id: 'win_streak_3', icon: '🔥', label: t('winStreak3'), unlocked: streaks.maxWin >= 3, desc: t('winStreak3Desc') },
    { id: 'win_streak_5', icon: '⚡', label: t('winStreak5'), unlocked: streaks.maxWin >= 5, desc: t('winStreak5Desc') },
    { id: 'high_winrate', icon: '👑', label: t('highWinRate'), unlocked: profile.winRate >= 70 && roundTrips.length >= 5, desc: t('highWinRateDesc') },
    { id: 'profit_factor', icon: '💰', label: t('profitFactor2'), unlocked: profile.profitFactor >= 2, desc: t('profitFactor2Desc') },
    { id: 'grade_a', icon: '🏆', label: t('gradeA'), unlocked: profile.overallGrade === 'A' || profile.overallGrade === 'A+', desc: t('gradeADesc') },
    { id: 'no_fomo', icon: '🧘', label: t('noFomo'), unlocked: roundTrips.length >= 5 && roundTrips.filter(tr => tr.emotionTag === 'FOMO').length === 0, desc: t('noFomoDesc') },
  ];
}

function ProfileCard({ analysis }: { analysis: TradeAnalysis }) {
  const { profile } = analysis;
  const gradeColor = GRADE_COLORS[profile.overallGrade];
  const tp = useTranslations('analysis.profile');
  const tb = useTranslations('analysis.badges');
  const badges = buildBadges(analysis, tb);
  const unlockedBadges = badges.filter(b => b.unlocked);

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
          <Brain size={20} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{tp('title')}</h3>
          <p className="text-xs text-white/30">{tp('subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-2xl font-black ${gradeColor}`}>{profile.overallGrade}</div>
          <div className="text-xs text-white/30 font-medium mt-1">{tp('overallGrade')}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className="text-sm font-bold text-white">{profile.tradingStyleLabel}</div>
          <div className="text-xs text-white/30 font-medium mt-1">{tp('tradingStyle')}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-lg font-bold ${profile.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profile.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-white/30 font-medium mt-1">{tp('winRate')}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-sm font-bold ${
            profile.riskLevel === 'low' ? 'text-emerald-400' :
            profile.riskLevel === 'medium' ? 'text-yellow-400' :
            profile.riskLevel === 'high' ? 'text-orange-400' : 'text-red-400'
          }`}>
            {profile.riskLevelLabel}
          </div>
          <div className="text-xs text-white/30 font-medium mt-1">{tp('riskLevel')}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
        <MetricBadge label={tp('completedTrades')} value={`${profile.totalTrades}`} />
        <MetricBadge label={tp('avgReturn')} value={`${profile.avgReturn >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%`}
          color={profile.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <MetricBadge label={tp('profitFactor')} value={profile.profitFactor.toFixed(2)}
          color={profile.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'} />
        <MetricBadge label={tp('avgHoldingDays')} value={`${profile.avgHoldingDays.toFixed(0)}`} />
        <MetricBadge label={tp('consistency')} value={`${profile.consistencyScore.toFixed(0)}`}
          color={profile.consistencyScore >= 60 ? 'text-emerald-400' : 'text-orange-400'} />
      </div>

      {/* Achievement Badges */}
      {badges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={13} className="text-yellow-400" />
            <span className="text-xs font-bold text-white/60">{tp('achievementBadges')}</span>
            <span className="text-xs text-white/20">({unlockedBadges.length}/{badges.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map(badge => (
              <div
                key={badge.id}
                title={badge.desc}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  badge.unlocked
                    ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
                    : 'bg-white/3 text-white/15 border border-white/5 grayscale'
                }`}
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/3 text-center">
      <div className={`text-xs font-bold ${color || 'text-white'}`}>{value}</div>
      <div className="text-xs text-white/20 mt-0.5">{label}</div>
    </div>
  );
}

// ─── Radar Chart ──────────────────────────────────────────────────────────

function StyleRadarChart({ analysis }: { analysis: TradeAnalysis }) {
  const { profile, advancedMetrics } = analysis;
  const t = useTranslations('analysis.radar');

  const radarData = useMemo(() => {
    const pf = Math.min(100, (profile.profitFactor / 3) * 100);
    const drawdownScore = Math.max(0, 100 - profile.maxDrawdownPercent * 2);
    const timingScore = Math.min(100, Math.max(0, 50 + advancedMetrics.timing.holdingEdge * 2));
    const disciplineScore = advancedMetrics.biasScore.biasScore;

    return [
      { axis: t('winRate'), value: Math.round(profile.winRate) },
      { axis: t('profitFactor'), value: Math.round(pf) },
      { axis: t('consistency'), value: Math.round(profile.consistencyScore) },
      { axis: t('riskManagement'), value: Math.round(drawdownScore) },
      { axis: t('timing'), value: Math.round(timingScore) },
      { axis: t('discipline'), value: Math.round(disciplineScore) },
    ];
  }, [profile, advancedMetrics, t]);

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-indigo-400" />
        <h3 className="text-sm font-bold text-white">{t('title')}</h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }}
            tickCount={4}
          />
          <Radar
            dataKey="value"
            stroke="#818cf8"
            fill="#818cf8"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(20,22,32,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#fff',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
            formatter={(value: number | undefined) => [`${value ?? 0}${t('scoreUnit')}`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: InsightItem }) {
  const iconMap = {
    positive: <CheckCircle size={16} className="text-emerald-400" />,
    warning: <AlertTriangle size={16} className="text-yellow-400" />,
    neutral: <Info size={16} className="text-blue-400" />,
    critical: <XCircle size={16} className="text-red-400" />,
  };
  const bgMap = {
    positive: 'border-emerald-500/15 bg-emerald-500/5',
    warning: 'border-yellow-500/15 bg-yellow-500/5',
    neutral: 'border-blue-500/15 bg-blue-500/5',
    critical: 'border-red-500/15 bg-red-500/5',
  };

  return (
    <div className={`p-4 rounded-xl border ${bgMap[insight.type]} transition-colors hover:brightness-110`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-none">{iconMap[insight.type]}</div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>{insight.icon}</span>
            <span className="truncate">{insight.title}</span>
          </div>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar Chart ──────────────────────────────────────────────────────

function StatsBarChart({ data, title, icon, dataKey = 'avgReturn' }: {
  data: PatternStats[];
  title: string;
  icon: React.ReactNode;
  dataKey?: 'avgReturn' | 'winRate';
}) {
  const tc = useTranslations('analysis.charts');
  const filteredData = data.filter(d => d.count > 0);
  if (filteredData.length === 0) return null;
  const label = dataKey === 'avgReturn' ? tc('avgReturnLabel') : tc('winRateLabel');

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={filteredData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(20,22,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, label]}
          />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={40}>
            {filteredData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry[dataKey])} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-2 mt-2 flex-wrap items-center">
        <span className="text-xs text-white/30">{tc('tradeCount')}:</span>
        {filteredData.map((d, i) => (
          <span key={i} className="text-xs text-white/20">{d.label}: {d.count}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Monthly Bar Chart ────────────────────────────────────────────────────

function MonthlyBarChart({ analysis, exchangeRate = 1 }: { analysis: TradeAnalysis; exchangeRate?: number }) {
  const locale = useLocale();
  const numLocale = locale === 'ko' ? 'ko-KR' : 'en-US';
  const tc = useTranslations('analysis.charts');

  // EN: normalize to USD, KO: normalize to KRW
  const normalizedTrips = useMemo(() => {
    const trips = analysis.roundTrips;
    const hasMixed = trips.length > 1 && trips.some(t => t.currency !== trips[0]?.currency);
    if (!hasMixed) return trips;
    if (locale === 'ko') {
      return trips.map(t => ({
        ...t,
        pnl: t.currency === 'KRW' ? t.pnl : t.pnl * exchangeRate,
        currency: 'KRW' as const,
      }));
    }
    return trips.map(t => ({
      ...t,
      pnl: t.currency === 'USD' ? t.pnl : t.pnl / exchangeRate,
      currency: 'USD' as const,
    }));
  }, [analysis.roundTrips, exchangeRate, locale]);

  const monthlyData = useMemo(() => calcMonthlyStats(normalizedTrips, locale), [normalizedTrips, locale]);

  if (monthlyData.length < 2) return null;

  const isMixed = analysis.roundTrips.length > 1 &&
    analysis.roundTrips.some(t => t.currency !== analysis.roundTrips[0]?.currency);
  const isKRW = isMixed ? locale === 'ko' : analysis.roundTrips[0]?.currency === 'KRW';

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-cyan-400" />
        <h3 className="text-sm font-bold text-white">{tc('monthlyPnl')}</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              if (locale !== 'ko') {
                const usdVal = isKRW ? v / exchangeRate : v;
                const sign = usdVal < 0 ? '-' : '';
                const abs = Math.abs(usdVal);
                return abs >= 1000 ? `${sign}$${Math.round(abs / 1000)}K` : `${sign}$${Math.round(abs)}`;
              }
              return isKRW ? `${(v / 10000).toFixed(0)}만` : `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(0)}`;
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(20,22,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
            formatter={(value: number | undefined) => {
              const v = value ?? 0;
              if (locale !== 'ko') {
                const usdVal = isKRW ? v / exchangeRate : v;
                return [`${usdVal >= 0 ? '+' : '-'}$${Math.abs(usdVal).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, tc('monthlyPnlLabel')];
              }
              return [
                isKRW ? `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString(numLocale)}원` : `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`,
                tc('monthlyPnlLabel')
              ];
            }}
          />
          <Bar dataKey="totalPnl" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {monthlyData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.totalPnl)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-2 mt-2 flex-wrap items-center">
        <span className="text-xs text-white/30">{tc('tradeCount')}:</span>
        {monthlyData.map((d, i) => (
          <span key={i} className={`text-xs ${d.totalPnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
            {d.label}: {d.tradeCount}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Concentration Chart ──────────────────────────────────────────────────

function ConcentrationChart({ data }: { data: { symbol: string; symbolName?: string; percentage: number; isRisky: boolean }[] }) {
  const tc = useTranslations('analysis.charts');
  if (data.length === 0) return null;
  const chartData = data.map(d => ({ name: d.symbolName || d.symbol, value: Math.round(d.percentage * 10) / 10 }));

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-orange-400" />
        <h3 className="text-sm font-bold text-white">{tc('concentration')}</h3>
      </div>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={180}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(20,22,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
              formatter={(value: number | undefined) => [`${value ?? 0}%`, tc('concentrationPercent')]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-sm flex-none" style={{ backgroundColor: CHART_COLORS.pie[i % CHART_COLORS.pie.length] }} />
                <span className="text-xs text-white/60 truncate">{d.symbolName || d.symbol}</span>
              </div>
              <span className={`text-xs font-bold flex-none ${d.isRisky ? 'text-orange-400' : 'text-white/40'}`}>
                {d.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Symbol Heatmap Section ──────────────────────────────────────────────

function HeatmapSection({ analysis, exchangeRate = 1, onCellClick }: {
  analysis: TradeAnalysis;
  exchangeRate?: number;
  onCellClick?: (cell: HeatmapCell) => void;
}) {
  const tc = useTranslations('analysis.charts');
  const locale = useLocale();

  const { rows, months } = useMemo(
    () => calcSymbolMonthlyHeatmap(analysis.roundTrips),
    [analysis.roundTrips]
  );

  if (rows.length === 0) {
    return (
      <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
        <div className="flex items-center gap-2 mb-3">
          <Grid3X3 size={16} className="text-purple-400" />
          <h3 className="text-sm font-bold text-white">{tc('heatmapTitle')}</h3>
        </div>
        <p className="text-xs text-white/30">{tc('heatmapEmpty')}</p>
      </div>
    );
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatMonth = (m: string) => {
    const [year, mon] = m.split('-');
    return locale === 'ko'
      ? `${parseInt(mon)}월`
      : `${monthNames[parseInt(mon) - 1]}`;
  };

  const getCellColor = (avgReturn: number): string => {
    // Korean convention: red = profit, blue = loss
    if (avgReturn > 10) return 'rgba(239,68,68,0.7)';
    if (avgReturn > 5) return 'rgba(239,68,68,0.5)';
    if (avgReturn > 0) return 'rgba(239,68,68,0.25)';
    if (avgReturn === 0) return 'rgba(148,163,184,0.15)';
    if (avgReturn > -5) return 'rgba(59,130,246,0.25)';
    if (avgReturn > -10) return 'rgba(59,130,246,0.5)';
    return 'rgba(59,130,246,0.7)';
  };

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Grid3X3 size={16} className="text-purple-400" />
        <h3 className="text-sm font-bold text-white">{tc('heatmapTitle')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-white/30 font-normal pb-2 pr-2 min-w-[80px]"></th>
              {months.map(m => (
                <th key={m} className="text-center text-white/30 font-normal pb-2 px-1 min-w-[60px]">
                  {formatMonth(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.symbol}>
                <td className="text-white/60 font-medium pr-2 py-1 truncate max-w-[100px]" title={row.symbolName || row.symbol}>
                  {row.symbolName || row.symbol}
                </td>
                {months.map(m => {
                  const cell = row.cells.get(m);
                  if (!cell) {
                    return (
                      <td key={m} className="px-1 py-1">
                        <div className="rounded-md h-10 flex items-center justify-center" style={{ backgroundColor: 'rgba(148,163,184,0.05)' }}>
                          <span className="text-white/10">{tc('heatmapNoData')}</span>
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={m} className="px-1 py-1">
                      <button
                        onClick={() => onCellClick?.(cell)}
                        className="rounded-md h-10 w-full flex flex-col items-center justify-center cursor-pointer hover:ring-1 hover:ring-white/20 transition-all"
                        style={{ backgroundColor: getCellColor(cell.avgReturn) }}
                        title={`${cell.symbol} - ${cell.tradeCount} ${tc('heatmapTrades')}`}
                      >
                        <span className="text-white font-bold text-[11px]">
                          {cell.avgReturn >= 0 ? '+' : ''}{cell.avgReturn.toFixed(1)}%
                        </span>
                        <span className="text-white/50 text-[9px]">{cell.tradeCount}{tc('heatmapTrades')}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-white/30">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59,130,246,0.5)' }} />
          <span>{locale === 'ko' ? '손실' : 'Loss'}</span>
        </div>
        <div className="w-8 h-[2px] bg-gradient-to-r from-blue-500/50 via-slate-400/15 to-red-500/50 rounded" />
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.5)' }} />
          <span>{locale === 'ko' ? '수익' : 'Profit'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Period Comparison Section ───────────────────────────────────────────

function PeriodComparisonSection({ analysis, exchangeRate = 1 }: {
  analysis: TradeAnalysis;
  exchangeRate?: number;
}) {
  const tc = useTranslations('analysis.charts');
  const locale = useLocale();

  const availableMonths = useMemo(
    () => getAvailableMonths(analysis.roundTrips, locale),
    [analysis.roundTrips, locale]
  );

  const [monthA, setMonthA] = useState<string>('');
  const [monthB, setMonthB] = useState<string>('');

  // Auto-select last two months on mount
  useEffect(() => {
    if (availableMonths.length >= 2) {
      setMonthA(availableMonths[availableMonths.length - 2].value);
      setMonthB(availableMonths[availableMonths.length - 1].value);
    } else if (availableMonths.length === 1) {
      setMonthA(availableMonths[0].value);
    }
  }, [availableMonths]);

  const comparison = useMemo(() => {
    if (!monthA || !monthB) return null;
    return calcPeriodComparison(analysis.roundTrips, monthA, monthB, locale);
  }, [analysis.roundTrips, monthA, monthB, locale]);

  if (availableMonths.length < 2) return null;

  const ChangeIndicator = ({ value, suffix = '%', positiveIsGood = true }: { value: number; suffix?: string; positiveIsGood?: boolean }) => {
    if (Math.abs(value) < 0.01) return <Minus size={12} className="text-white/30" />;
    const isPositive = value > 0;
    const isGood = positiveIsGood ? isPositive : !isPositive;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
      </span>
    );
  };

  const metricCards = comparison ? [
    { label: tc('periodWinRate'), valueA: comparison.periodA.winRate, valueB: comparison.periodB.winRate, change: comparison.changes.winRate, suffix: '%', positiveIsGood: true },
    { label: tc('periodAvgReturn'), valueA: comparison.periodA.avgReturn, valueB: comparison.periodB.avgReturn, change: comparison.changes.avgReturn, suffix: '%', positiveIsGood: true },
    { label: tc('periodProfitFactor'), valueA: comparison.periodA.profitFactor, valueB: comparison.periodB.profitFactor, change: comparison.changes.profitFactor, suffix: '', positiveIsGood: true },
    { label: tc('periodMaxLoss'), valueA: comparison.periodA.maxLoss, valueB: comparison.periodB.maxLoss, change: comparison.changes.maxLoss, suffix: '%', positiveIsGood: true },
    { label: tc('periodTradeCount'), valueA: comparison.periodA.tradeCount, valueB: comparison.periodB.tradeCount, change: comparison.changes.tradeCount, suffix: '', positiveIsGood: true },
  ] : [];

  // Radar chart data: normalize to 0-100 scale
  const radarData = comparison ? [
    {
      metric: tc('periodWinRate'),
      A: comparison.periodA.winRate,
      B: comparison.periodB.winRate,
    },
    {
      metric: tc('periodAvgReturn'),
      A: Math.max(0, Math.min(100, (comparison.periodA.avgReturn + 50))),
      B: Math.max(0, Math.min(100, (comparison.periodB.avgReturn + 50))),
    },
    {
      metric: tc('periodProfitFactor'),
      A: Math.min(100, (comparison.periodA.profitFactor === Infinity ? 100 : comparison.periodA.profitFactor * 20)),
      B: Math.min(100, (comparison.periodB.profitFactor === Infinity ? 100 : comparison.periodB.profitFactor * 20)),
    },
    {
      metric: tc('periodTradeCount'),
      A: Math.min(100, comparison.periodA.tradeCount * 10),
      B: Math.min(100, comparison.periodB.tradeCount * 10),
    },
  ] : [];

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <GitCompareArrows size={16} className="text-cyan-400" />
        <h3 className="text-sm font-bold text-white">{tc('periodCompareTitle')}</h3>
      </div>

      {/* Period Selectors */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-white/30 mb-1 block">{tc('periodA')}</label>
          <select
            value={monthA}
            onChange={e => setMonthA(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/20"
          >
            {availableMonths.map(m => (
              <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/30 mb-1 block">{tc('periodB')}</label>
          <select
            value={monthB}
            onChange={e => setMonthB(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/20"
          >
            {availableMonths.map(m => (
              <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!comparison && (
        <p className="text-xs text-white/30 text-center py-4">{tc('periodSelectHint')}</p>
      )}

      {comparison && (comparison.periodA.tradeCount === 0 && comparison.periodB.tradeCount === 0) && (
        <p className="text-xs text-white/30 text-center py-4">{tc('periodNoData')}</p>
      )}

      {comparison && (comparison.periodA.tradeCount > 0 || comparison.periodB.tradeCount > 0) && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {metricCards.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="text-[10px] text-white/30 mb-1">{m.label}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-white/40">{m.valueA.toFixed(1)}{m.suffix}</span>
                    <span className="text-white/20">→</span>
                    <span className="text-sm font-bold text-white">{m.valueB === Infinity ? '∞' : m.valueB.toFixed(1)}{m.suffix}</span>
                  </div>
                  <ChangeIndicator value={m.change} suffix={m.suffix} positiveIsGood={m.positiveIsGood} />
                </div>
              </div>
            ))}
          </div>

          {/* Radar Chart Overlay */}
          <div className="mt-4">
            <div className="flex items-center justify-center gap-4 mb-2 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-[2px] rounded" style={{ backgroundColor: '#818cf8' }} />
                <span className="text-white/40">{comparison.periodA.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-[2px] rounded" style={{ backgroundColor: '#f472b6' }} />
                <span className="text-white/40">{comparison.periodB.label}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
                <Radar name={comparison.periodA.label} dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} strokeWidth={2} />
                <Radar name={comparison.periodB.label} dataKey="B" stroke="#f472b6" fill="#f472b6" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(20,22,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Streaks Card ─────────────────────────────────────────────────────────

function StreaksCard({ streaks }: { streaks: { currentWin: number; currentLoss: number; maxWin: number; maxLoss: number } }) {
  const t = useTranslations('analysis.streaks');
  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-yellow-400" />
        <h3 className="text-sm font-bold text-white">{t('title')}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
          <div className="text-lg font-black text-emerald-400">{streaks.currentWin}</div>
          <div className="text-xs text-white/30">{t('currentWin')}</div>
        </div>
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
          <div className="text-lg font-black text-red-400">{streaks.currentLoss}</div>
          <div className="text-xs text-white/30">{t('currentLoss')}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className="text-lg font-bold text-white">{streaks.maxWin}</div>
          <div className="text-xs text-white/30">{t('maxWin')}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className="text-lg font-bold text-white">{streaks.maxLoss}</div>
          <div className="text-xs text-white/30">{t('maxLoss')}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Round Trip List ──────────────────────────────────────────────────────

function RoundTripList({
  roundTrips, onReviewTrade, tradeReview, loadingReview, coinBalance = 0, isLoggedIn = true, onChargeCoins,
}: {
  roundTrips: TradeAnalysis['roundTrips'];
  onReviewTrade: (trip: TradeAnalysis['roundTrips'][0]) => void;
  tradeReview: Record<string, { report: string; generatedAt: string }>;
  loadingReview: string | null;
  coinBalance?: number;
  isLoggedIn?: boolean;
  onChargeCoins?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('analysis.roundTrips');
  const ta = useTranslations('analysis.aiReport');
  const tc = useTranslations('common');
  const visibleTrips = expanded ? roundTrips : roundTrips.slice(0, 5);
  if (roundTrips.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <h3 className="text-sm font-bold text-white">{t('title')}</h3>
          <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{tc('count', { count: roundTrips.length })}</span>
        </div>
        {roundTrips.length > 5 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
            {expanded ? t('collapse') : t('showMore')}
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {visibleTrips.map((trip, i) => {
          const key = `${trip.symbol}-${trip.entryDate}`;
          const review = tradeReview[key];
          const isLoadingThis = loadingReview === key;

          return (
            <div key={i} className="rounded-xl bg-white/3 hover:bg-white/4 transition-colors">
              <div className="flex items-center gap-3 p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-none ${trip.isWin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {trip.pnlPercent >= 0 ? '+' : ''}{trip.pnlPercent.toFixed(0)}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{trip.symbolName || trip.symbol}</div>
                  <div className="text-xs text-white/30">{trip.entryDate} → {trip.exitDate} ({trip.holdingDays}{tc('days')})</div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <div className={`text-xs font-bold ${trip.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPnl(trip.pnl, trip.currency)}
                  </div>
                  {!isLoggedIn ? (
                    <div className="text-xs text-white/20 px-1">{tc('loginRequired')}</div>
                  ) : review ? (
                    <button onClick={() => onReviewTrade(trip)} disabled={isLoadingThis}
                      className={`p-1.5 rounded-lg transition-colors ${isLoadingThis ? 'text-indigo-300 bg-indigo-500/10 animate-pulse' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'}`}>
                      {isLoadingThis ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                    </button>
                  ) : isLoadingThis ? (
                    <button disabled className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-indigo-500/15 text-indigo-400 border-indigo-500/20 cursor-wait">
                      <RefreshCw size={10} className="animate-spin" />{t('analyzing')}
                    </button>
                  ) : coinBalance < 1 ? (
                    <button onClick={onChargeCoins} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/25 transition-all">
                      <Gem size={10} />{t('coinShort', { balance: coinBalance })}
                    </button>
                  ) : (
                    <button onClick={() => onReviewTrade(trip)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
                      <Sparkles size={10} />{t('reviewCost')}
                    </button>
                  )}
                </div>
              </div>
              {review && (
                <div className="px-3 pb-3">
                  <AIReportCard
                    title={ta('tradeReviewTitle')}
                    subtitle={`${trip.symbolName || trip.symbol} · ${trip.exitDate}`}
                    report={review.report}
                    generatedAt={review.generatedAt}
                    loading={isLoadingThis}
                    error={null}
                    onGenerate={() => onReviewTrade(trip)}
                    compact
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────

export function AnalysisDashboard({
  analysis,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  darkMode,
  tradesCount,
  buyCount = 0,
  sellCount = 0,
  currentUser,
  username,
  coinBalance = 0,
  exchangeRate = 1,
  onChargeCoins,
  onCoinsConsumed,
  onCompleteAIReportStep,
  portfolio,
  pricesLoading,
  onRefreshPrices,
  initialTab,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab ?? 'performance');
  const [showShareCard, setShowShareCard] = useState(false);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<HeatmapCell | null>(null);
  const t = useTranslations('analysis');
  const tc = useTranslations('common');
  const locale = useLocale();

  // initialTab prop이 변경되면 반영 (외부 네비게이션)
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab); // eslint-disable-line
  }, [initialTab]);

  const {
    weeklyReport, tradeReview, loadingWeekly, loadingReview, error: aiError,
    generateWeeklyReport, reviewTrade, clearWeeklyReport,
    savedReports, loadingSavedReports, deleteReport,
  } = useAIAnalysis(currentUser, onCoinsConsumed);

  if (!analysis || analysis.roundTrips.length === 0) {
    return <EmptyState count={tradesCount} buyCount={buyCount} sellCount={sellCount} />;
  }

  return (
    <div className="space-y-4">
      {/* Equity Curve — always at top */}
      <EquityCurveSection analysis={analysis} exchangeRate={exchangeRate} />

      {/* Tab Navigation */}
      <div className="flex p-1 rounded-xl bg-white/5 border border-white/8 gap-0.5">
        {TAB_IDS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white/12 text-white shadow-md'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{t(`tabs.${tab.id}`)}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          {/* Share Card Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowShareCard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs font-bold text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              <Share2 size={12} />
              {t('shareCard.generateBtn')}
            </button>
          </div>
          <ProfileCard analysis={analysis} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StyleRadarChart analysis={analysis} />
            <StreaksCard streaks={analysis.streaks} />
          </div>
          {analysis.insights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">{t('insights.title')}</h3>
                <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{tc('count', { count: analysis.insights.length })}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.insights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="space-y-4">
          <MonthlyBarChart analysis={analysis} exchangeRate={exchangeRate} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatsBarChart data={analysis.weekdayStats} title={t('charts.weekdayAvgReturn')} icon={<Calendar size={16} className="text-blue-400" />} dataKey="avgReturn" />
            <StatsBarChart data={analysis.holdingPeriodStats} title={t('charts.holdingPeriodReturn')} icon={<Clock size={16} className="text-cyan-400" />} dataKey="avgReturn" />
            <StatsBarChart data={analysis.emotionStats} title={t('charts.emotionTagWinRate')} icon={<Heart size={16} className="text-pink-400" />} dataKey="winRate" />
            <ConcentrationChart data={analysis.concentration} />
          </div>
          <HeatmapSection analysis={analysis} exchangeRate={exchangeRate} onCellClick={setSelectedHeatmapCell} />
          <PeriodComparisonSection analysis={analysis} exchangeRate={exchangeRate} />
        </div>
      )}

      {/* Heatmap Cell Detail Modal */}
      {selectedHeatmapCell && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center" onClick={() => setSelectedHeatmapCell(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-70 w-full max-w-md max-h-[80vh] bg-gray-900 border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">
                {selectedHeatmapCell.symbolName || selectedHeatmapCell.symbol} — {selectedHeatmapCell.month}
              </h3>
              <button onClick={() => setSelectedHeatmapCell(null)} className="text-white/30 hover:text-white/60">
                <XCircle size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {selectedHeatmapCell.roundTrips.map((trip, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                  <div>
                    <div className="text-xs text-white/60">{trip.entryDate} → {trip.exitDate}</div>
                    <div className="text-[10px] text-white/30">{trip.quantity}{locale === 'ko' ? '주' : ' shares'} · {trip.holdingDays}{locale === 'ko' ? '일' : 'd'}</div>
                  </div>
                  <span className={`text-sm font-bold ${trip.isWin ? 'text-red-400' : 'text-blue-400'}`}>
                    {trip.pnlPercent >= 0 ? '+' : ''}{trip.pnlPercent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <PortfolioView
          portfolio={portfolio ?? { holdings: [], totalCost: 0, totalMarketValue: null, totalUnrealizedPnl: null, totalUnrealizedPnlPercent: null, profitCount: 0, lossCount: 0, neutralCount: 0 }}
          exchangeRate={exchangeRate}
          pricesLoading={pricesLoading}
          onRefreshPrices={onRefreshPrices}
        />
      )}

      {activeTab === 'ai' && (
        <div className="space-y-4">
          <AIReportCard
            title={t('aiReport.weeklyTitle')}
            subtitle={t('aiReport.weeklySubtitle', { count: analysis.roundTrips.length })}
            report={weeklyReport?.report ?? null}
            generatedAt={weeklyReport?.generatedAt ?? null}
            loading={loadingWeekly}
            error={aiError}
            onGenerate={currentUser ? () => generateWeeklyReport(analysis, username, onCompleteAIReportStep) : undefined}
            onClear={clearWeeklyReport}
            coinCost={5}
            coinBalance={coinBalance}
            onChargeCoins={onChargeCoins}
            isLoggedIn={!!currentUser}
          />
          <AIReportHistory reports={savedReports} loading={loadingSavedReports} onDelete={deleteReport} />
        </div>
      )}

      {activeTab === 'trades' && (
        <RoundTripList
          roundTrips={analysis.roundTrips}
          onReviewTrade={reviewTrade}
          tradeReview={tradeReview}
          loadingReview={loadingReview}
          coinBalance={coinBalance}
          isLoggedIn={!!currentUser}
          onChargeCoins={onChargeCoins}
        />
      )}

      {/* Performance Share Card Modal */}
      <PerformanceShareCard
        analysis={analysis}
        isOpen={showShareCard}
        onClose={() => setShowShareCard(false)}
      />
    </div>
  );
}
