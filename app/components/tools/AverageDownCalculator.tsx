'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calculator, AlertTriangle, Coins } from 'lucide-react';
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useEventTracking } from '@/app/hooks/useEventTracking';
import { useTranslations } from 'next-intl';

type CalcMode = 'forward' | 'reverse';

export function AverageDownCalculator() {
  const { user } = useSupabaseAuth();
  const { track } = useEventTracking(user);
  const t = useTranslations('tools.calc.ad');
  const tc = useTranslations('tools.calc');

  useEffect(() => {
    track('tool_used', { tool: 'average-down' });
  }, [track]);
  const [mode, setMode] = useState<CalcMode>('reverse');

  const [currentAvg, setCurrentAvg] = useState('');
  const [currentQty, setCurrentQty] = useState('');

  const [addPrice, setAddPrice] = useState('');
  const [addQty, setAddQty] = useState('');

  const [targetAvg, setTargetAvg] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  const forwardResult = useMemo(() => {
    const avg = parseFloat(currentAvg);
    const qty = parseFloat(currentQty);
    const price = parseFloat(addPrice);
    const addQ = parseFloat(addQty);

    if (!avg || !qty || !price || !addQ || avg <= 0 || qty <= 0 || price <= 0 || addQ <= 0) return null;

    const totalCost = avg * qty + price * addQ;
    const totalQty = qty + addQ;
    const newAvg = totalCost / totalQty;
    const additionalInvestment = price * addQ;
    const totalInvestment = totalCost;

    return { newAvg, totalQty, additionalInvestment, totalInvestment };
  }, [currentAvg, currentQty, addPrice, addQty]);

  const reverseResult = useMemo(() => {
    const avg = parseFloat(currentAvg);
    const qty = parseFloat(currentQty);
    const target = parseFloat(targetAvg);
    const price = parseFloat(currentPrice);

    if (!avg || !qty || !target || !price || avg <= 0 || qty <= 0 || target <= 0 || price <= 0) return null;
    if (target >= avg) return null;
    if (price >= target) return null;

    const requiredQty = Math.ceil((qty * (avg - target)) / (target - price));
    const requiredInvestment = requiredQty * price;
    const totalInvestment = avg * qty + requiredInvestment;
    const totalQty = qty + requiredQty;
    const actualNewAvg = totalInvestment / totalQty;
    const recoveryPct = ((target / price) - 1) * 100;

    return { requiredQty, requiredInvestment, totalInvestment, totalQty, actualNewAvg, recoveryPct };
  }, [currentAvg, currentQty, targetAvg, currentPrice]);

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-primary/50 focus:bg-white/8';
  const labelClass = 'mb-1.5 block text-xs font-medium text-white/50';

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2 rounded-xl border border-white/8 bg-white/3 p-1">
        <button
          onClick={() => setMode('reverse')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === 'reverse' ? 'bg-primary text-white shadow-toss-sm' : 'text-white/50 hover:text-white/70'
          }`}
        >
          {t('reverseMode')}
        </button>
        <button
          onClick={() => setMode('forward')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === 'forward' ? 'bg-primary text-white shadow-toss-sm' : 'text-white/50 hover:text-white/70'
          }`}
        >
          {t('forwardMode')}
        </button>
      </div>

      {/* Common inputs */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('currentAvgPrice')}</label>
            <input type="number" value={currentAvg} onChange={(e) => setCurrentAvg(e.target.value)} placeholder="50,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('currentQty')}</label>
            <input type="number" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} placeholder="100" className={inputClass} />
          </div>
        </div>

        {mode === 'forward' ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('addBuyPrice')}</label>
              <input type="number" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder="40,000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('addBuyQty')}</label>
              <input type="number" value={addQty} onChange={(e) => setAddQty(e.target.value)} placeholder="100" className={inputClass} />
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('currentPrice')}</label>
              <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="38,000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('targetAvgPrice')}</label>
              <input type="number" value={targetAvg} onChange={(e) => setTargetAvg(e.target.value)} placeholder="44,000" className={inputClass} />
            </div>
          </div>
        )}
      </div>

      {/* Forward result */}
      {mode === 'forward' && forwardResult && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <Calculator className="h-4 w-4" />
              {t('newAvgPrice')}
            </div>
            <div className="text-3xl font-bold">{Math.round(forwardResult.newAvg).toLocaleString()}{tc('won')}</div>
            <p className="mt-1 text-xs text-white/30">{t('totalHolding', { qty: forwardResult.totalQty.toLocaleString() })}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <Coins className="h-4 w-4" />
              {t('additionalInvestment')}
            </div>
            <div className="text-xl font-bold">{forwardResult.additionalInvestment.toLocaleString()}{tc('won')}</div>
            <p className="mt-1 text-xs text-white/30">{t('totalInvestment', { amount: forwardResult.totalInvestment.toLocaleString() })}</p>
          </div>
        </div>
      )}

      {/* Reverse result */}
      {mode === 'reverse' && reverseResult && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <Calculator className="h-4 w-4" />
              {t('requiredAdditionalBuy')}
            </div>
            <div className="text-3xl font-bold">{reverseResult.requiredQty.toLocaleString()}{tc('shares')}</div>
            <p className="mt-1 text-xs text-white/30">
              {t('actualAvg', { amount: Math.round(reverseResult.actualNewAvg).toLocaleString() })}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <Coins className="h-4 w-4" />
                {t('requiredInvestment')}
              </div>
              <div className="text-xl font-bold">{reverseResult.requiredInvestment.toLocaleString()}{tc('won')}</div>
              <p className="mt-1 text-xs text-white/30">{t('totalInvestmentAmount', { amount: reverseResult.totalInvestment.toLocaleString() })}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <AlertTriangle className="h-4 w-4" />
                {t('untilRecovery')}
              </div>
              <div className="text-xl font-bold text-yellow-400">+{reverseResult.recoveryPct.toFixed(1)}%</div>
              <p className="mt-1 text-xs text-white/30">{t('requiredRise')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
