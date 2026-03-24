'use client';

import { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { isKRWSymbol } from '@/app/utils/format';

export interface HoldingItem {
  symbol: string;
  symbolName?: string;
  quantity: number;
  avgPrice: number;
  totalCost: number;
  currency: 'KRW' | 'USD';
}

export interface PortfolioHolding extends HoldingItem {
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
}

export interface PortfolioSummary {
  holdings: PortfolioHolding[];
  totalCost: number;
  totalMarketValue: number | null;
  totalUnrealizedPnl: number | null;
  totalUnrealizedPnlPercent: number | null;
  profitCount: number;
  lossCount: number;
  neutralCount: number;
}

/**
 * Extract open positions from trades using FIFO matching.
 * Unmatched BUY quantities after all SELLs = current holdings.
 */
function getOpenPositions(trades: Trade[]): HoldingItem[] {
  const bySymbol = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = bySymbol.get(t.symbol) ?? [];
    list.push(t);
    bySymbol.set(t.symbol, list);
  }

  const holdings: HoldingItem[] = [];

  for (const [symbol, symbolTrades] of bySymbol) {
    const sorted = [...symbolTrades].sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.side === 'BUY' && b.side === 'SELL') return -1;
      if (a.side === 'SELL' && b.side === 'BUY') return 1;
      return 0;
    });

    const buyQueue: { price: number; qty: number; symbolName?: string }[] = [];

    for (const trade of sorted) {
      if (trade.side === 'BUY') {
        buyQueue.push({
          price: trade.price,
          qty: trade.quantity,
          symbolName: trade.symbol_name,
        });
      } else {
        let remainingSellQty = trade.quantity;
        while (remainingSellQty > 0 && buyQueue.length > 0) {
          const oldest = buyQueue[0];
          const matchQty = Math.min(remainingSellQty, oldest.qty);
          oldest.qty -= matchQty;
          remainingSellQty -= matchQty;
          if (oldest.qty <= 0) buyQueue.shift();
        }
      }
    }

    // Remaining buyQueue = open position
    const totalQty = buyQueue.reduce((sum, b) => sum + b.qty, 0);
    if (totalQty > 0) {
      const totalCost = buyQueue.reduce((sum, b) => sum + b.price * b.qty, 0);
      const avgPrice = totalCost / totalQty;
      const symbolName = buyQueue[0]?.symbolName || symbolTrades.find(t => t.symbol_name)?.symbol_name;

      holdings.push({
        symbol,
        symbolName,
        quantity: totalQty,
        avgPrice,
        totalCost,
        currency: isKRWSymbol(symbol) ? 'KRW' : 'USD',
      });
    }
  }

  return holdings;
}

export function usePortfolio(
  trades: Trade[],
  currentPrices: Record<string, number>,
  exchangeRate: number
): PortfolioSummary {
  return useMemo(() => {
    const openPositions = getOpenPositions(trades);

    if (openPositions.length === 0) {
      return {
        holdings: [],
        totalCost: 0,
        totalMarketValue: null,
        totalUnrealizedPnl: null,
        totalUnrealizedPnlPercent: null,
        profitCount: 0,
        lossCount: 0,
        neutralCount: 0,
      };
    }

    const holdings: PortfolioHolding[] = openPositions.map(pos => {
      const price = currentPrices[pos.symbol] ?? null;
      const marketValue = price !== null ? price * pos.quantity : null;
      const unrealizedPnl = marketValue !== null ? marketValue - pos.totalCost : null;
      const unrealizedPnlPercent = unrealizedPnl !== null && pos.totalCost > 0
        ? (unrealizedPnl / pos.totalCost) * 100
        : null;

      return {
        ...pos,
        currentPrice: price,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
      };
    });

    // Sort by totalCost descending (largest position first)
    holdings.sort((a, b) => b.totalCost - a.totalCost);

    // Normalize all costs to KRW for total calculation
    let totalCost = 0;
    let totalMarketValue = 0;
    let hasAllPrices = true;
    let profitCount = 0;
    let lossCount = 0;
    let neutralCount = 0;

    for (const h of holdings) {
      const rate = h.currency === 'USD' ? exchangeRate : 1;
      totalCost += h.totalCost * rate;
      if (h.marketValue !== null) {
        totalMarketValue += h.marketValue * rate;
      } else {
        hasAllPrices = false;
      }

      if (h.unrealizedPnl !== null) {
        if (h.unrealizedPnl > 0) profitCount++;
        else if (h.unrealizedPnl < 0) lossCount++;
        else neutralCount++;
      } else {
        neutralCount++;
      }
    }

    const totalUnrealizedPnl = hasAllPrices ? totalMarketValue - totalCost : null;
    const totalUnrealizedPnlPercent = totalUnrealizedPnl !== null && totalCost > 0
      ? (totalUnrealizedPnl / totalCost) * 100
      : null;

    return {
      holdings,
      totalCost,
      totalMarketValue: hasAllPrices ? totalMarketValue : null,
      totalUnrealizedPnl,
      totalUnrealizedPnlPercent,
      profitCount,
      lossCount,
      neutralCount,
    };
  }, [trades, currentPrices, exchangeRate]);
}
