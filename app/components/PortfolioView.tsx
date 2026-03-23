'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Briefcase, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import type { PortfolioSummary } from '@/app/hooks/usePortfolio';

const PIE_COLORS = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb923c', '#a78bfa', '#4ade80'];

function formatCurrency(value: number, currency: 'KRW' | 'USD'): string {
  if (currency === 'USD') return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${Math.abs(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

function formatPnlSign(value: number, currency: 'KRW' | 'USD'): string {
  const sign = value >= 0 ? '+' : '-';
  if (currency === 'USD') return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${sign}${Math.abs(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

interface PortfolioViewProps {
  portfolio: PortfolioSummary;
  pricesLoading?: boolean;
  onRefreshPrices?: () => void;
}

export function PortfolioView({ portfolio, pricesLoading, onRefreshPrices }: PortfolioViewProps) {
  const t = useTranslations('analysis.portfolio');

  if (portfolio.holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
          <Briefcase size={36} className="text-white/20" />
        </div>
        <h3 className="text-xl font-bold text-white/60 mb-2">{t('emptyTitle')}</h3>
        <p className="text-sm text-white/30 max-w-md">{t('emptyDesc')}</p>
      </div>
    );
  }

  const { holdings, totalCost, totalMarketValue, totalUnrealizedPnl, totalUnrealizedPnlPercent, profitCount, lossCount } = portfolio;

  // Pie chart data: weight by totalCost
  const totalCostSum = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const pieData = holdings.map(h => ({
    name: h.symbolName || h.symbol,
    value: totalCostSum > 0 ? Math.round((h.totalCost / totalCostSum) * 1000) / 10 : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-white/8 bg-white/3">
          <p className="text-xs text-white/40 mb-1">{t('totalCost')}</p>
          <p className="text-sm font-bold text-white">{totalCost.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="p-4 rounded-2xl border border-white/8 bg-white/3">
          <p className="text-xs text-white/40 mb-1">{t('totalMarketValue')}</p>
          <p className="text-sm font-bold text-white">
            {totalMarketValue !== null
              ? totalMarketValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
              : '-'}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-white/8 bg-white/3">
          <p className="text-xs text-white/40 mb-1">{t('unrealizedPnl')}</p>
          <p className={`text-sm font-bold ${totalUnrealizedPnl !== null ? (totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-white/40'}`}>
            {totalUnrealizedPnl !== null
              ? `${totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
              : '-'}
            {totalUnrealizedPnlPercent !== null && (
              <span className="text-xs ml-1">({totalUnrealizedPnlPercent >= 0 ? '+' : ''}{totalUnrealizedPnlPercent.toFixed(1)}%)</span>
            )}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-white/8 bg-white/3">
          <p className="text-xs text-white/40 mb-1">{t('holdingCount')}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{holdings.length}</span>
            <span className="flex items-center gap-0.5 text-xs text-emerald-400"><TrendingUp size={10} />{profitCount}</span>
            <span className="flex items-center gap-0.5 text-xs text-rose-400"><TrendingDown size={10} />{lossCount}</span>
          </div>
        </div>
      </div>

      {/* Pie Chart + Legend */}
      <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">{t('allocation')}</h3>
          </div>
          {onRefreshPrices && (
            <button
              onClick={onRefreshPrices}
              disabled={pricesLoading}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <RefreshCw size={12} className={pricesLoading ? 'animate-spin' : ''} />
              {t('refresh')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20,22,32,0.97)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(value: number | undefined) => [`${value ?? 0}%`, t('weight')]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {pieData.slice(0, 6).map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-sm flex-none" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-white/60 truncate">{d.name}</span>
                </div>
                <span className="text-xs font-bold text-white/40 flex-none">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <h3 className="text-sm font-bold text-white">{t('holdingList')}</h3>
        </div>
        <div className="divide-y divide-white/5">
          {holdings.map((h, idx) => {
            const pnlColor = h.unrealizedPnl !== null
              ? (h.unrealizedPnl > 0 ? 'text-emerald-400' : h.unrealizedPnl < 0 ? 'text-rose-400' : 'text-white/40')
              : 'text-white/40';
            const PnlIcon = h.unrealizedPnl !== null
              ? (h.unrealizedPnl > 0 ? TrendingUp : h.unrealizedPnl < 0 ? TrendingDown : Minus)
              : Minus;

            return (
              <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: `${PIE_COLORS[idx % PIE_COLORS.length]}20` }}>
                    <span className="text-xs font-bold" style={{ color: PIE_COLORS[idx % PIE_COLORS.length] }}>{h.symbol.slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{h.symbolName || h.symbol}</p>
                    <p className="text-xs text-white/30">{h.quantity}{t('shares')} · {t('avg')} {formatCurrency(h.avgPrice, h.currency)}</p>
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div className="flex items-center justify-end gap-1">
                    <PnlIcon size={12} className={pnlColor} />
                    <p className={`text-sm font-bold ${pnlColor}`}>
                      {h.unrealizedPnl !== null ? formatPnlSign(h.unrealizedPnl, h.currency) : '-'}
                    </p>
                  </div>
                  <p className={`text-xs ${pnlColor}`}>
                    {h.unrealizedPnlPercent !== null
                      ? `${h.unrealizedPnlPercent >= 0 ? '+' : ''}${h.unrealizedPnlPercent.toFixed(1)}%`
                      : '-'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
