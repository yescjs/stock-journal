// Hook for calling the AI analysis API endpoint
// Supports auto-save to Supabase, report history, and streaming responses
import { useState, useCallback, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { useLocale, useTranslations } from 'next-intl';
import { supabase } from '@/app/lib/supabaseClient';
import { readSSEStream } from '@/app/lib/sseReader';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';
import { useEventTracking } from '@/app/hooks/useEventTracking';

export interface AIReportResult {
  report: string;
  generatedAt: string;
}

export interface SavedReport {
  id: string;
  report_type: 'weekly_report' | 'trade_review' | 'playbook';
  title: string;
  report: string;
  metadata: Record<string, unknown>;
  locale?: string;
  created_at: string;
}

export interface NewsSentiment {
  score: number;
  label: string;
  headlines: string[];
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
  // 플레이북
  playbookReport: AIReportResult | null;
  loadingPlaybook: boolean;
  isStreamingPlaybook: boolean;
  streamedPlaybookContent: string;
  generatePlaybook: (analysis: TradeAnalysis, username?: string) => Promise<void>;
  clearPlaybook: () => void;
  stopPlaybookStreaming: () => void;
  // 뉴스 감성 (리뷰 키별)
  tradeSentiment: Record<string, NewsSentiment>;
  // 저장된 리포트 관련
  savedReports: SavedReport[];
  loadingSavedReports: boolean;
  loadSavedReports: () => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  // Streaming 관련
  isStreamingWeekly: boolean;
  streamedWeeklyContent: string;
  isStreamingReview: boolean;
  streamedReviewContent: string;
  stopWeeklyStreaming: () => void;
  stopReviewStreaming: () => void;
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

  // Streaming state
  const [isStreamingWeekly, setIsStreamingWeekly] = useState(false);
  const [streamedWeeklyContent, setStreamedWeeklyContent] = useState('');
  const [isStreamingReview, setIsStreamingReview] = useState(false);
  const [streamedReviewContent, setStreamedReviewContent] = useState('');
  const weeklyAbortRef = useRef<AbortController | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);

  // 플레이북 state
  const [playbookReport, setPlaybookReport] = useState<AIReportResult | null>(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);
  const [isStreamingPlaybook, setIsStreamingPlaybook] = useState(false);
  const [streamedPlaybookContent, setStreamedPlaybookContent] = useState('');
  const playbookAbortRef = useRef<AbortController | null>(null);

  // 뉴스 감성 (리뷰 키별)
  const [tradeSentiment, setTradeSentiment] = useState<Record<string, NewsSentiment>>({});

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
    reportType: 'weekly_report' | 'trade_review' | 'playbook',
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

  // Stop streaming — separated so aborting weekly doesn't cancel review and vice versa
  const stopWeeklyStreaming = useCallback(() => {
    if (weeklyAbortRef.current) {
      weeklyAbortRef.current.abort();
      weeklyAbortRef.current = null;
    }
  }, []);

  const stopReviewStreaming = useCallback(() => {
    if (reviewAbortRef.current) {
      reviewAbortRef.current.abort();
      reviewAbortRef.current = null;
    }
  }, []);

  // 주간 코치 리포트 생성 (스트리밍)
  const generateWeeklyReport = useCallback(async (
    analysis: TradeAnalysis,
    username?: string,
    onSuccess?: () => void
  ) => {
    setLoadingWeekly(true);
    setIsStreamingWeekly(true);
    setStreamedWeeklyContent('');
    setError(null);

    const abortController = new AbortController();
    weeklyAbortRef.current = abortController;
    let fullReport = '';

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
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (res.status === 402) {
        setError(t('insufficientCoins'));
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || t('unknownError'));
      }

      // Check if response is SSE stream or JSON fallback
      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('text/event-stream')) {
        fullReport = await readSSEStream(
          res,
          (text) => { fullReport = text; setStreamedWeeklyContent(text); },
          undefined,
          abortController.signal,
        );

        const generatedAt = new Date().toISOString();
        setWeeklyReport({ report: fullReport, generatedAt });
        track('ai_analysis_run', { report_type: 'weekly_report' });
        onSuccess?.();

        // 자동 저장
        const title = t('weeklyReportTitle', { count: analysis.roundTrips.length });
        await saveReportToDB('weekly_report', title, fullReport, {
          totalTrades: analysis.profile.totalTrades,
          winRate: analysis.profile.winRate,
          overallGrade: analysis.profile.overallGrade,
          generatedAt,
        });
      } else {
        // JSON fallback (mock mode)
        const data: AIReportResult = await res.json();
        fullReport = data.report;
        setWeeklyReport(data);
        setStreamedWeeklyContent(data.report);
        track('ai_analysis_run', { report_type: 'weekly_report' });
        onSuccess?.();

        const title = t('weeklyReportTitle', { count: analysis.roundTrips.length });
        await saveReportToDB('weekly_report', title, data.report, {
          totalTrades: analysis.profile.totalTrades,
          winRate: analysis.profile.winRate,
          overallGrade: analysis.profile.overallGrade,
          generatedAt: data.generatedAt,
        });
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        // User cancelled — keep partial content using local variable (not stale state)
        if (fullReport) {
          const generatedAt = new Date().toISOString();
          setWeeklyReport({ report: fullReport, generatedAt });
        }
      } else {
        setError(err instanceof Error ? err.message : t('unknownError'));
      }
    } finally {
      setLoadingWeekly(false);
      setIsStreamingWeekly(false);
      weeklyAbortRef.current = null;
      // Refresh coin balance after operation completes (deduction happens server-side before streaming)
      onCoinsConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveReportToDB, onCoinsConsumed, locale, t, track]);

  // 개별 거래 리뷰 (스트리밍)
  const reviewTrade = useCallback(async (roundTrip: RoundTrip) => {
    const key = `${roundTrip.symbol}-${roundTrip.entryDate}`;
    setLoadingReview(key);
    setIsStreamingReview(true);
    setStreamedReviewContent('');
    setError(null);

    // US 종목의 경우 뉴스 감성 먼저 fetch (실패해도 리뷰는 진행)
    const newsSentiment = await fetchNewsSentiment(roundTrip.symbol, roundTrip.entryDate);
    if (newsSentiment) {
      setTradeSentiment(prev => ({ ...prev, [key]: newsSentiment }));
    }

    const abortController = new AbortController();
    reviewAbortRef.current = abortController;
    let fullReport = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type: 'trade_review', roundTrip, newsSentiment, locale, stream: true }),
        signal: abortController.signal,
      });

      if (res.status === 402) {
        setError(t('insufficientCoins'));
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || t('unknownError'));
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('text/event-stream')) {
        fullReport = await readSSEStream(
          res,
          (text) => { fullReport = text; setStreamedReviewContent(text); },
          undefined,
          abortController.signal,
        );

        const generatedAt = new Date().toISOString();
        setTradeReview(prev => ({ ...prev, [key]: { report: fullReport, generatedAt } }));
        track('ai_analysis_run', { report_type: 'trade_review' });

        const symbolName = roundTrip.symbolName || roundTrip.symbol;
        const title = t('tradeReviewTitle', { symbolName, exitDate: roundTrip.exitDate });
        await saveReportToDB('trade_review', title, fullReport, {
          symbol: roundTrip.symbol,
          symbolName,
          entryDate: roundTrip.entryDate,
          exitDate: roundTrip.exitDate,
          pnlPercent: roundTrip.pnlPercent,
          generatedAt,
        });
      } else {
        const data: AIReportResult = await res.json();
        fullReport = data.report;
        setTradeReview(prev => ({ ...prev, [key]: data }));
        setStreamedReviewContent(data.report);
        track('ai_analysis_run', { report_type: 'trade_review' });

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
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        // User cancelled — keep partial content using local variable (not stale state)
        if (fullReport) {
          const generatedAt = new Date().toISOString();
          setTradeReview(prev => ({ ...prev, [key]: { report: fullReport, generatedAt } }));
        }
      } else {
        setError(err instanceof Error ? err.message : t('unknownError'));
      }
    } finally {
      setLoadingReview(null);
      setIsStreamingReview(false);
      reviewAbortRef.current = null;
      // Refresh coin balance after operation completes (deduction happens server-side before streaming)
      onCoinsConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveReportToDB, onCoinsConsumed, locale, t, track]);

  // 플레이북 생성 (스트리밍)
  const generatePlaybook = useCallback(async (
    analysis: TradeAnalysis,
    username?: string,
  ) => {
    setLoadingPlaybook(true);
    setIsStreamingPlaybook(true);
    setStreamedPlaybookContent('');
    setError(null);

    const abortController = new AbortController();
    playbookAbortRef.current = abortController;
    let fullReport = '';

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
          type: 'playbook',
          analysis,
          username,
          locale,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (res.status === 402) {
        setError(t('insufficientCoins'));
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || t('unknownError'));
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('text/event-stream')) {
        fullReport = await readSSEStream(
          res,
          (text) => { fullReport = text; setStreamedPlaybookContent(text); },
          undefined,
          abortController.signal,
        );

        const generatedAt = new Date().toISOString();
        setPlaybookReport({ report: fullReport, generatedAt });
        track('ai_analysis_run', { report_type: 'playbook' });

        const title = t('playbookTitle');
        await saveReportToDB('playbook', title, fullReport, {
          totalTrades: analysis.profile.totalTrades,
          winRate: analysis.profile.winRate,
          overallGrade: analysis.profile.overallGrade,
          generatedAt,
        });
      } else {
        const data: AIReportResult = await res.json();
        fullReport = data.report;
        setPlaybookReport(data);
        setStreamedPlaybookContent(data.report);
        track('ai_analysis_run', { report_type: 'playbook' });

        const title = t('playbookTitle');
        await saveReportToDB('playbook', title, data.report, {
          totalTrades: analysis.profile.totalTrades,
          winRate: analysis.profile.winRate,
          overallGrade: analysis.profile.overallGrade,
          generatedAt: data.generatedAt,
        });
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        if (fullReport) {
          const generatedAt = new Date().toISOString();
          setPlaybookReport({ report: fullReport, generatedAt });
        }
      } else {
        setError(err instanceof Error ? err.message : t('unknownError'));
      }
    } finally {
      setLoadingPlaybook(false);
      setIsStreamingPlaybook(false);
      playbookAbortRef.current = null;
      onCoinsConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveReportToDB, onCoinsConsumed, locale, t, track]);

  const stopPlaybookStreaming = useCallback(() => {
    if (playbookAbortRef.current) {
      playbookAbortRef.current.abort();
      playbookAbortRef.current = null;
    }
  }, []);

  const clearPlaybook = useCallback(() => {
    setPlaybookReport(null);
    setStreamedPlaybookContent('');
  }, []);

  // USD 종목 여부 판별 (6자리 KRW 코드 또는 .KS/.KQ 아닌 경우)
  function isUSDSymbol(symbol: string): boolean {
    return !/^\d{6}$/.test(symbol) && !symbol.endsWith('.KS') && !symbol.endsWith('.KQ');
  }

  // 뉴스 감성 fetch (US 종목만, graceful degradation)
  const fetchNewsSentiment = useCallback(async (symbol: string, entryDate: string): Promise<NewsSentiment | null> => {
    if (!isUSDSymbol(symbol)) return null;
    try {
      const res = await fetch(`/api/stock-news-sentiment?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(entryDate)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error || data.sentimentScore === null) return null;
      return { score: data.sentimentScore, label: data.sentimentLabel, headlines: data.topHeadlines };
    } catch {
      return null;
    }
  }, []);

  const clearWeeklyReport = useCallback(() => {
    setWeeklyReport(null);
    setStreamedWeeklyContent('');
  }, []);

  return {
    weeklyReport,
    tradeReview,
    loadingWeekly,
    loadingReview,
    error,
    generateWeeklyReport,
    reviewTrade,
    clearWeeklyReport,
    playbookReport,
    loadingPlaybook,
    isStreamingPlaybook,
    streamedPlaybookContent,
    generatePlaybook,
    clearPlaybook,
    stopPlaybookStreaming,
    tradeSentiment,
    savedReports,
    loadingSavedReports,
    loadSavedReports,
    deleteReport,
    isStreamingWeekly,
    streamedWeeklyContent,
    isStreamingReview,
    streamedReviewContent,
    stopWeeklyStreaming,
    stopReviewStreaming,
  };
}
