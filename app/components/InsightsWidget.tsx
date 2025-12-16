'use client';

import React from 'react';
import { InsightData } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { TrendingUp, TrendingDown, Calendar, Tag, Target } from 'lucide-react';

interface InsightsWidgetProps {
    insights: InsightData;
    darkMode: boolean;
}

export function InsightsWidget({ insights, darkMode }: InsightsWidgetProps) {
    const cardClass = `p-4 rounded-2xl flex flex-col justify-between shadow-sm border transition-all ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-slate-200/50'
    }`;
    
    const labelClass = `text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;
    const valueClass = `text-xl font-bold mt-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8 text-sm">
            {/* Best Day */}
            <div className={cardClass}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <Calendar size={16} />
                    </div>
                    <span className={labelClass}>최고의 요일</span>
                </div>
                <div className={valueClass}>{insights.bestDay || '-'}</div>
            </div>

            {/* Best Tag */}
            <div className={cardClass}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <Tag size={16} />
                    </div>
                    <span className={labelClass}>최고의 전략</span>
                </div>
                <div className={valueClass}>
                    {insights.bestTag ? `#${insights.bestTag}` : '-'}
                </div>
            </div>

            {/* Win Rate (Long) */}
            <div className={cardClass}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Target size={16} />
                    </div>
                    <span className={labelClass}>매수 승률</span>
                </div>
                <div className={valueClass}>
                    {insights.longWinRate.toFixed(1)}%
                </div>
            </div>

            {/* Max Win */}
            <div className={cardClass}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        <TrendingUp size={16} />
                    </div>
                    <span className={labelClass}>최대 수익</span>
                </div>
                <div className="text-xl font-bold mt-1 text-teal-600 dark:text-teal-400">
                    +{formatNumber(insights.maxWin)}
                </div>
            </div>

            {/* Max Loss */}
            <div className={cardClass}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                         <TrendingDown size={16} />
                    </div>
                    <span className={labelClass}>최대 손실</span>
                </div>
                <div className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                    {insights.maxLoss === 0 ? '-' : formatNumber(insights.maxLoss)}
                </div>
            </div>
        </div>
    );
}
