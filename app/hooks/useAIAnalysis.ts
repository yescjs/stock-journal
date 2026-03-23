// Hook for calling the AI analysis API endpoint
// Supports auto-save to Supabase and report history
import { useState, useCallback, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useLocale, useTranslations } from 'next-intl';
import { supabase } from '@/app/lib/supabaseClient';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';
import { useEventTracking } from '@/app/hooks/useEventTracking';

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
  locale?: string;
  created_at: string;
}

interface UseAIAnalysisReturn {
  weeklyReport: AIReportResult | null;
  tradeReview: Record<string, AIReportResult>; // keyed by "symbol-entryDate"
  loadingWeekly: boolean;
  loadingReview: string | null; // currently reviewing trade key
  error: string | null;
  generateWeeklyReport: (analysis: TradeAnalysis, username?: string, onSuccess?: () => void) => Promise<void>;
  reviewTrade: (roundTrip: RoundTrip) => Promise<void>;
  clearWeeklyReport: () => void;
  // 저장된 리포트 관련
  savedReports: SavedReport[];
  loadingSavedReports: boolean;
  loadSavedReports: () => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

export function useAIAnalysis(user: User | null, onCoinsConsumed?: () => void): UseAIAnalysisReturn {
  const locale = useLocale();
  const t = useTranslations('analysis.hook');
  const { track } = useEventTracking(user);
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
      console.error('Failed to load reports:', err);
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
          locale,
        });

      if (insertError) {
        console.error('Failed to save report:', insertError);
        return;
      }

      // 저장 후 목록 갱신
      await loadSavedReports();
    } catch (err) {
      console.error('Error saving report:', err);
    }
  }, [user, loadSavedReports, locale]);

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
      console.error('Failed to delete report:', err);
    }
  }, [user]);

  // 주간 코치 리포트 생성
  const generateWeeklyReport = useCallback(async (
    analysis: TradeAnalysis,
    username?: string,
    onSuccess?: () => void
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
          locale,
        }),
      });

      if (res.status === 402) {
        setError(t('insufficientCoins'));
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || t('unknownError'));
      }

      const data: AIReportResult = await res.json();
      setWeeklyReport(data);
      track('ai_analysis_run', { report_type: 'weekly_report' });
      onSuccess?.();
      onCoinsConsumed?.();

      // 자동 저장
      const title = t('weeklyReportTitle', { count: analysis.roundTrips.length });
      await saveReportToDB('weekly_report', title, data.report, {
        totalTrades: analysis.profile.totalTrades,
        winRate: analysis.profile.winRate,
        overallGrade: analysis.profile.overallGrade,
        generatedAt: data.generatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setLoadingWeekly(false);
    }
  }, [saveReportToDB, onCoinsConsumed, locale, t, track]);

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
        body: JSON.stringify({ type: 'trade_review', roundTrip, locale }),
      });

      if (res.status === 402) {
        setError(t('insufficientCoins'));
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || t('unknownError'));
      }

      const data: AIReportResult = await res.json();
      setTradeReview(prev => ({ ...prev, [key]: data }));
      track('ai_analysis_run', { report_type: 'trade_review' });
      onCoinsConsumed?.();

      // 자동 저장
      const symbolName = roundTrip.symbolName || roundTrip.symbol;
      const title = t('tradeReviewTitle', { symbolName, exitDate: roundTrip.exitDate });
      await saveReportToDB('trade_review', title, data.report, {
        symbol: roundTrip.symbol,
        symbolName,
        entryDate: roundTrip.entryDate,
        exitDate: roundTrip.exitDate,
        pnlPercent: roundTrip.pnlPercent,
        generatedAt: data.generatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setLoadingReview(null);
    }
  }, [saveReportToDB, onCoinsConsumed, locale, t, track]);

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
