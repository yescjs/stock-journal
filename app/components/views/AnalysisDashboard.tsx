import React, { useState } from 'react';
import {
  TradeAnalysis,
  PatternStats,
  InsightItem,
  GRADE_COLORS,
} from '@/app/types/analysis';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
} from 'recharts';
import {
  Brain, TrendingUp, Zap, Shield,
  Calendar, Clock, Heart, Target,
  AlertTriangle, CheckCircle, Info, XCircle,
  RefreshCw, Database, ChevronDown, MessageSquare,
} from 'lucide-react';
import { AIReportCard } from '@/app/components/AIReportCard';
import { useAIAnalysis } from '@/app/hooks/useAIAnalysis';

interface AnalysisDashboardProps {
  analysis: TradeAnalysis | null;
  darkMode: boolean;
  tradesCount: number;
  syncing: boolean;
  syncError: string | null;
  lastSyncedAt: string | null;
  isLoggedIn: boolean;
  onSync: () => void;
  username?: string; // For AI report personalization
}

// ─── Chart Colors ────────────────────────────────────────────────────────

const CHART_COLORS = {
  positive: '#34d399',
  negative: '#f87171',
  neutral: '#94a3b8',
  bar: '#818cf8',
  barHover: '#a78bfa',
  pie: ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb923c', '#a78bfa', '#4ade80'],
};

function getBarColor(value: number): string {
  if (value > 0) return CHART_COLORS.positive;
  if (value < 0) return CHART_COLORS.negative;
  return CHART_COLORS.neutral;
}

// ─── Sub-Components ──────────────────────────────────────────────────────

function EmptyState({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <Brain size={36} className="text-white/20" />
      </div>
      <h3 className="text-xl font-bold text-white/60 mb-2">분석할 데이터가 부족합니다</h3>
      <p className="text-sm text-white/30 max-w-md">
        {count === 0
          ? '매매 기록을 추가하면 AI가 투자 패턴을 분석하고 맞춤형 인사이트를 제공합니다.'
          : '매수와 매도가 매칭된 완결 거래가 필요합니다. 매도 기록을 추가해보세요.'}
      </p>
    </div>
  );
}

function ProfileCard({ analysis }: { analysis: TradeAnalysis }) {
  const { profile } = analysis;
  const gradeColor = GRADE_COLORS[profile.overallGrade];

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
        {/* Grade */}
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-2xl font-black ${gradeColor}`}>{profile.overallGrade}</div>
          <div className="text-xs text-white/30 font-medium mt-1">종합 등급</div>
        </div>

        {/* Trading Style */}
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className="text-sm font-bold text-white">{profile.tradingStyleLabel}</div>
          <div className="text-xs text-white/30 font-medium mt-1">투자 스타일</div>
        </div>

        {/* Win Rate */}
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
          <div className={`text-lg font-bold ${profile.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profile.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-white/30 font-medium mt-1">승률</div>
        </div>

        {/* Risk Level */}
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

      {/* Secondary Metrics */}
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
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,15,30,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#fff',
            }}
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, label]}
            labelFormatter={(l: string) => l}
          />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={40}>
            {filteredData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry[dataKey])} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Counts */}
      <div className="flex gap-2 mt-2 flex-wrap">
        {filteredData.map((d, i) => (
          <span key={i} className="text-xs text-white/20">{d.label}: {d.count}건</span>
        ))}
      </div>
    </div>
  );
}

function ConcentrationChart({ data }: { data: { symbol: string; symbolName?: string; percentage: number; isRisky: boolean }[] }) {
  if (data.length === 0) return null;

  const chartData = data.map(d => ({
    name: d.symbolName || d.symbol,
    value: Math.round(d.percentage * 10) / 10,
  }));

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-orange-400" />
        <h3 className="text-sm font-bold text-white">종목 집중도</h3>
      </div>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15,15,30,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#fff',
              }}
              formatter={(value: number | undefined) => [`${value ?? 0}%`, '비중']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-sm flex-none"
                  style={{ backgroundColor: CHART_COLORS.pie[i % CHART_COLORS.pie.length] }}
                />
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

function StrategyTable({ data }: { data: PatternStats[] }) {
  const filtered = data.filter(d => d.count > 0);
  if (filtered.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
      <div className="flex items-center gap-2 mb-4">
        <Target size={16} className="text-purple-400" />
        <h3 className="text-sm font-bold text-white">전략별 성과</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-2 px-2 text-white/30 font-medium">전략</th>
              <th className="text-center py-2 px-2 text-white/30 font-medium">거래</th>
              <th className="text-center py-2 px-2 text-white/30 font-medium">승률</th>
              <th className="text-center py-2 px-2 text-white/30 font-medium">평균 수익</th>
              <th className="text-right py-2 px-2 text-white/30 font-medium">총 손익</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                <td className="py-2.5 px-2 text-white font-medium truncate max-w-[120px]">{s.label}</td>
                <td className="text-center py-2.5 px-2 text-white/50">{s.count}건</td>
                <td className={`text-center py-2.5 px-2 font-bold ${s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.winRate.toFixed(0)}%
                </td>
                <td className={`text-center py-2.5 px-2 font-medium ${s.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(1)}%
                </td>
                <td className={`text-right py-2.5 px-2 font-medium ${s.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.totalPnl >= 0 ? '+' : ''}{s.totalPnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoundTripList({
  roundTrips,
  onReviewTrade,
  tradeReview,
  loadingReview,
}: {
  roundTrips: TradeAnalysis['roundTrips'];
  onReviewTrade: (trip: TradeAnalysis['roundTrips'][0]) => void;
  tradeReview: Record<string, { report: string; generatedAt: string }>;
  loadingReview: string | null;
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
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
          >
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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-none ${
                  trip.isWin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {trip.pnlPercent >= 0 ? '+' : ''}{trip.pnlPercent.toFixed(0)}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {trip.symbolName || trip.symbol}
                  </div>
                  <div className="text-xs text-white/30">
                    {trip.entryDate} → {trip.exitDate} ({trip.holdingDays}일)
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <div className={`text-xs font-bold ${trip.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trip.pnl >= 0 ? '+' : ''}{trip.pnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                  </div>
                  <button
                    onClick={() => onReviewTrade(trip)}
                    disabled={isLoadingThis}
                    title="AI 거래 리뷰"
                    className={`p-1.5 rounded-lg transition-colors ${
                      review ? 'text-indigo-400 bg-indigo-500/10' :
                      isLoadingThis ? 'text-indigo-300 animate-pulse' :
                      'text-white/20 hover:text-indigo-400 hover:bg-indigo-500/10'
                    }`}
                  >
                    <MessageSquare size={12} />
                  </button>
                </div>
              </div>
              {/* Inline AI review */}
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

// ─── Main Dashboard Component ────────────────────────────────────────────

export function AnalysisDashboard({
  analysis,
  darkMode: _darkMode,
  tradesCount,
  syncing,
  syncError,
  lastSyncedAt,
  isLoggedIn,
  onSync,
  username,
}: AnalysisDashboardProps) {
  // AI analysis state
  const {
    weeklyReport,
    tradeReview,
    loadingWeekly,
    loadingReview,
    error: aiError,
    generateWeeklyReport,
    reviewTrade,
    clearWeeklyReport,
  } = useAIAnalysis();

  if (!analysis || analysis.roundTrips.length === 0) {
    return <EmptyState count={tradesCount} />;
  }

  return (
    <div className="space-y-4">
      {/* DB Sync Bar */}
      {isLoggedIn && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Database size={13} />
            {lastSyncedAt
              ? <span>마지막 동기화: {new Date(lastSyncedAt).toLocaleString('ko-KR')}</span>
              : <span>DB에 분석 결과를 저장하세요</span>
            }
            {syncError && <span className="text-red-400 ml-2">⚠ {syncError}</span>}
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              syncing
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 cursor-wait'
                : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
            }`}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '동기화 중...' : 'DB 저장'}
          </button>
        </div>
      )}

      {/* Profile Card */}
      <ProfileCard analysis={analysis} />

      {/* Insights Section */}
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekday Stats */}
        <StatsBarChart
          data={analysis.weekdayStats}
          title="요일별 평균 수익률"
          icon={<Calendar size={16} className="text-blue-400" />}
          dataKey="avgReturn"
        />

        {/* Holding Period Stats */}
        <StatsBarChart
          data={analysis.holdingPeriodStats}
          title="보유 기간별 평균 수익률"
          icon={<Clock size={16} className="text-cyan-400" />}
          dataKey="avgReturn"
        />

        {/* Emotion Stats */}
        <StatsBarChart
          data={analysis.emotionStats}
          title="감정 태그별 승률"
          icon={<Heart size={16} className="text-pink-400" />}
          dataKey="winRate"
        />

        {/* Streaks */}
        <StreaksCard streaks={analysis.streaks} />
      </div>

      {/* Strategy Table */}
      <StrategyTable data={analysis.strategyStats} />

      {/* Concentration Chart */}
      <ConcentrationChart data={analysis.concentration} />

      {/* AI Weekly Coach Report */}
      <AIReportCard
        title="🤖 AI 투자 코치 리포트"
        subtitle={`${analysis.roundTrips.length}건의 완결 거래를 종합 분석`}
        report={weeklyReport?.report ?? null}
        generatedAt={weeklyReport?.generatedAt ?? null}
        loading={loadingWeekly}
        error={aiError}
        onGenerate={() => generateWeeklyReport(analysis, username)}
        onClear={clearWeeklyReport}
      />

      {/* Recent Round Trips — with per-trade AI review */}
      <RoundTripList
        roundTrips={analysis.roundTrips}
        onReviewTrade={reviewTrade}
        tradeReview={tradeReview}
        loadingReview={loadingReview}
      />
    </div>
  );
}
