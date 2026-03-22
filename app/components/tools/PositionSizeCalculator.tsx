'use client';

import { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Coins } from 'lucide-react';
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useEventTracking } from '@/app/hooks/useEventTracking';
import { useTranslations } from 'next-intl';

export function PositionSizeCalculator() {
  const { user } = useSupabaseAuth();
  const { track } = useEventTracking(user);
  const t = useTranslations('tools.calc.ps');
  const tc = useTranslations('tools.calc');

  useEffect(() => {
    track('tool_used', { tool: 'position-size' });
  }, [track]);
  const [totalCapital, setTotalCapital] = useState('');
  const [riskPercent, setRiskPercent] = useState('2');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  const result = useMemo(() => {
    const capital = parseFloat(totalCapital);
    const riskPct = parseFloat(riskPercent);
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);

    if (!capital || !riskPct || !entry || !stop) return null;
    if (capital <= 0 || riskPct <= 0 || entry <= 0 || stop <= 0) return null;
    if (stop >= entry) return null;

    const riskAmount = capital * (riskPct / 100);
    const riskPerShare = entry - stop;
    const shares = Math.floor(riskAmount / riskPerShare);
    const maxLoss = shares * riskPerShare;
    const positionValue = shares * entry;
    const positionPct = (positionValue / capital) * 100;
    const stopLossPct = (riskPerShare / entry) * 100;

    return { shares, maxLoss, riskAmount, positionValue, positionPct, stopLossPct };
  }, [totalCapital, riskPercent, entryPrice, stopLoss]);

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-primary/50 focus:bg-white/8';
  const labelClass = 'mb-1.5 block text-xs font-medium text-white/50';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('totalCapital')}</label>
            <input type="number" value={totalCapital} onChange={(e) => setTotalCapital(e.target.value)} placeholder="10,000,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('maxRiskPercent')}</label>
            <input type="number" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} placeholder="2" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('entryPrice')}</label>
            <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="50,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('stopLoss')}</label>
            <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="47,000" className={inputClass} />
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <ShieldCheck className="h-4 w-4" />
              {t('optimalSize')}
            </div>
            <div className="text-3xl font-bold">{result.shares.toLocaleString()}{tc('shares')}</div>
            <p className="mt-1 text-xs text-white/30">
              {t('positionValue', { amount: result.positionValue.toLocaleString(), percent: result.positionPct.toFixed(1) })}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <AlertTriangle className="h-4 w-4" />
                {t('maxLoss')}
              </div>
              <div className="text-xl font-bold text-rose-400">{result.maxLoss.toLocaleString()}{tc('won')}</div>
              <p className="mt-1 text-xs text-white/30">{t('atStopLoss', { percent: result.stopLossPct.toFixed(2) })}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <Coins className="h-4 w-4" />
                {t('riskAllowance')}
              </div>
              <div className="text-xl font-bold">{result.riskAmount.toLocaleString()}{tc('won')}</div>
              <p className="mt-1 text-xs text-white/30">{t('ofAccount', { percent: riskPercent })}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-blue-500/5 p-4">
            <p className="text-xs text-white/40">
              {t('tip')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
