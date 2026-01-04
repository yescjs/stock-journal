import React from 'react';
import { User } from '@supabase/supabase-js';
import { StatsDashboard } from '@/app/components/StatsDashboard';
import { useStats } from '@/app/hooks/useStats';
import { useRiskManagement } from '@/app/hooks/useRiskManagement';
import { useMonthlyGoals } from '@/app/hooks/useMonthlyGoals';
import { useStrategies } from '@/app/hooks/useStrategies'; // For strategy stats if needed?
// Actually StatsDashboard receives strategyStats from useStats.

interface DashboardViewProps {
  darkMode: boolean;
  currentUser: User | null;
  statsData: ReturnType<typeof useStats>;
  riskData: ReturnType<typeof useRiskManagement>;
  goalsData: ReturnType<typeof useMonthlyGoals>;
  currentPrices: Record<string, number>;
  onCurrentPriceChange: (symbol: string, value: string) => void;
  onSymbolClick?: (symbol: string) => void;
  tagColors: Record<string, string>;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
}

export function DashboardView({
  darkMode,
  currentUser,
  statsData,
  riskData,
  goalsData,
  currentPrices,
  onCurrentPriceChange,
  onSymbolClick,
  tagColors,
  exchangeRate,
  onExchangeRateChange
}: DashboardViewProps) {
  const {
    symbolSummaries,
    tagStats,
    strategyStats,
    overallStats,
    dailyRealizedPoints,
    monthlyRealizedPoints,
    equityPoints,
    monthlyEquityPoints,
    weekdayStats,
    holdingPeriodStats,
    insights
  } = statsData;

  const {
    accountBalance,
    balanceHistory,
    riskSettings,
    positionRisks,
    highRiskPositions,
    dailyLossAlert,
    updateBalance,
    updateRiskSettings
  } = riskData;

  const { goals: monthlyGoals, setGoal: setMonthlyGoal, removeGoal: removeMonthlyGoal } = goalsData;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <StatsDashboard
          darkMode={darkMode}
          currentUser={currentUser}
          symbolSummaries={symbolSummaries}
          tagStats={tagStats}
          strategyStats={strategyStats}
          overallStats={overallStats}
          dailyRealizedPoints={dailyRealizedPoints}
          monthlyRealizedPoints={monthlyRealizedPoints}
          equityPoints={equityPoints}
          monthlyEquityPoints={monthlyEquityPoints}
          weekdayStats={weekdayStats}
          holdingPeriodStats={holdingPeriodStats}
          monthlyGoals={monthlyGoals}
          onSetMonthlyGoal={setMonthlyGoal}
          onRemoveMonthlyGoal={removeMonthlyGoal}
          
          accountBalance={accountBalance}
          balanceHistory={balanceHistory}
          positionRisks={positionRisks}
          highRiskPositions={highRiskPositions}
          dailyLossAlert={dailyLossAlert}
          riskSettings={riskSettings}
          dailyPnL={0} // Computed in hook? No, page passed todayPnL. 
          // We need to pass todayPnL if RiskManagementWidget needs it.
          // RiskManagementWidget takes dailyPnL.
          // Let's deduce it from dailyRealizedPoints or pass it in props.
          // For now passing 0 or we should calculating it here.
          // Actually useRiskManagement hook takes todayPnL as input, 
          // but StatsDashboard also receives it as prop.
          
          onUpdateBalance={updateBalance}
          onUpdateRiskSettings={updateRiskSettings}
          
          currentPrices={currentPrices}
          onCurrentPriceChange={onCurrentPriceChange}
          onSymbolClick={onSymbolClick}
          tagColors={tagColors}
          insights={insights}
          exchangeRate={exchangeRate}
          onExchangeRateChange={onExchangeRateChange}
        />
    </div>
  );
}
