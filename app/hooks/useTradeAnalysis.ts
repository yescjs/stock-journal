// Trade analysis hook — runs analysis engine and optionally syncs to Supabase DB
import { useState, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { Trade } from '@/app/types/trade';
import { TradeAnalysis } from '@/app/types/analysis';
import { analyzeTradesComplete } from '@/app/utils/tradeAnalysis';

interface UseTradeAnalysisReturn {
  analysis: TradeAnalysis | null;
  syncing: boolean;
  syncError: string | null;
  lastSyncedAt: string | null;
  syncToDatabase: () => Promise<void>;
}

export function useTradeAnalysis(
  trades: Trade[],
  user: User | null,
  locale: string = 'ko'
): UseTradeAnalysisReturn {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Memoized analysis — recalculates only when trades or locale change
  const analysis = useMemo<TradeAnalysis | null>(() => {
    if (trades.length === 0) return null;
    return analyzeTradesComplete(trades, locale);
  }, [trades, locale]);

  // Sync analysis results to Supabase DB
  const syncToDatabase = useCallback(async () => {
    if (!user || !analysis) return;

    setSyncing(true);
    setSyncError(null);

    try {
      // 1. Upsert user_stats
      const { profile } = analysis;
      const { error: statsError } = await supabase
        .from('user_stats')
        .upsert(
          {
            user_id: user.id,
            username: user.email?.split('@')[0] || 'Anonymous',
            total_trades: profile.totalTrades,
            winning_trades: analysis.roundTrips.filter(t => t.isWin).length,
            losing_trades: analysis.roundTrips.filter(t => !t.isWin).length,
            even_trades: 0,
            win_rate: Math.round(profile.winRate * 100) / 100,
            total_profit_loss: Math.round(analysis.roundTrips.reduce((s, t) => s + t.pnl, 0) * 100) / 100,
            avg_return_per_trade: Math.round(profile.avgReturn * 100) / 100,
            profit_factor: Math.round(profile.profitFactor * 100) / 100,
            max_drawdown_percent: Math.round(profile.maxDrawdownPercent * 100) / 100,
            avg_holding_days: Math.round(profile.avgHoldingDays * 10) / 10,
            trading_style: profile.tradingStyle,
            risk_level: profile.riskLevel,
            performance_grade: profile.overallGrade,
            consistency_score: Math.round(profile.consistencyScore * 100) / 100,
            current_win_streak: analysis.streaks.currentWin,
            current_loss_streak: analysis.streaks.currentLoss,
            max_win_streak: analysis.streaks.maxWin,
            max_loss_streak: analysis.streaks.maxLoss,
            max_profit: analysis.roundTrips.length > 0
              ? Math.max(...analysis.roundTrips.map(t => t.pnl))
              : 0,
            max_loss: analysis.roundTrips.length > 0
              ? Math.min(...analysis.roundTrips.map(t => t.pnl))
              : 0,
            last_trade_date: analysis.roundTrips[0]?.exitDate || null,
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (statsError) throw new Error(`user_stats 저장 실패: ${statsError.message}`);

      // 2. Upsert trade_performance for each round trip
      // Only sync the latest 100 round trips to avoid excessive writes
      const latestTrips = analysis.roundTrips.slice(0, 100);

      if (latestTrips.length > 0) {
        const performanceRows = latestTrips.map(trip => ({
          user_id: user.id,
          symbol: trip.symbol,
          symbol_name: trip.symbolName || null,
          trade_date: trip.exitDate,
          side: 'SELL' as const,
          entry_price: trip.entryPrice,
          exit_price: trip.exitPrice,
          quantity: trip.quantity,
          realized_pnl: Math.round(trip.pnl * 100) / 100,
          pnl_percentage: Math.round(trip.pnlPercent * 100) / 100,
          holding_days: trip.holdingDays,
          emotion_tag: trip.emotionTag || null,
          strategy_name: trip.strategyName || null,
          trade_grade: gradeRoundTrip(trip),
          notes: null,
          updated_at: new Date().toISOString(),
        }));

        // Delete existing performance records for this user, then insert fresh
        const { error: deleteError } = await supabase
          .from('trade_performance')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) throw new Error(`trade_performance 삭제 실패: ${deleteError.message}`);

        const { error: insertError } = await supabase
          .from('trade_performance')
          .insert(performanceRows);

        if (insertError) throw new Error(`trade_performance 저장 실패: ${insertError.message}`);
      }

      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : '동기화 중 오류가 발생했습니다.';
      setSyncError(message);
      console.error('Analysis sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [user, analysis]);

  return { analysis, syncing, syncError, lastSyncedAt, syncToDatabase };
}

// Grade individual round trips based on return and holding period
function gradeRoundTrip(trip: { pnlPercent: number; holdingDays: number }): string {
  const { pnlPercent } = trip;

  if (pnlPercent >= 20) return 'A+';
  if (pnlPercent >= 10) return 'A';
  if (pnlPercent >= 5) return 'B+';
  if (pnlPercent >= 2) return 'B';
  if (pnlPercent >= 0) return 'C+';
  if (pnlPercent >= -3) return 'C';
  if (pnlPercent >= -10) return 'D';
  return 'F';
}
