'use client';

import { useState, useMemo } from 'react';
import { Calculator, AlertTriangle, Coins } from 'lucide-react';

type CalcMode = 'forward' | 'reverse';

export function AverageDownCalculator() {
  const [mode, setMode] = useState<CalcMode>('reverse');

  // 공통 입력
  const [currentAvg, setCurrentAvg] = useState('');
  const [currentQty, setCurrentQty] = useState('');

  // 순방향: 추가 매수 입력
  const [addPrice, setAddPrice] = useState('');
  const [addQty, setAddQty] = useState('');

  // 역방향: 목표 평단가 + 현재가 입력
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
    if (target >= avg) return null; // 목표 평단가가 현재보다 낮아야 함
    if (price >= target) return null; // 현재가가 목표 평단가보다 낮아야 역산 가능

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
      {/* 모드 토글 */}
      <div className="flex gap-2 rounded-xl border border-white/8 bg-white/3 p-1">
        <button
          onClick={() => setMode('reverse')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === 'reverse' ? 'bg-primary text-white shadow-toss-sm' : 'text-white/50 hover:text-white/70'
          }`}
        >
          역산 (목표 평단가)
        </button>
        <button
          onClick={() => setMode('forward')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === 'forward' ? 'bg-primary text-white shadow-toss-sm' : 'text-white/50 hover:text-white/70'
          }`}
        >
          순방향 (추가 매수)
        </button>
      </div>

      {/* 공통 입력 */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>현재 평균 매수가 (원)</label>
            <input type="number" value={currentAvg} onChange={(e) => setCurrentAvg(e.target.value)} placeholder="50,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>현재 보유 수량 (주)</label>
            <input type="number" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} placeholder="100" className={inputClass} />
          </div>
        </div>

        {mode === 'forward' ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>추가 매수가 (원)</label>
              <input type="number" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder="40,000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>추가 매수 수량 (주)</label>
              <input type="number" value={addQty} onChange={(e) => setAddQty(e.target.value)} placeholder="100" className={inputClass} />
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>현재가 (원)</label>
              <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="38,000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>목표 평균 매수가 (원)</label>
              <input type="number" value={targetAvg} onChange={(e) => setTargetAvg(e.target.value)} placeholder="44,000" className={inputClass} />
            </div>
          </div>
        )}
      </div>

      {/* 순방향 결과 */}
      {mode === 'forward' && forwardResult && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <Calculator className="h-4 w-4" />
              새 평균 매수가
            </div>
            <div className="text-3xl font-bold">{Math.round(forwardResult.newAvg).toLocaleString()}원</div>
            <p className="mt-1 text-xs text-white/30">총 {forwardResult.totalQty.toLocaleString()}주 보유</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <Coins className="h-4 w-4" />
              추가 투자금
            </div>
            <div className="text-xl font-bold">{forwardResult.additionalInvestment.toLocaleString()}원</div>
            <p className="mt-1 text-xs text-white/30">총 투자금: {forwardResult.totalInvestment.toLocaleString()}원</p>
          </div>
        </div>
      )}

      {/* 역산 결과 */}
      {mode === 'reverse' && reverseResult && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
              <Calculator className="h-4 w-4" />
              필요 추가 매수
            </div>
            <div className="text-3xl font-bold">{reverseResult.requiredQty.toLocaleString()}주</div>
            <p className="mt-1 text-xs text-white/30">
              실제 평단가: {Math.round(reverseResult.actualNewAvg).toLocaleString()}원
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <Coins className="h-4 w-4" />
                필요 투자금
              </div>
              <div className="text-xl font-bold">{reverseResult.requiredInvestment.toLocaleString()}원</div>
              <p className="mt-1 text-xs text-white/30">총 투자금: {reverseResult.totalInvestment.toLocaleString()}원</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/50">
                <AlertTriangle className="h-4 w-4" />
                목표가 회복까지
              </div>
              <div className="text-xl font-bold text-yellow-400">+{reverseResult.recoveryPct.toFixed(1)}%</div>
              <p className="mt-1 text-xs text-white/30">현재가에서 목표 평단가까지 필요한 상승률</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
