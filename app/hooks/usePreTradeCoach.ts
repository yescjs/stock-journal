// Hook for AI pre-trade checklist coach
// Calls Gemini API to generate personalized checklist before trade entry
import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { TradeAnalysis } from '@/app/types/analysis';

export interface PreTradeCoachResult {
  checklist: string;
  generatedAt: string;
}

const DEFAULT_CHECKLIST = `- [ ] 손절가 정했나요?
- [ ] 충동 매매 아닌가요?
- [ ] 진입 근거가 명확한가요?`;

const MIN_TRADES_FOR_AI = 5;

export function usePreTradeCoach(user: User | null, onCoinsConsumed?: () => void) {
  const [result, setResult] = useState<PreTradeCoachResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateChecklist = useCallback(async (
    analysis: TradeAnalysis | null,
    symbol: string,
    side: string,
  ) => {
    setLoading(true);
    setError(null);

    // Not enough data — show default checklist
    if (!analysis || analysis.profile.totalTrades < MIN_TRADES_FOR_AI) {
      setResult({
        checklist: DEFAULT_CHECKLIST,
        generatedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    // Guest mode — no coins, show default
    if (!user) {
      setResult({
        checklist: DEFAULT_CHECKLIST,
        generatedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

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
          type: 'pre_trade_coach',
          analysis,
          symbol,
          side,
        }),
      });

      if (res.status === 402) {
        setError('코인이 부족합니다. 코인을 충전해주세요.');
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || '체크리스트 생성에 실패했습니다.');
      }

      const data = await res.json();
      setResult({
        checklist: data.report,
        generatedAt: data.generatedAt,
      });
      onCoinsConsumed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, onCoinsConsumed]);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    generateChecklist,
    clear,
  };
}
