import { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { SymbolSummary, TagPerf, PnLPoint, InsightData, StrategyPerf, EquityPoint, WeekdayStats, HoldingPeriodStats, OverallStats } from '@/app/types/stats';
import { formatMonthLabel, getKoreanWeekdayLabel } from '@/app/utils/format';


// Helper to check if symbol is KRW (6 digits)
const isKRWSymbol = (symbol: string) => /^\d{6}$/.test(symbol);

export function useStats(
    trades: Trade[],
    currentPrices: Record<string, number> = {},
    exchangeRate: number = 1430,
    strategyNameMap: Record<string, string> = {}
) {

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
                    unrealizedPnL: 0,
                    currentValuation: 0,
                    totalPnL: 0,
                    avgPnL: 0,
                };
                map.set(t.symbol, s);
            } else if (t.symbol_name && !s.symbol_name) {
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
                const realizedRaw = (t.price - prevAvgCost) * sellQty;

                // Convert PnL to KRW if USD (based on symbol format)
                const isKRW = isKRWSymbol(t.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;
                const realizedThis = realizedRaw * multiplier;

                s.realizedPnL += realizedThis;
                s.positionQty = prevQty - sellQty;
                s.costBasis = prevCostBasis - prevAvgCost * sellQty; // Keep cost basis in original currency

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

            // Unrealized PnL Calculation
            if (s.positionQty > 0) {
                const isKRW = isKRWSymbol(s.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;

                const currentPrice = currentPrices[s.symbol] || s.avgCost;
                const valuationRaw = s.positionQty * currentPrice;
                const costRaw = s.positionQty * s.avgCost;

                s.unrealizedPnL = (valuationRaw - costRaw) * multiplier;
                s.currentValuation = valuationRaw * multiplier;
            } else {
                s.unrealizedPnL = 0;
                s.currentValuation = 0;
            }

            s.totalPnL = s.realizedPnL + s.unrealizedPnL;
            s.winRate = s.tradeCount > 0 ? (s.winCount / s.tradeCount) * 100 : 0;
            s.avgPnL = s.tradeCount > 0 ? s.realizedPnL / s.tradeCount : 0;

            result.push(s);
        }

        result.sort((a, b) => a.symbol.localeCompare(b.symbol));
        return result;
    }, [trades, currentPrices, exchangeRate]);

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
                const realizedRaw = (t.price - prevAvgCost) * sellQty;

                // Currency Conversion
                const isKRW = isKRWSymbol(t.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;
                const realizedThis = realizedRaw * multiplier;

                pos.positionQty = prevQty - sellQty;
                pos.costBasis = prevCostBasis - prevAvgCost * sellQty;

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
    }, [trades, exchangeRate]);

    // 2.5 Strategy Stats (전략별 성과)
    const strategyStats = useMemo<StrategyPerf[]>(() => {
        if (trades.length === 0) return [];

        const sortedTrades = [...trades].sort((a, b) => {
            if (a.date === b.date) return a.id.localeCompare(b.id);
            return a.date.localeCompare(b.date);
        });

        type PosState = { positionQty: number; costBasis: number };
        const posMap = new Map<string, PosState>();
        const strategyMap = new Map<string, StrategyPerf>();

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

                const realizedRaw = (t.price - prevAvgCost) * t.quantity;

                // Currency Conversion
                const isKRW = isKRWSymbol(t.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;
                const realizedThis = realizedRaw * multiplier;

                pos.positionQty = prevQty - t.quantity;
                pos.costBasis = prevCostBasis - prevAvgCost * t.quantity;

                // 전략 ID가 있는 경우에만 집계
                const strategyId = t.strategy_id || t.strategy_name;
                if (strategyId) {
                    let sp = strategyMap.get(strategyId);
                    if (!sp) {
                        sp = {
                            strategyId,
                            strategyName: t.strategy_name || strategyNameMap[strategyId] || strategyId,
                            tradeCount: 0,
                            winCount: 0,
                            lossCount: 0,
                            evenCount: 0,
                            winRate: 0,
                            totalPnL: 0,
                            avgPnLPerTrade: 0,
                            maxWin: 0,
                            maxLoss: 0,
                        };
                        strategyMap.set(strategyId, sp);
                    }

                    sp.tradeCount += 1;
                    sp.totalPnL += realizedThis;

                    if (realizedThis > 0) {
                        sp.winCount += 1;
                        if (realizedThis > sp.maxWin) sp.maxWin = realizedThis;
                    } else if (realizedThis < 0) {
                        sp.lossCount += 1;
                        if (realizedThis < sp.maxLoss) sp.maxLoss = realizedThis;
                    } else {
                        sp.evenCount += 1;
                    }
                }
            }
        }

        const result: StrategyPerf[] = [];
        for (const sp of strategyMap.values()) {
            if (sp.tradeCount > 0) {
                sp.avgPnLPerTrade = sp.totalPnL / sp.tradeCount;
                sp.winRate = (sp.winCount / sp.tradeCount) * 100;
            }
            result.push(sp);
        }

        result.sort((a, b) => b.totalPnL - a.totalPnL);
        return result;
    }, [trades, strategyNameMap]);

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
                const realizedRaw = (t.price - prevAvgCost) * sellQty;

                // Currency Conversion
                const isKRW = isKRWSymbol(t.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;
                const realizedThis = Math.round(realizedRaw * multiplier);

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
    }, [trades, exchangeRate]);

    // 3.5 Equity Curve (Daily)
    const equityPoints = useMemo<EquityPoint[]>(() => {
        if (dailyRealizedPoints.length === 0) return [];

        let cumulative = 0;
        let peak = 0;
        const points: EquityPoint[] = [];

        for (const pt of dailyRealizedPoints) {
            cumulative += pt.value;
            if (cumulative > peak) peak = cumulative;

            const drawdown = cumulative - peak; // 음수 또는 0
            const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

            points.push({
                date: pt.key,
                cumulativePnL: cumulative,
                drawdown,
                drawdownPercent,
            });
        }

        return points;
    }, [dailyRealizedPoints]);

    // 4. Monthly Realized PnL & Equity Curve
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

    const monthlyEquityPoints = useMemo<EquityPoint[]>(() => {
        if (monthlyRealizedPoints.length === 0) return [];

        let cumulative = 0;
        let peak = 0;
        const points: EquityPoint[] = [];

        for (const pt of monthlyRealizedPoints) {
            cumulative += pt.value;
            if (cumulative > peak) peak = cumulative;

            const drawdown = cumulative - peak;
            const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

            points.push({
                date: pt.key, // YYYY-MM
                cumulativePnL: cumulative,
                drawdown,
                drawdownPercent,
            });
        }
        return points;
    }, [monthlyRealizedPoints]);

    // 3. Overall Stats
    const overallStats = useMemo<OverallStats>(() => {
        if (trades.length === 0) {
            return {
                totalTrades: 0,
                winRate: 0,
                profitFactor: 0,
                totalPnL: 0,
                avgWin: 0,
                avgLoss: 0,
                maxWin: 0,
                maxLoss: 0,
                currentStreak: 0,
                longestWinStreak: 0,
                longestLossStreak: 0,
            };
        }

        let winCount = 0;
        let lossCount = 0;
        let totalWin = 0;
        let totalLoss = 0;
        let currentStreak = 0;
        let maxWin = 0;
        let maxLoss = 0;
        let longestWinStreak = 0;
        let longestLossStreak = 0;
        let totalTradesCount = 0;
        let totalPnL = 0;

        const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));
        const posMap: Record<string, { qty: number, avg: number }> = {};

        sortedTrades.forEach(t => {
            if (!posMap[t.symbol]) posMap[t.symbol] = { qty: 0, avg: 0 };
            const p = posMap[t.symbol];

            if (t.side === 'BUY') {
                const cost = p.qty * p.avg + t.quantity * t.price;
                p.qty += t.quantity;
                p.avg = cost / p.qty;
            } else {
                if (p.qty > 0) {
                    const q = Math.min(p.qty, t.quantity);
                    const pnlRaw = (t.price - p.avg) * q;

                    // Currency Conversion
                    const isKRW = isKRWSymbol(t.symbol);
                    const multiplier = isKRW ? 1 : exchangeRate;
                    const pnl = pnlRaw * multiplier;

                    totalTradesCount++;
                    totalPnL += pnl;

                    if (pnl > 0) {
                        winCount++;
                        totalWin += pnl;
                        if (pnl > maxWin) maxWin = pnl;

                        if (currentStreak >= 0) currentStreak++;
                        else currentStreak = 1;

                        if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;

                    } else if (pnl < 0) {
                        lossCount++;
                        totalLoss += pnl;
                        if (pnl < maxLoss) maxLoss = pnl;

                        if (currentStreak <= 0) currentStreak--;
                        else currentStreak = -1;

                        // Streak is negative for losses, so we check magnitude
                        if (Math.abs(currentStreak) > longestLossStreak) longestLossStreak = Math.abs(currentStreak);

                    } else {
                        // Even
                    }

                    p.qty -= q;
                    if (p.qty === 0) p.avg = 0;
                }
            }
        });

        return {
            totalTrades: totalTradesCount,
            winRate: totalTradesCount > 0 ? (winCount / totalTradesCount) * 100 : 0,
            profitFactor: Math.abs(totalLoss) > 0 ? totalWin / Math.abs(totalLoss) : (totalWin > 0 ? 999 : 0),
            totalPnL,
            avgWin: winCount > 0 ? totalWin / winCount : 0,
            avgLoss: lossCount > 0 ? totalLoss / lossCount : 0,
            maxWin,
            maxLoss,
            currentStreak,
            longestWinStreak,
            longestLossStreak,
        };
    }, [trades, exchangeRate]);

    // 5. Overall Stats (Original content, now renamed to avoid conflict and keep existing logic)
    const overallStats_old = useMemo(() => {
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

    // 5.5 Weekday Stats (요일별 통계)
    const weekdayStats = useMemo<WeekdayStats[]>(() => {
        if (trades.length === 0) return [];

        const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));
        type PosState = { positionQty: number; costBasis: number };
        const posMap = new Map<string, PosState>();

        // 요일별 집계 (0=일, 1=월, ..., 6=토)
        const dayStats: Record<number, { tradeCount: number; winCount: number; lossCount: number; totalPnL: number }> = {};
        for (let i = 0; i < 7; i++) {
            dayStats[i] = { tradeCount: 0, winCount: 0, lossCount: 0, totalPnL: 0 };
        }

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
                // Currency Conversion
                const isKRW = isKRWSymbol(t.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;
                const realizedThis = Math.round((t.price - prevAvgCost) * t.quantity * multiplier);

                pos.positionQty = prevQty - t.quantity;
                pos.costBasis = Math.round(prevCostBasis - prevAvgCost * t.quantity);

                const dateObj = new Date(t.date);
                const dayIndex = dateObj.getDay(); // 0-6

                dayStats[dayIndex].tradeCount += 1;
                dayStats[dayIndex].totalPnL += realizedThis;
                if (realizedThis > 0) dayStats[dayIndex].winCount += 1;
                else if (realizedThis < 0) dayStats[dayIndex].lossCount += 1;
            }
        }

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const result: WeekdayStats[] = [];

        for (let i = 0; i < 7; i++) {
            const stats = dayStats[i];
            result.push({
                day: dayNames[i],
                dayIndex: i,
                tradeCount: stats.tradeCount,
                winCount: stats.winCount,
                lossCount: stats.lossCount,
                winRate: stats.tradeCount > 0 ? (stats.winCount / stats.tradeCount) * 100 : 0,
                totalPnL: stats.totalPnL,
                avgPnL: stats.tradeCount > 0 ? stats.totalPnL / stats.tradeCount : 0,
            });
        }

        return result;
    }, [trades, exchangeRate]);

    // 6. Insights (연속 손익, 드로다운 포함)
    const insights = useMemo<InsightData>(() => {
        const defaultInsights: InsightData = {
            bestDay: '',
            bestTag: '',
            longWinRate: 0,
            shortWinRate: 0,
            maxWin: 0,
            maxLoss: 0,
            currentStreak: { type: 'none', count: 0 },
            maxWinStreak: 0,
            maxLossStreak: 0,
            maxDrawdown: 0,
            maxDrawdownPercent: 0,
        };

        if (trades.length === 0) return defaultInsights;

        // Day Performance
        const dayPerf: Record<string, number> = {};

        let longWinCount = 0, longTotalCount = 0;
        let maxWin = 0;
        let maxLoss = 0;

        // 연속 손익 트래킹
        let currentStreakType: 'win' | 'loss' | 'none' = 'none';
        let currentStreakCount = 0;
        let maxWinStreak = 0;
        let maxLossStreak = 0;

        // 결과 목록 (날짜순)
        const tradeResults: { date: string; pnl: number }[] = [];

        // Re-run PnL calculation Loop for Insights
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
                const realizedRaw = (t.price - prevAvgCost) * t.quantity;

                // Currency Conversion
                const isKRW = isKRWSymbol(t.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;
                const realizedThis = Math.round(realizedRaw * multiplier);

                // Update Position
                pos.positionQty = prevQty - t.quantity;
                pos.costBasis = Math.round(prevCostBasis - prevAvgCost * t.quantity);

                // 결과 저장
                tradeResults.push({ date: t.date, pnl: realizedThis });

                // --- Collect Stats ---

                // 1. Max Win/Loss
                if (realizedThis > maxWin) maxWin = realizedThis;
                if (realizedThis < maxLoss) maxLoss = realizedThis;

                // 2. Day of Week Stats
                const dayLabel = getKoreanWeekdayLabel(t.date);
                dayPerf[dayLabel] = (dayPerf[dayLabel] || 0) + realizedThis;

                // 3. Long Stats
                longTotalCount++;
                if (realizedThis > 0) longWinCount++;

                // 4. 연속 손익 계산
                if (realizedThis > 0) {
                    if (currentStreakType === 'win') {
                        currentStreakCount++;
                    } else {
                        // 이전 연패 기록 업데이트
                        if (currentStreakType === 'loss' && currentStreakCount > maxLossStreak) {
                            maxLossStreak = currentStreakCount;
                        }
                        currentStreakType = 'win';
                        currentStreakCount = 1;
                    }
                    if (currentStreakCount > maxWinStreak) maxWinStreak = currentStreakCount;
                } else if (realizedThis < 0) {
                    if (currentStreakType === 'loss') {
                        currentStreakCount++;
                    } else {
                        // 이전 연승 기록 업데이트
                        if (currentStreakType === 'win' && currentStreakCount > maxWinStreak) {
                            maxWinStreak = currentStreakCount;
                        }
                        currentStreakType = 'loss';
                        currentStreakCount = 1;
                    }
                    if (currentStreakCount > maxLossStreak) maxLossStreak = currentStreakCount;
                }
                // 손익이 0인 경우 streak 유지
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

        // 드로다운 계산
        let maxDrawdown = 0;
        let maxDrawdownPercent = 0;
        if (equityPoints.length > 0) {
            for (const pt of equityPoints) {
                if (pt.drawdown < maxDrawdown) {
                    maxDrawdown = pt.drawdown;
                    maxDrawdownPercent = pt.drawdownPercent;
                }
            }
        }

        return {
            bestDay,
            bestTag,
            longWinRate: longTotalCount > 0 ? (longWinCount / longTotalCount) * 100 : 0,
            shortWinRate: 0,
            maxWin,
            maxLoss,
            currentStreak: { type: currentStreakType, count: currentStreakCount },
            maxWinStreak,
            maxLossStreak,
            maxDrawdown,
            maxDrawdownPercent,
        };
    }, [trades, tagStats, equityPoints]);

    // 10. Holding Period Stats (보유 기간별 분석)
    const holdingPeriodStats = useMemo<HoldingPeriodStats[]>(() => {
        if (trades.length === 0) return [];

        // 종목별로 매수/매도를 연결해서 보유 기간 계산
        const sortedTrades = [...trades].sort((a, b) => {
            if (a.date === b.date) return a.id.localeCompare(b.id);
            return a.date.localeCompare(b.date);
        });

        interface TradeResult {
            holdingDays: number;
            pnl: number;
        }

        const results: TradeResult[] = [];
        const positionMap = new Map<string, { date: string; qty: number; avgPrice: number }[]>();

        for (const t of sortedTrades) {
            if (t.side === 'BUY') {
                const positions = positionMap.get(t.symbol) || [];
                positions.push({ date: t.date, qty: t.quantity, avgPrice: t.price });
                positionMap.set(t.symbol, positions);
            } else if (t.side === 'SELL') {
                const positions = positionMap.get(t.symbol) || [];
                let sellQty = t.quantity;

                while (sellQty > 0 && positions.length > 0) {
                    const pos = positions[0];
                    const matchQty = Math.min(sellQty, pos.qty);

                    // 보유 기간 계산
                    const buyDate = new Date(pos.date);
                    const sellDate = new Date(t.date);
                    const holdingDays = Math.max(0, Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));

                    // 손익 계산
                    const pnlRaw = (t.price - pos.avgPrice) * matchQty;

                    // Currency Conversion
                    const isKRW = isKRWSymbol(t.symbol);
                    const multiplier = isKRW ? 1 : exchangeRate;
                    const pnl = pnlRaw * multiplier;

                    results.push({ holdingDays, pnl });

                    pos.qty -= matchQty;
                    sellQty -= matchQty;

                    if (pos.qty <= 0) {
                        positions.shift();
                    }
                }
                positionMap.set(t.symbol, positions);
            }
        }

        if (results.length === 0) return [];

        // 기간별로 분류
        const periods = [
            { key: 0, label: '당일', min: 0, max: 0 },
            { key: 1, label: '1~3일', min: 1, max: 3 },
            { key: 2, label: '4~7일', min: 4, max: 7 },
            { key: 3, label: '1~2주', min: 8, max: 14 },
            { key: 4, label: '2주~1달', min: 15, max: 30 },
            { key: 5, label: '1달+', min: 31, max: Infinity },
        ];

        const stats: HoldingPeriodStats[] = periods.map(p => ({
            period: p.label,
            periodKey: p.key,
            tradeCount: 0,
            winCount: 0,
            lossCount: 0,
            winRate: 0,
            totalPnL: 0,
            avgPnL: 0,
            avgHoldingDays: 0,
        }));

        let totalHoldingDays: number[] = periods.map(() => 0);

        for (const r of results) {
            const periodIdx = periods.findIndex(p => r.holdingDays >= p.min && r.holdingDays <= p.max);
            if (periodIdx >= 0) {
                stats[periodIdx].tradeCount++;
                stats[periodIdx].totalPnL += r.pnl;
                totalHoldingDays[periodIdx] += r.holdingDays;
                if (r.pnl > 0) stats[periodIdx].winCount++;
                else if (r.pnl < 0) stats[periodIdx].lossCount++;
            }
        }

        // 계산 마무리
        for (let i = 0; i < stats.length; i++) {
            const s = stats[i];
            if (s.tradeCount > 0) {
                s.winRate = (s.winCount / s.tradeCount) * 100;
                s.avgPnL = s.totalPnL / s.tradeCount;
                s.avgHoldingDays = totalHoldingDays[i] / s.tradeCount;
            }
        }

        // 거래가 있는 기간만 반환
        return stats.filter(s => s.tradeCount > 0);
    }, [trades, exchangeRate]);

    return {
        symbolSummaries,
        tagStats,
        strategyStats,
        dailyRealizedPoints,
        monthlyRealizedPoints,
        equityPoints,
        monthlyEquityPoints,
        weekdayStats,
        holdingPeriodStats,
        overallStats,
        insights
    };
}

