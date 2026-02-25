// Hook for calling the AI analysis API endpoint
import { useState, useCallback } from 'react';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';

interface AIReportResult {
  report: string;
  generatedAt: string;
}

interface UseAIAnalysisReturn {
  weeklyReport: AIReportResult | null;
  tradeReview: Record<string, AIReportResult>; // keyed by "symbol-entryDate"
  loadingWeekly: boolean;
  loadingReview: string | null; // currently reviewing trade key
  error: string | null;
  generateWeeklyReport: (analysis: TradeAnalysis, username?: string) => Promise<void>;
  reviewTrade: (roundTrip: RoundTrip) => Promise<void>;
  clearWeeklyReport: () => void;
}

export function useAIAnalysis(): UseAIAnalysisReturn {
  const [weeklyReport, setWeeklyReport] = useState<AIReportResult | null>(null);
  const [tradeReview, setTradeReview] = useState<Record<string, AIReportResult>>({});
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingReview, setLoadingReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate weekly coach report
  const generateWeeklyReport = useCallback(async (
    analysis: TradeAnalysis,
    username?: string
  ) => {
    setLoadingWeekly(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'weekly_report',
          analysis,
          username,
        }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || 'AI 리포트 생성에 실패했습니다.');
      }

      const data: AIReportResult = await res.json();
      setWeeklyReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoadingWeekly(false);
    }
  }, []);

  // Review individual trade
  const reviewTrade = useCallback(async (roundTrip: RoundTrip) => {
    const key = `${roundTrip.symbol}-${roundTrip.entryDate}`;
    setLoadingReview(key);
    setError(null);

    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'trade_review', roundTrip }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || '거래 리뷰 생성에 실패했습니다.');
      }

      const data: AIReportResult = await res.json();
      setTradeReview(prev => ({ ...prev, [key]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoadingReview(null);
    }
  }, []);

  const clearWeeklyReport = useCallback(() => setWeeklyReport(null), []);

  return {
    weeklyReport,
    tradeReview,
    loadingWeekly,
    loadingReview,
    error,
    generateWeeklyReport,
    reviewTrade,
    clearWeeklyReport,
  };
}
