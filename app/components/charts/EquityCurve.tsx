'use client';

import React, { useMemo, useState } from 'react';
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { EquityPoint } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface EquityCurveProps {
    data: EquityPoint[]; // Daily data
    monthlyData?: EquityPoint[];
    darkMode: boolean;
}

type PeriodOption = '1m' | '3m' | '6m' | '1y' | 'all';
type ViewMode = 'daily' | 'monthly';

const PERIOD_OPTIONS: Array<{ label: string; value: PeriodOption }> = [
    { label: '1개월', value: '1m' },
    { label: '3개월', value: '3m' },
    { label: '6개월', value: '6m' },
    { label: '1년', value: '1y' },
    { label: '전체', value: 'all' },
];

export function EquityCurve({ data, monthlyData, darkMode }: EquityCurveProps) {
    const [period, setPeriod] = useState<PeriodOption>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [showDrawdown, setShowDrawdown] = useState(false);

    // Determines which dataset to use
    const activeData = viewMode === 'daily' ? data : (monthlyData || []);

    // 기간 필터링
    const filteredData = useMemo(() => {
        if (activeData.length === 0) return [];
        if (period === 'all') return activeData;

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case '1m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case '3m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case '6m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                break;
            case '1y':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                return activeData;
        }

        // For monthly data (YYYY-MM), comparison works lexically "2024-01" < "2024-12"
        // But let's be robust
        const startStr = startDate.toISOString().slice(0, 10);
        return activeData.filter(pt => {
            if (activeData === monthlyData) {
                // Monthly date is YYYY-MM
                return pt.date >= startStr.slice(0, 7);
            }
            return pt.date >= startStr;
        });
    }, [activeData, period, monthlyData]);

    // 요약 통계
    const summary = useMemo(() => {
        if (filteredData.length === 0) {
            return { currentPnL: 0, maxDrawdown: 0, maxDrawdownPercent: 0, peak: 0 };
        }

        const last = filteredData[filteredData.length - 1];
        let maxDrawdown = 0;
        let maxDrawdownPercent = 0;
        let peak = 0;

        for (const pt of filteredData) {
            if (pt.cumulativePnL > peak) peak = pt.cumulativePnL;
            if (pt.drawdown < maxDrawdown) {
                maxDrawdown = pt.drawdown;
                maxDrawdownPercent = pt.drawdownPercent;
            }
        }

        return {
            currentPnL: last.cumulativePnL,
            maxDrawdown,
            maxDrawdownPercent,
            peak,
        };
    }, [filteredData]);

    if (data.length === 0) {
        return (
            <div className={`p-8 text-center rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">매매 기록이 없어 에쿼티 커브를 표시할 수 없습니다.</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || payload.length === 0) return null;

        const pt = payload[0].payload as EquityPoint;

        return (
            <div className={`px-3 py-2 rounded-lg shadow-lg border text-xs ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                <div className="font-medium mb-1">{pt.date}</div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">누적 손익:</span>
                    <span className={pt.cumulativePnL >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                        {pt.cumulativePnL >= 0 ? '+' : ''}{formatNumber(pt.cumulativePnL)}
                    </span>
                </div>
                {showDrawdown && pt.drawdown < 0 && (
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500">낙폭:</span>
                        <span className="text-rose-500 font-bold">
                            {formatNumber(pt.drawdown)} ({pt.drawdownPercent.toFixed(1)}%)
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const formatYAxis = (value: number) => {
        if (Math.abs(value) >= 100000000) { // 1억 이상
            return `${(value / 100000000).toFixed(1)}억`;
        }
        if (Math.abs(value) >= 10000) { // 1만 이상
            return `${(value / 10000).toFixed(0)}만`;
        }
        return value.toString();
    };

    const formatDateLabel = (date: string) => {
        // Daily: YYYY-MM-DD -> MM/DD
        // Monthly: YYYY-MM -> YYYY.MM
        if (date.length === 7) {
            return date.replace('-', '.');
        }
        const parts = date.split('-');
        if (parts.length >= 3) {
            return `${parts[1]}/${parts[2]}`;
        }
        return date;
    };

    return (
        <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-gradient-to-r from-slate-800/50 to-slate-900' : 'border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white'}`}>
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-500'} />
                    <h3 className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        누적 수익 곡선
                    </h3>

                    {/* View Mode Toggle */}
                    <div className={`flex rounded-lg p-0.5 ml-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-200/50'}`}>
                        <button
                            onClick={() => setViewMode('daily')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'daily'
                                ? (darkMode ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm')
                                : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                }`}
                        >
                            일별
                        </button>
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'monthly'
                                ? (darkMode ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm')
                                : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                }`}
                        >
                            월별
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* 드로다운 토글 */}
                    <button
                        onClick={() => setShowDrawdown(!showDrawdown)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${showDrawdown
                            ? (darkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-600')
                            : (darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700')
                            }`}
                    >
                        낙폭
                    </button>
                    {/* 기간 선택 */}
                    <div className={`flex rounded-lg p-0.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setPeriod(opt.value)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${period === opt.value
                                    ? (darkMode ? 'bg-slate-700 text-white' : 'bg-white text-indigo-600 shadow-sm')
                                    : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 p-4 pb-2">
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        현재 누적 손익
                    </div>
                    <div className={`text-lg font-black ${summary.currentPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {summary.currentPnL >= 0 ? '+' : ''}{formatNumber(summary.currentPnL)}
                    </div>
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        최고점
                    </div>
                    <div className={`text-lg font-black ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {formatNumber(summary.peak)}
                    </div>
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        최대 낙폭
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-rose-500">
                            {formatNumber(summary.maxDrawdown)}
                        </span>
                        <span className="text-xs text-rose-400">
                            ({summary.maxDrawdownPercent.toFixed(1)}%)
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-4 pt-0">
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={darkMode ? '#334155' : '#e2e8f0'}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDateLabel}
                            tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <YAxis
                            tickFormatter={formatYAxis}
                            tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke={darkMode ? '#475569' : '#cbd5e1'} strokeDasharray="3 3" />

                        {/* 에쿼티 커브 */}
                        <Area
                            type="monotone"
                            dataKey="cumulativePnL"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#equityGradient)"
                            animationDuration={300}
                        />

                        {/* 드로다운 영역 */}
                        {showDrawdown && (
                            <Area
                                type="monotone"
                                dataKey="drawdown"
                                stroke="#ef4444"
                                strokeWidth={1}
                                fill="url(#drawdownGradient)"
                                strokeDasharray="3 3"
                                animationDuration={300}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
