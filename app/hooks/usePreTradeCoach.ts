// Hook for AI pre-trade checklist coach
// Calls Gemini API to generate personalized checklist before trade entry
import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { TradeAnalysis } from '@/app/types/analysis';

export interface PreTradeCoachResult {
  checklist: string;
  generatedAt: string;
}

const DEFAULT_CHECKLIST_KO = `- [ ] 손절가 정했나요?
- [ ] 충동 매매 아닌가요?
- [ ] 진입 근거가 명확한가요?`;

const DEFAULT_CHECKLIST_EN = `- [ ] Have you set a stop-loss?
- [ ] Is this not an impulse trade?
- [ ] Is your entry rationale clear?`;

const MIN_TRADES_FOR_AI = 5;

export function usePreTradeCoach(user: User | null, onCoinsConsumed?: () => void) {
  const [result, setResult] = useState<PreTradeCoachResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();

  const defaultChecklist = locale === 'en' ? DEFAULT_CHECKLIST_EN : DEFAULT_CHECKLIST_KO;

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
        checklist: defaultChecklist,
        generatedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    // Guest mode — no coins, show default
    if (!user) {
      setResult({
        checklist: defaultChecklist,
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
          locale,
        }),
      });

      if (res.status === 402) {
        setError('COIN_SHORTAGE');
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || 'AI_FAILED');
      }

      const data = await res.json();
      setResult({
        checklist: data.report,
        generatedAt: data.generatedAt,
      });
      onCoinsConsumed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UNKNOWN_ERROR');
    } finally {
      setLoading(false);
    }
  }, [user, onCoinsConsumed, locale, defaultChecklist]);

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
