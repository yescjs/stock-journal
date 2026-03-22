'use client';

import { useState, useMemo, useEffect } from 'react';
import { ShieldAlert, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useEventTracking } from '@/app/hooks/useEventTracking';
import { useTranslations } from 'next-intl';

export function RiskRewardCalculator() {
  const { user } = useSupabaseAuth();
  const { track } = useEventTracking(user);
  const t = useTranslations('tools.calc.rr');
  const tc = useTranslations('tools.calc');

  useEffect(() => {
    track('tool_used', { tool: 'risk-reward' });
  }, [track]);
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [totalCapital, setTotalCapital] = useState('');
  const [riskPercent, setRiskPercent] = useState('2');

  const result = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const target = parseFloat(takeProfit);
    const capital = parseFloat(totalCapital);
    const riskPct = parseFloat(riskPercent);

    if (!entry || !stop || !target || entry <= 0 || stop <= 0 || target <= 0) return null;
    if (stop >= entry) return null;
    if (target <= entry) return null;

    const riskPerShare = entry - stop;
    const rewardPerShare = target - entry;
    const riskRewardRatio = rewardPerShare / riskPerShare;
    const stopLossPct = (riskPerShare / entry) * 100;
    const takeProfitPct = (rewardPerShare / entry) * 100;

    let recommendedShares: number | null = null;
    let maxLoss: number | null = null;
    if (capital > 0 && riskPct > 0) {
      const riskAmount = capital * (riskPct / 100);
      recommendedShares = Math.floor(riskAmount / riskPerShare);
      maxLoss = recommendedShares * riskPerShare;
    }

    return { riskRewardRatio, stopLossPct, takeProfitPct, recommendedShares, maxLoss };
  }, [entryPrice, stopLoss, takeProfit, totalCapital, riskPercent]);

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-primary/50 focus:bg-white/8';
  const labelClass = 'mb-1.5 block text-xs font-medium text-white/50';

  return (
    <div className="space-y-6">
      {/* Input form */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>{t('entryPrice')}</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="50,000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('stopLoss')}</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="47,000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('targetPrice')}</label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="58,000"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('totalCapital')}</label>
            <input
              type="number"
              value={totalCapital}
              onChange={(e) => setTotalCapital(e.target.value)}
              placeholder="10,000,000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('maxRiskPercent')}</label>
            <input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              placeholder="2"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Risk/Reward Ratio */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/50">
              <Target className="h-4 w-4" />
              {t('rrRatio')}
            </div>
            <div className="text-3xl font-bold">
              1 :{' '}
              <span
                className={
                  result.riskRewardRatio >= 2
                    ? 'text-emerald-400'
                    : result.riskRewardRatio >= 1
                      ? 'text-yellow-400'
                      : 'text-rose-400'
                }
              >
                {result.riskRewardRatio.toFixed(2)}
              </span>
            </div>
            <p className="mt-2 text-xs text-white/30">
              {result.riskRewardRatio >= 2
                ? t('goodRatio')
                : result.riskRewardRatio >= 1
                  ? t('moderateRatio')
                  : t('dangerousRatio')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Stop loss % */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <TrendingDown className="h-4 w-4" />
                {t('lossAtStop')}
              </div>
              <div className="text-xl font-bold text-rose-400">
                -{result.stopLossPct.toFixed(2)}%
              </div>
            </div>

            {/* Take profit % */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <TrendingUp className="h-4 w-4" />
                {t('profitAtTarget')}
              </div>
              <div className="text-xl font-bold text-emerald-400">
                +{result.takeProfitPct.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Recommended shares */}
          {result.recommendedShares !== null && result.maxLoss !== null && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <ShieldAlert className="h-4 w-4" />
                {t('recommendedSize')}
              </div>
              <div className="text-xl font-bold">
                {result.recommendedShares.toLocaleString()}{tc('shares')}
              </div>
              <p className="mt-1 text-xs text-white/30">
                {t('maxLoss', { amount: result.maxLoss.toLocaleString(), percent: riskPercent })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
