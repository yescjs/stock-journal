import React, { useState, useMemo } from 'react';
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
  BarChart2, Bot, ListOrdered, Award,
} from 'lucide-react';
import { AIReportCard } from '@/app/components/AIReportCard';
import { AIReportHistory } from '@/app/components/AIReportHistory';
import { useAIAnalysis } from '@/app/hooks/useAIAnalysis';
import { calcEquityCurve, calcMonthlyStats } from '@/app/utils/tradeAnalysis';

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
  if (currency === 'USD') return `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`;
  return `${pnl >= 0 ? '+' : ''}${pnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

// ─── Tab Types ────────────────────────────────────────────────────────────

type DashboardTab = 'performance' | 'charts' | 'ai' | 'trades';

const TABS: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
  { id: 'performance', label: '성과', icon: <Award size={14} /> },
  { id: 'charts',      label: '차트',  icon: <BarChart2 size={14} /> },
  { id: 'ai',          label: 'AI 분석', icon: <Bot size={14} /> },
  { id: 'trades',      label: '거래 목록', icon: <ListOrdered size={14} /> },
];

// ─── Empty State ─────────────────────────────────────────────────────────

function EmptyState({ count, buyCount = 0, sellCount = 0 }: { count: number; buyCount?: number; sellCount?: number }) {
  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
          <Brain size={36} className="text-white/20" />
        </div>
        <h3 className="text-xl font-bold text-white/60 mb-2">분석할 데이터가 부족합니다</h3>
        <p className="text-sm text-white/30 max-w-md">
          매매 기록을 추가하면 AI가 투자 패턴을 분석하고 맞춤형 인사이트를 제공합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <Brain size={36} className="text-white/20" />
      </div>
      <h3 className="text-xl font-bold text-white/60 mb-2">완결 거래가 아직 없습니다</h3>
      <p className="text-sm text-white/30 max-w-md mb-6">
        분석을 위해서는 같은 종목의 매수 → 매도가 한 쌍 이상 필요합니다.
      </p>

      {/* Current trade status */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <TrendingUp size={13} className="text-blue-400" />
          <span className="text-xs font-bold text-blue-400">매수 {buyCount}건</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <TrendingUp size={13} className="text-rose-400" />
          <span className="text-xs font-bold text-rose-400">매도 {sellCount}건</span>
        </div>
      </div>

      {/* Explanation card */}
      <div className="w-full max-w-sm p-4 rounded-2xl border border-white/8 bg-white/3 text-left">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-indigo-400 flex-none" />
          <span className="text-xs font-bold text-white/60">완결 거래(Round Trip)란?</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="text-xs text-white/20 flex-none mt-0.5">1.</span>
            <span className="text-xs text-white/40 leading-relaxed"><span className="text-white/60 font-semibold">같은 종목</span>의 매수와 매도가 있어야 합니다</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-white/20 flex-none mt-0.5">2.</span>
            <span className="text-xs text-white/40 leading-relaxed"><span className="text-white/60 font-semibold">매수 날짜</span>가 매도 날짜와 같거나 앞서야 합니다</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-white/20 flex-none mt-0.5">3.</span>
            <span className="text-xs text-white/40 leading-relaxed">매수 수량 범위 내에서 매도가 <span className="text-white/60 font-semibold">FIFO 방식</span>으로 매칭됩니다</span>
          </div>
        </div>
        {buyCount > 0 && sellCount === 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
              <AlertTriangle size={12} className="flex-none" />
              매도 기록을 추가하면 분석이 시작됩니다.
            </p>
          </div>
        )}
        {buyCount === 0 && sellCount > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
              <AlertTriangle size={12} className="flex-none" />
              매수 기록을 추가하면 분석이 시작됩니다.
            </p>
          </div>
        )}
        {buyCount > 0 && sellCount > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
              <AlertTriangle size={12} className="flex-none" />
              매수와 매도의 종목명이 일치하는지 확인해 주세요.
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

  const normalizedTrips = useMemo(() => {
    const trips = analysis.roundTrips;
    const hasMixed = trips.length > 1 && trips.some(t => t.currency !== trips[0]?.currency);
    if (!hasMixed) return trips;
    return trips.map(t => ({
      ...t,
      pnl: t.currency === 'KRW' ? t.pnl : t.pnl * exchangeRate,
      currency: 'KRW' as const,
    }));
  }, [analysis.roundTrips, exchangeRate]);

  const isMixed = analysis.roundTrips.length > 1 &&
    analysis.roundTrips.some(t => t.currency !== analysis.roundTrips[0]?.currency);
  const isKRW = isMixed ? true : analysis.roundTrips[0]?.currency === 'KRW';

  const rawCurve = useMemo(() => calcEquityCurve(normalizedTrips), [normalizedTrips]);

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

  const formatVal = (v: number) =>
    isKRW
      ? `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ko-KR')}원`
      : `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(2)}`;

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className={isProfit ? 'text-emerald-400' : 'text-red-400'} />
            <h3 className="text-sm font-bold text-white">누적 수익 곡선</h3>
            {isMixed && (
              <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">USD→KRW 환산</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`text-lg font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatVal(lastPnl)}
            </span>
            <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
              최고 {formatVal(maxPnl)}
            </span>
            {minPnl < 0 && (
              <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                최저 {formatVal(minPnl)}
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
            tickFormatter={(v: number) =>
              isKRW
                ? `${(v / 10000).toFixed(0)}만`
                : `$${v.toFixed(0)}`
            }
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
            formatter={(value: number | undefined) => [formatVal(value ?? 0), '누적 손익']}
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

function buildBadges(analysis: TradeAnalysis): BadgeDef[] {
  const { roundTrips, profile, streaks } = analysis;
  return [
    {
      id: 'first_trade',
      icon: '🎯',
      label: '첫 거래',
      unlocked: roundTrips.length >= 1,
      desc: '첫 번째 완결 거래 달성',
    },
    {
      id: 'ten_trades',
      icon: '🏅',
      label: '10거래 달성',
      unlocked: roundTrips.length >= 10,
      desc: '10건 완결 거래 달성',
    },
    {
      id: 'win_streak_3',
      icon: '🔥',
      label: '3연승',
      unlocked: streaks.maxWin >= 3,
      desc: '3연속 수익 달성',
    },
    {
      id: 'win_streak_5',
      icon: '⚡',
      label: '5연승',
      unlocked: streaks.maxWin >= 5,
      desc: '5연속 수익 달성',
    },
    {
      id: 'high_winrate',
      icon: '👑',
      label: '승률 70%+',
      unlocked: profile.winRate >= 70 && roundTrips.length >= 5,
      desc: '5건 이상에서 승률 70% 이상',
    },
    {
      id: 'profit_factor',
      icon: '💰',
      label: '수익팩터 2+',
      unlocked: profile.profitFactor >= 2,
      desc: '수익 팩터 2.0 이상 달성',
    },
    {
      id: 'grade_a',
      icon: '🏆',
      label: 'A등급',
      unlocked: profile.overallGrade === 'A' || profile.overallGrade === 'A+',
      desc: '종합 등급 A 이상 달성',
    },
    {
      id: 'no_fomo',
      icon: '🧘',
      label: 'FOMO 없음',
      unlocked: roundTrips.length >= 5 && roundTrips.filter(t => t.emotionTag === 'FOMO').length === 0,
      desc: '5건 이상에서 FOMO 거래 없음',
    },
  ];
}

function ProfileCard({ analysis }: { analysis: TradeAnalysis }) {
  const { profile } = analysis;
  const gradeColor = GRADE_COLORS[profile.overallGrade];
  const badges = buildBadges(analysis);
  const unlockedBadges = badges.filter(b => b.unlocked);

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
          <Brain size={20} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">투자 성향 프로필</h3>
          <p className="text-xs text-white/30">매매 데이터 기반 자동 분석</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-2xl font-black ${gradeColor}`}>{profile.overallGrade}</div>
          <div className="text-xs text-white/30 font-medium mt-1">종합 등급</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className="text-sm font-bold text-white">{profile.tradingStyleLabel}</div>
          <div className="text-xs text-white/30 font-medium mt-1">투자 스타일</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-lg font-bold ${profile.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profile.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-white/30 font-medium mt-1">승률</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-sm font-bold ${
            profile.riskLevel === 'low' ? 'text-emerald-400' :
            profile.riskLevel === 'medium' ? 'text-yellow-400' :
            profile.riskLevel === 'high' ? 'text-orange-400' : 'text-red-400'
          }`}>
            {profile.riskLevelLabel}
          </div>
          <div className="text-xs text-white/30 font-medium mt-1">위험 수준</div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
        <MetricBadge label="완결 거래" value={`${profile.totalTrades}건`} />
        <MetricBadge label="평균 수익률" value={`${profile.avgReturn >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%`}
          color={profile.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <MetricBadge label="수익 팩터" value={profile.profitFactor.toFixed(2)}
          color={profile.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'} />
        <MetricBadge label="평균 보유일" value={`${profile.avgHoldingDays.toFixed(0)}일`} />
        <MetricBadge label="일관성" value={`${profile.consistencyScore.toFixed(0)}점`}
          color={profile.consistencyScore >= 60 ? 'text-emerald-400' : 'text-orange-400'} />
      </div>

      {/* Achievement Badges */}
      {badges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={13} className="text-yellow-400" />
            <span className="text-xs font-bold text-white/60">업적 배지</span>
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

  const radarData = useMemo(() => {
    const pf = Math.min(100, (profile.profitFactor / 3) * 100);
    const drawdownScore = Math.max(0, 100 - profile.maxDrawdownPercent * 2);
    const timingScore = Math.min(100, Math.max(0, 50 + advancedMetrics.timing.holdingEdge * 2));
    const disciplineScore = advancedMetrics.biasScore.biasScore;

    return [
      { axis: '승률', value: Math.round(profile.winRate) },
      { axis: '수익팩터', value: Math.round(pf) },
      { axis: '일관성', value: Math.round(profile.consistencyScore) },
      { axis: '리스크관리', value: Math.round(drawdownScore) },
      { axis: '타이밍', value: Math.round(timingScore) },
      { axis: '규율', value: Math.round(disciplineScore) },
    ];
  }, [profile, advancedMetrics]);

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-indigo-400" />
        <h3 className="text-sm font-bold text-white">투자 스타일 분석</h3>
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
            formatter={(value: number | undefined) => [`${value ?? 0}점`, '']}
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
  const filteredData = data.filter(d => d.count > 0);
  if (filteredData.length === 0) return null;
  const label = dataKey === 'avgReturn' ? '평균 수익률 (%)' : '승률 (%)';

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
      <div className="flex gap-2 mt-2 flex-wrap">
        {filteredData.map((d, i) => (
          <span key={i} className="text-xs text-white/20">{d.label}: {d.count}건</span>
        ))}
      </div>
    </div>
  );
}

// ─── Monthly Bar Chart ────────────────────────────────────────────────────

function MonthlyBarChart({ analysis, exchangeRate = 1 }: { analysis: TradeAnalysis; exchangeRate?: number }) {
  const normalizedTrips = useMemo(() => {
    const trips = analysis.roundTrips;
    const hasMixed = trips.length > 1 && trips.some(t => t.currency !== trips[0]?.currency);
    if (!hasMixed) return trips;
    return trips.map(t => ({
      ...t,
      pnl: t.currency === 'KRW' ? t.pnl : t.pnl * exchangeRate,
      currency: 'KRW' as const,
    }));
  }, [analysis.roundTrips, exchangeRate]);

  const monthlyData = useMemo(() => calcMonthlyStats(normalizedTrips), [normalizedTrips]);

  if (monthlyData.length < 2) return null;

  const isMixed = analysis.roundTrips.length > 1 &&
    analysis.roundTrips.some(t => t.currency !== analysis.roundTrips[0]?.currency);
  const isKRW = isMixed ? true : analysis.roundTrips[0]?.currency === 'KRW';

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-cyan-400" />
        <h3 className="text-sm font-bold text-white">월별 손익 비교</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => isKRW ? `${(v / 10000).toFixed(0)}만` : `$${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(20,22,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
            formatter={(value: number | undefined) => {
              const v = value ?? 0;
              return [
                isKRW ? `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ko-KR')}원` : `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(2)}`,
                '월 손익'
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
      <div className="flex gap-2 mt-2 flex-wrap">
        {monthlyData.map((d, i) => (
          <span key={i} className={`text-xs ${d.totalPnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
            {d.label}: {d.tradeCount}건
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Concentration Chart ──────────────────────────────────────────────────

function ConcentrationChart({ data }: { data: { symbol: string; symbolName?: string; percentage: number; isRisky: boolean }[] }) {
  if (data.length === 0) return null;
  const chartData = data.map(d => ({ name: d.symbolName || d.symbol, value: Math.round(d.percentage * 10) / 10 }));

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-orange-400" />
        <h3 className="text-sm font-bold text-white">종목 집중도</h3>
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
              formatter={(value: number | undefined) => [`${value ?? 0}%`, '비중']}
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

// ─── Streaks Card ─────────────────────────────────────────────────────────

function StreaksCard({ streaks }: { streaks: { currentWin: number; currentLoss: number; maxWin: number; maxLoss: number } }) {
  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-yellow-400" />
        <h3 className="text-sm font-bold text-white">연속 승패 기록</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
          <div className="text-lg font-black text-emerald-400">{streaks.currentWin}</div>
          <div className="text-xs text-white/30">현재 연승</div>
        </div>
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
          <div className="text-lg font-black text-red-400">{streaks.currentLoss}</div>
          <div className="text-xs text-white/30">현재 연패</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className="text-lg font-bold text-white">{streaks.maxWin}</div>
          <div className="text-xs text-white/30">최대 연승</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className="text-lg font-bold text-white">{streaks.maxLoss}</div>
          <div className="text-xs text-white/30">최대 연패</div>
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
  const visibleTrips = expanded ? roundTrips : roundTrips.slice(0, 5);
  if (roundTrips.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <h3 className="text-sm font-bold text-white">최근 완결 거래</h3>
          <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{roundTrips.length}건</span>
        </div>
        {roundTrips.length > 5 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
            {expanded ? '접기' : '더보기'}
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
                  <div className="text-xs text-white/30">{trip.entryDate} → {trip.exitDate} ({trip.holdingDays}일)</div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <div className={`text-xs font-bold ${trip.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPnl(trip.pnl, trip.currency)}
                  </div>
                  {!isLoggedIn ? (
                    <div className="text-xs text-white/20 px-1">로그인 필요</div>
                  ) : review ? (
                    <button onClick={() => onReviewTrade(trip)} disabled={isLoadingThis} title="AI 거래 리뷰 재생성 (1코인)"
                      className={`p-1.5 rounded-lg transition-colors ${isLoadingThis ? 'text-indigo-300 bg-indigo-500/10 animate-pulse' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'}`}>
                      {isLoadingThis ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                    </button>
                  ) : isLoadingThis ? (
                    <button disabled className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-indigo-500/15 text-indigo-400 border-indigo-500/20 cursor-wait">
                      <RefreshCw size={10} className="animate-spin" />분석 중...
                    </button>
                  ) : coinBalance < 1 ? (
                    <button onClick={onChargeCoins} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/25 transition-all">
                      <Gem size={10} />부족 ({coinBalance}/1)
                    </button>
                  ) : (
                    <button onClick={() => onReviewTrade(trip)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
                      <Sparkles size={10} />리뷰 (1💎)
                    </button>
                  )}
                </div>
              </div>
              {review && (
                <div className="px-3 pb-3">
                  <AIReportCard
                    title="AI 거래 리뷰"
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
  initialTab,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab ?? 'performance');

  // initialTab prop이 변경되면 반영 (외부 네비게이션)
  if (initialTab && activeTab !== initialTab) {
    setActiveTab(initialTab);
  }

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
        {TABS.map(tab => (
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
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <ProfileCard analysis={analysis} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StyleRadarChart analysis={analysis} />
            <StreaksCard streaks={analysis.streaks} />
          </div>
          {analysis.insights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">핵심 인사이트</h3>
                <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{analysis.insights.length}건</span>
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
            <StatsBarChart data={analysis.weekdayStats} title="요일별 평균 수익률" icon={<Calendar size={16} className="text-blue-400" />} dataKey="avgReturn" />
            <StatsBarChart data={analysis.holdingPeriodStats} title="보유 기간별 평균 수익률" icon={<Clock size={16} className="text-cyan-400" />} dataKey="avgReturn" />
            <StatsBarChart data={analysis.emotionStats} title="감정 태그별 승률" icon={<Heart size={16} className="text-pink-400" />} dataKey="winRate" />
            <ConcentrationChart data={analysis.concentration} />
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-4">
          <AIReportCard
            title="🤖 AI 투자 코치 리포트"
            subtitle={`${analysis.roundTrips.length}건의 완결 거래를 종합 분석`}
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
    </div>
  );
}
