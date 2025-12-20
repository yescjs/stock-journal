import { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { SymbolSummary, TagPerf, PnLPoint, InsightData } from '@/app/types/stats';
import { formatMonthLabel, getKoreanWeekdayLabel } from '@/app/utils/format';

export function useStats(trades: Trade[], currentPrices: Record<string, number> = {}) {

    // 1. Symbol Summaries
    const symbolSummaries = useMemo<SymbolSummary[]>(() => {
        if (trades.length === 0) return [];

        const sortedTrades = [...trades].sort((a, b) => {
            if (a.date === b.date) return a.id.localeCompare(b.id);
            return a.date.localeCompare(b.date);
        });

        const map = new Map<string, SymbolSummary>();

        for (const t of sortedTrades) {
            let s = map.get(t.symbol);
            if (!s) {
                s = {
                    symbol: t.symbol,
                    symbol_name: t.symbol_name,  // Include stock name from trade
                    totalBuyQty: 0,
                    totalBuyAmount: 0,
                    totalSellQty: 0,
                    totalSellAmount: 0,
                    positionQty: 0,
                    avgCost: 0,
                    costBasis: 0,
                    realizedPnL: 0,
                    winCount: 0,
                    lossCount: 0,
                    evenCount: 0,
                    tradeCount: 0,
                    winRate: 0,
                };
                map.set(t.symbol, s);
            } else if (t.symbol_name && !s.symbol_name) {
                // Update symbol_name if we encounter a trade with a name for an existing summary
                s.symbol_name = t.symbol_name;
            }

            const amount = t.price * t.quantity;

            if (t.side === 'BUY') {
                s.totalBuyQty += t.quantity;
                s.totalBuyAmount += amount;
                s.positionQty += t.quantity;
                s.costBasis += amount;
            } else {
                s.totalSellQty += t.quantity;
                s.totalSellAmount += amount;

                const prevQty = s.positionQty;
                const prevCostBasis = s.costBasis;
                const prevAvgCost = prevQty !== 0 ? prevCostBasis / prevQty : 0;

                const sellQty = t.quantity;
                const realizedThis = Math.round((t.price - prevAvgCost) * sellQty);

                s.realizedPnL += realizedThis;
                s.positionQty = prevQty - sellQty;
                s.costBasis = Math.round(prevCostBasis - prevAvgCost * sellQty);

                // Win/Loss Count
                s.tradeCount += 1;
                if (realizedThis > 0) s.winCount += 1;
                else if (realizedThis < 0) s.lossCount += 1;
                else s.evenCount += 1;
            }
        }

        const result: SymbolSummary[] = [];
        for (const s of map.values()) {
            if (s.positionQty > 0) {
                s.avgCost = s.costBasis / s.positionQty;
            } else {
                s.avgCost = 0;
                s.costBasis = 0;
            }

            s.winRate =
                s.tradeCount > 0 ? (s.winCount / s.tradeCount) * 100 : 0;

            result.push(s);
        }

        result.sort((a, b) => a.symbol.localeCompare(b.symbol));
        return result;
    }, [trades]);

    // 2. Tag Stats
    const tagStats = useMemo<TagPerf[]>(() => {
        if (trades.length === 0) return [];

        const sortedTrades = [...trades].sort((a, b) => {
            if (a.date === b.date) return a.id.localeCompare(b.id);
            return a.date.localeCompare(b.date);
        });

        type PosState = {
            positionQty: number;
            costBasis: number;
        };

        const posMap = new Map<string, PosState>();
        const tagMap = new Map<string, TagPerf>();

        for (const t of sortedTrades) {
            let pos = posMap.get(t.symbol);
            if (!pos) {
                pos = { positionQty: 0, costBasis: 0 };
                posMap.set(t.symbol, pos);
            }

            const amount = t.price * t.quantity;

            if (t.side === 'BUY') {
                pos.positionQty += t.quantity;
                pos.costBasis += amount;
            } else {
                const prevQty = pos.positionQty;
                const prevCostBasis = pos.costBasis;
                const prevAvgCost = prevQty !== 0 ? prevCostBasis / prevQty : 0;

                const sellQty = t.quantity;
                const realizedThis = Math.round((t.price - prevAvgCost) * sellQty);

                pos.positionQty = prevQty - sellQty;
                pos.costBasis = Math.round(prevCostBasis - prevAvgCost * sellQty);

                const tags = Array.isArray(t.tags) ? t.tags : [];
                for (const tag of tags) {
                    let tp = tagMap.get(tag);
                    if (!tp) {
                        tp = {
                            tag,
                            tradeCount: 0,
                            winCount: 0,
                            lossCount: 0,
                            evenCount: 0,
                            realizedPnL: 0,
                            avgPnLPerTrade: 0,
                            winRate: 0,
                        };
                        tagMap.set(tag, tp);
                    }

                    tp.tradeCount += 1;
                    tp.realizedPnL += realizedThis;

                    if (realizedThis > 0) tp.winCount += 1;
                    else if (realizedThis < 0) tp.lossCount += 1;
                    else tp.evenCount += 1;
                }
            }
        }

        const result: TagPerf[] = [];
        for (const tp of tagMap.values()) {
            if (tp.tradeCount > 0) {
                tp.avgPnLPerTrade = tp.realizedPnL / tp.tradeCount;
                tp.winRate = (tp.winCount / tp.tradeCount) * 100;
            }
            result.push(tp);
        }

        result.sort((a, b) => b.tradeCount - a.tradeCount);
        return result;
    }, [trades]);

    // 3. Daily Realized PnL
    const dailyRealizedPoints = useMemo<PnLPoint[]>(() => {
        if (trades.length === 0) return [];

        const sortedTrades = [...trades].sort((a, b) => {
            if (a.date === b.date) return a.id.localeCompare(b.id);
            return a.date.localeCompare(b.date);
        });

        type PosState = {
            positionQty: number;
            costBasis: number;
        };
        const posMap = new Map<string, PosState>();
        const dayMap = new Map<string, number>();

        for (const t of sortedTrades) {
            const amount = t.price * t.quantity;
            const symbol = t.symbol;

            let pos = posMap.get(symbol);
            if (!pos) {
                pos = { positionQty: 0, costBasis: 0 };
                posMap.set(symbol, pos);
            }

            if (t.side === 'BUY') {
                pos.positionQty += t.quantity;
                pos.costBasis += amount;
            } else {
                const prevQty = pos.positionQty;
                const prevCostBasis = pos.costBasis;
                const prevAvgCost = prevQty !== 0 ? prevCostBasis / prevQty : 0;

                const sellQty = t.quantity;
                const realizedThis = Math.round((t.price - prevAvgCost) * sellQty);

                pos.positionQty = prevQty - sellQty;
                pos.costBasis = Math.round(prevCostBasis - prevAvgCost * sellQty);

                const prevDay = dayMap.get(t.date) ?? 0;
                dayMap.set(t.date, prevDay + realizedThis);
            }
        }

        return Array.from(dayMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, value]) => ({
                key: date,
                label: date,
                value: Number.isFinite(value) ? value : 0,
            }));
    }, [trades]);

    // 4. Monthly Realized PnL
    const monthlyRealizedPoints = useMemo<PnLPoint[]>(() => {
        if (dailyRealizedPoints.length === 0) return [];

        const monthMap = new Map<string, number>();

        for (const pt of dailyRealizedPoints) {
            const monthKey =
                pt.key && pt.key.length >= 7 ? pt.key.slice(0, 7) : 'Other';
            const prev = monthMap.get(monthKey) ?? 0;
            monthMap.set(monthKey, prev + pt.value);
        }

        return Array.from(monthMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => ({
                key,
                label: formatMonthLabel(key),
                value: Number.isFinite(value) ? value : 0,
            }));
    }, [dailyRealizedPoints]);

    // 5. Overall Stats
    const overallStats = useMemo(() => {
        let totalBuyAmount = 0;
        let totalSellAmount = 0;
        let totalRealizedPnL = 0;

        let totalOpenCostBasis = 0;
        let totalOpenMarketValue = 0;

        for (const s of symbolSummaries) {
            totalBuyAmount += s.totalBuyAmount;
            totalSellAmount += s.totalSellAmount;
            totalRealizedPnL += s.realizedPnL;

            const price = currentPrices[s.symbol];
            if (s.positionQty > 0 && price !== undefined) {
                const costBasis = s.positionQty * s.avgCost;
                const marketValue = s.positionQty * price;

                totalOpenCostBasis += costBasis;
                totalOpenMarketValue += marketValue;
            }
        }

        const evalPnL = totalOpenMarketValue - totalOpenCostBasis;
        const totalPnL = totalRealizedPnL + evalPnL;

        const holdingReturnRate =
            totalOpenCostBasis > 0 ? (evalPnL / totalOpenCostBasis) * 100 : 0;

        return {
            totalBuyAmount,
            totalSellAmount,
            totalRealizedPnL,
            totalOpenCostBasis,
            totalOpenMarketValue,
            evalPnL,
            totalPnL,
            holdingReturnRate,
        };
    }, [symbolSummaries, currentPrices]);

    // 6. Insights
    const insights = useMemo<InsightData>(() => {
        if (trades.length === 0) return { bestDay: '', bestTag: '', longWinRate: 0, shortWinRate: 0, maxWin: 0, maxLoss: 0 };

        // Day Performance
        const dayPerf: Record<string, number> = {};

        let longWinCount = 0, longTotalCount = 0;
        let shortWinCount = 0, shortTotalCount = 0;
        let maxWin = 0;
        let maxLoss = 0;

        // Re-run PnL calculation Loop for Insights
        // (Similar to Daily PnL loop)
        const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));
        type PosState = { positionQty: number; costBasis: number; };
        const posMap = new Map<string, PosState>();

        for (const t of sortedTrades) {
            const amount = t.price * t.quantity;
            let pos = posMap.get(t.symbol);
            if (!pos) {
                pos = { positionQty: 0, costBasis: 0 };
                posMap.set(t.symbol, pos);
            }

            if (t.side === 'BUY') {
                pos.positionQty += t.quantity;
                pos.costBasis += amount;
            } else {
                const prevQty = pos.positionQty;
                const prevCostBasis = pos.costBasis;
                const prevAvgCost = prevQty !== 0 ? prevCostBasis / prevQty : 0;
                const realizedThis = Math.round((t.price - prevAvgCost) * t.quantity);

                // Update Position
                pos.positionQty = prevQty - t.quantity;
                pos.costBasis = Math.round(prevCostBasis - prevAvgCost * t.quantity);

                // --- Collect Stats ---

                // 1. Max Win/Loss
                if (realizedThis > maxWin) maxWin = realizedThis;
                if (realizedThis < maxLoss) maxLoss = realizedThis;

                // 2. Day of Week Stats
                const dayLabel = getKoreanWeekdayLabel(t.date); // "Mon", "Tue" etc.
                dayPerf[dayLabel] = (dayPerf[dayLabel] || 0) + realizedThis;

                // 3. Long/Short Stats (Assume Long for now as 'BUY' opens, 'SELL' closes)
                // Wait, `TradeList` logic: side=BUY/SELL.
                // In simple journal, BUY=Long Open, SELL=Long Close (usually).
                // If we support Shorting, SELL=Short Open.
                // Current logic assumes FIFO Long only (Buy then Sell).
                // So all realized PnL comes from "Long" trades?
                // Or does the user enter "Short Selling"?
                // The app doesn't seem to have "Position Side" (Long/Short).
                // It just has BUY/SELL Side.
                // Assuming Long-only strategy for now (Buy Low, Sell High).
                longTotalCount++;
                if (realizedThis > 0) longWinCount++;
            }
        }

        // Best Day
        let bestDay = '-';
        let maxDayPnL = -Infinity;
        for (const [day, pnl] of Object.entries(dayPerf)) {
            if (pnl > maxDayPnL) {
                maxDayPnL = pnl;
                bestDay = day;
            }
        }
        if (maxDayPnL === -Infinity) bestDay = '-';

        // Best Tag
        let bestTag = '-';
        if (tagStats.length > 0) {
            const sortedTags = [...tagStats].sort((a, b) => b.realizedPnL - a.realizedPnL);
            if (sortedTags[0].realizedPnL > 0) bestTag = sortedTags[0].tag;
        }

        return {
            bestDay,
            bestTag,
            longWinRate: longTotalCount > 0 ? (longWinCount / longTotalCount) * 100 : 0,
            shortWinRate: 0,
            maxWin,
            maxLoss
        };
    }, [trades, tagStats]);

    // RE-WRITE: Integrating into the main loop (TagStats or DailyRealized) is better.
    // Let's modify the DailyRealized loop (Step 3) to also capture "Win/Loss" per trade if possible?
    // DailyRealized aggregates by DAY.
    // If we want "Best Day of Week", we can use `dailyRealizedPoints`.
    // Identify which weekday has highest TOTAL PnL? Or highest Win Rate?
    // Total PnL is easiest.

    return {
        symbolSummaries,
        tagStats,
        dailyRealizedPoints,
        monthlyRealizedPoints,
        overallStats,
        insights
    };
}
