'use client';

import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Coins, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useEventTracking } from '@/app/hooks/useEventTracking';

export function CompoundCalculator() {
  const { user } = useSupabaseAuth();
  const { track } = useEventTracking(user);

  useEffect(() => {
    track('tool_used', { tool: 'compound-calculator' });
  }, [track]);
  const [initialAmount, setInitialAmount] = useState('1000');
  const [monthlyAmount, setMonthlyAmount] = useState('100');
  const [annualReturn, setAnnualReturn] = useState('10');
  const [years, setYears] = useState('10');

  const result = useMemo(() => {
    const initial = parseFloat(initialAmount) * 10000; // 만원 단위 입력
    const monthly = parseFloat(monthlyAmount) * 10000;
    const rate = parseFloat(annualReturn) / 100;
    const period = parseInt(years);

    if (isNaN(initial) || isNaN(monthly) || isNaN(rate) || isNaN(period) || period <= 0) return null;

    const monthlyRate = rate / 12;
    const chartData: { year: number; total: number; principal: number }[] = [];

    let total = initial;
    let principal = initial;

    chartData.push({ year: 0, total: Math.round(total), principal: Math.round(principal) });

    for (let y = 1; y <= period; y++) {
      for (let m = 0; m < 12; m++) {
        total = total * (1 + monthlyRate) + monthly;
        principal += monthly;
      }
      chartData.push({ year: y, total: Math.round(total), principal: Math.round(principal) });
    }

    const finalTotal = Math.round(total);
    const totalPrincipal = Math.round(principal);
    const totalReturn = finalTotal - totalPrincipal;
    const totalReturnPct = totalPrincipal > 0 ? ((totalReturn / totalPrincipal) * 100) : 0;

    return { finalTotal, totalPrincipal, totalReturn, totalReturnPct, chartData };
  }, [initialAmount, monthlyAmount, annualReturn, years]);

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-primary/50 focus:bg-white/8';
  const labelClass = 'mb-1.5 block text-xs font-medium text-white/50';

  const formatKrw = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
    if (value >= 10000) return `${Math.round(value / 10000).toLocaleString()}만`;
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>초기 투자금 (만원)</label>
            <input type="number" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} placeholder="1,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>월 적립금 (만원)</label>
            <input type="number" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="100" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>연 수익률 (%)</label>
            <input type="number" value={annualReturn} onChange={(e) => setAnnualReturn(e.target.value)} placeholder="10" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>투자 기간 (년)</label>
            <input type="number" value={years} onChange={(e) => setYears(e.target.value)} placeholder="10" className={inputClass} />
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          {/* 최종 금액 */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <TrendingUp className="h-4 w-4" />
              최종 예상 금액
            </div>
            <div className="text-3xl font-bold text-emerald-400">{formatKrw(result.finalTotal)}원</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <Coins className="h-4 w-4" />
                총 투자 원금
              </div>
              <div className="text-xl font-bold">{formatKrw(result.totalPrincipal)}원</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <Calendar className="h-4 w-4" />
                복리 수익
              </div>
              <div className="text-xl font-bold text-emerald-400">
                +{formatKrw(result.totalReturn)}원
                <span className="ml-2 text-sm text-white/40">({result.totalReturnPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* 차트 */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-4 text-xs font-medium text-white/50">연도별 자산 성장</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} unit="년" />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatKrw} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1C24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      `${formatKrw(value ?? 0)}원`,
                      name === 'total' ? '총 자산' : '투자 원금',
                    ]}
                    labelFormatter={(label) => `${label}년차`}
                  />
                  <Area type="monotone" dataKey="principal" stroke="#3182F6" fill="#3182F6" fillOpacity={0.1} strokeWidth={1.5} name="principal" />
                  <Area type="monotone" dataKey="total" stroke="#34D399" fill="#34D399" fillOpacity={0.15} strokeWidth={2} name="total" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
