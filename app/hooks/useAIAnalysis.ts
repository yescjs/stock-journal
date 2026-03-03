// Hook for calling the AI analysis API endpoint
// Supports auto-save to Supabase and report history
import { useState, useCallback, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';

export interface AIReportResult {
  report: string;
  generatedAt: string;
}

export interface SavedReport {
  id: string;
  report_type: 'weekly_report' | 'trade_review';
  title: string;
  report: string;
  metadata: Record<string, unknown>;
  created_at: string;
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
  // 저장된 리포트 관련
  savedReports: SavedReport[];
  loadingSavedReports: boolean;
  loadSavedReports: () => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

export function useAIAnalysis(user: User | null, onCoinsConsumed?: () => void): UseAIAnalysisReturn {
  const [weeklyReport, setWeeklyReport] = useState<AIReportResult | null>(null);
  const [tradeReview, setTradeReview] = useState<Record<string, AIReportResult>>({});
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingReview, setLoadingReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 저장된 리포트
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingSavedReports, setLoadingSavedReports] = useState(false);

  // 저장된 리포트 목록 조회
  const loadSavedReports = useCallback(async () => {
    if (!user) return;
    setLoadingSavedReports(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSavedReports((data as SavedReport[]) || []);
    } catch (err) {
      console.error('리포트 목록 조회 실패:', err);
    } finally {
      setLoadingSavedReports(false);
    }
  }, [user]);

  // 로그인 사용자 변경 시 리포트 목록 자동 로드
  useEffect(() => {
    if (user) {
      loadSavedReports();
    } else {
      setSavedReports([]);
    }
  }, [user, loadSavedReports]);

  // DB에 리포트 자동 저장
  const saveReportToDB = useCallback(async (
    reportType: 'weekly_report' | 'trade_review',
    title: string,
    report: string,
    metadata: Record<string, unknown> = {}
  ) => {
    if (!user) return;
    try {
      const { error: insertError } = await supabase
        .from('ai_reports')
        .insert({
          user_id: user.id,
          report_type: reportType,
          title,
          report,
          metadata,
        });

      if (insertError) {
        console.error('리포트 저장 실패:', insertError);
        return;
      }

      // 저장 후 목록 갱신
      await loadSavedReports();
    } catch (err) {
      console.error('리포트 저장 중 오류:', err);
    }
  }, [user, loadSavedReports]);

  // 리포트 삭제
  const deleteReport = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error: deleteError } = await supabase
        .from('ai_reports')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      setSavedReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('리포트 삭제 실패:', err);
    }
  }, [user]);

  // 주간 코치 리포트 생성
  const generateWeeklyReport = useCallback(async (
    analysis: TradeAnalysis,
    username?: string
  ) => {
    setLoadingWeekly(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'weekly_report',
          analysis,
          username,
        }),
      });

      if (res.status === 402) {
        setError('코인이 부족합니다. 코인을 충전해주세요.');
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || 'AI 리포트 생성에 실패했습니다.');
      }

      const data: AIReportResult = await res.json();
      setWeeklyReport(data);
      onCoinsConsumed?.();

      // 자동 저장
      const title = `${analysis.roundTrips.length}건의 완결 거래 종합 분석`;
      await saveReportToDB('weekly_report', title, data.report, {
        totalTrades: analysis.profile.totalTrades,
        winRate: analysis.profile.winRate,
        overallGrade: analysis.profile.overallGrade,
        generatedAt: data.generatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoadingWeekly(false);
    }
  }, [saveReportToDB]);

  // 개별 거래 리뷰
  const reviewTrade = useCallback(async (roundTrip: RoundTrip) => {
    const key = `${roundTrip.symbol}-${roundTrip.entryDate}`;
    setLoadingReview(key);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type: 'trade_review', roundTrip }),
      });

      if (res.status === 402) {
        setError('코인이 부족합니다. 코인을 충전해주세요.');
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || '거래 리뷰 생성에 실패했습니다.');
      }

      const data: AIReportResult = await res.json();
      setTradeReview(prev => ({ ...prev, [key]: data }));
      onCoinsConsumed?.();

      // 자동 저장
      const symbolName = roundTrip.symbolName || roundTrip.symbol;
      const title = `${symbolName} 거래 리뷰 (${roundTrip.exitDate})`;
      await saveReportToDB('trade_review', title, data.report, {
        symbol: roundTrip.symbol,
        symbolName,
        entryDate: roundTrip.entryDate,
        exitDate: roundTrip.exitDate,
        pnlPercent: roundTrip.pnlPercent,
        generatedAt: data.generatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoadingReview(null);
    }
  }, [saveReportToDB]);

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
    savedReports,
    loadingSavedReports,
    loadSavedReports,
    deleteReport,
  };
}
