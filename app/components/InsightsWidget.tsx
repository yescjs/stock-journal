'use client';

import React from 'react';
import { InsightData } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { TrendingUp, TrendingDown, Calendar, Tag, Target, Flame, Award, AlertTriangle, Brain, Activity, BarChart3 } from 'lucide-react';

interface InsightsWidgetProps {
    insights: InsightData;
    darkMode: boolean;
}

export function InsightsWidget({ insights, darkMode }: InsightsWidgetProps) {
    // Toss Design System - Card Style
    const cardClass = `p-5 rounded-xl bg-card border border-border/50 shadow-toss-sm transition-all duration-200 hover:shadow-toss hover:-translate-y-0.5`;

    // Toss Design System - Helper to render header
    const renderHeader = (icon: React.ReactNode, title: string, colorClass: string) => (
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${colorClass}`}>
                {icon}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
            </span>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
            {/* Best Day */}
            <div className={cardClass}>
                {renderHeader(
                    <Calendar size={18} strokeWidth={2} />,
                    '최고의 요일',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-xl font-bold text-foreground">
                    {insights.bestDay || '-'}
                </div>
            </div>

            {/* Best Tag */}
            <div className={cardClass}>
                {renderHeader(
                    <Tag size={18} strokeWidth={2} />,
                    '최고의 전략',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-lg font-bold text-foreground truncate">
                    {insights.bestTag ? `#${insights.bestTag}` : '-'}
                </div>
            </div>

            {/* Win Rate (Long) */}
            <div className={cardClass}>
                {renderHeader(
                    <Target size={18} strokeWidth={2} />,
                    '매수 승률',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-xl font-bold text-foreground">
                    {insights.longWinRate.toFixed(1)}%
                </div>
            </div>

            {/* Current Streak */}
            <div className={cardClass}>
                {renderHeader(
                    <Flame size={18} strokeWidth={2} />,
                    '현재 연속',
                    insights.currentStreak.type === 'win' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
                <div className="text-xl font-bold text-foreground flex items-center gap-1">
                    {insights.currentStreak.count > 0 ? (
                        <>
                            {insights.currentStreak.count}연{insights.currentStreak.type === 'win' ? '승' : '패'}
                            {insights.currentStreak.type === 'win' && <span>🔥</span>}
                        </>
                    ) : '-'}
                </div>
            </div>

            {/* Max Win Streak */}
            <div className={cardClass}>
                {renderHeader(
                    <Award size={18} strokeWidth={2} />,
                    '최대 연승',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-xl font-bold text-primary">
                    {insights.maxWinStreak > 0 ? `${insights.maxWinStreak}연승` : '-'}
                </div>
            </div>

            {/* Max Win */}
            <div className={cardClass}>
                {renderHeader(
                    <TrendingUp size={18} strokeWidth={2} />,
                    '최대 수익',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-xl font-bold text-primary">
                    +{formatNumber(insights.maxWin)}
                </div>
            </div>

            {/* Max Loss */}
            <div className={cardClass}>
                {renderHeader(
                    <TrendingDown size={18} strokeWidth={2} />,
                    '최대 손실',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-xl font-bold text-destructive">
                    {insights.maxLoss === 0 ? '-' : formatNumber(insights.maxLoss)}
                </div>
            </div>

            {/* Max Drawdown */}
            <div className={cardClass}>
                {renderHeader(
                    <AlertTriangle size={18} strokeWidth={2} />,
                    '최대 드로다운',
                    'bg-primary/10 text-primary'
                )}
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-destructive">
                        {insights.maxDrawdown === 0 ? '-' : formatNumber(insights.maxDrawdown)}
                    </span>
                    {insights.maxDrawdownPercent !== 0 && (
                        <span className="text-xs text-muted-foreground">
                            ({insights.maxDrawdownPercent.toFixed(1)}%)
                        </span>
                    )}
                </div>
            </div>

            {/* Expectancy */}
            <div className={cardClass}>
                {renderHeader(
                    <Brain size={18} strokeWidth={2} />,
                    '기대값',
                    insights.expectancy >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                )}
                <div className={`text-xl font-bold ${insights.expectancy >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {insights.expectancy === 0 && insights.maxWin === 0 ? '-' : `${insights.expectancy >= 0 ? '+' : ''}${formatNumber(insights.expectancy)}`}
                </div>
            </div>

            {/* Average R-Multiple */}
            <div className={cardClass}>
                {renderHeader(
                    <Activity size={18} strokeWidth={2} />,
                    '평균 R-Multiple',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-xl font-bold text-primary">
                    {insights.avgRMultiple === 0 && insights.maxWin === 0 ? '-' : `R${insights.avgRMultiple >= 0 ? '+' : ''}${insights.avgRMultiple.toFixed(2)}`}
                </div>
            </div>

            {/* Best R-Multiple */}
            <div className={cardClass}>
                {renderHeader(
                    <BarChart3 size={18} strokeWidth={2} />,
                    '최고 R-Multiple',
                    'bg-primary/10 text-primary'
                )}
                <div className="text-xl font-bold text-primary">
                    {insights.bestRMultiple === 0 && insights.maxWin === 0 ? '-' : `R${insights.bestRMultiple.toFixed(1)}`}
                </div>
            </div>
        </div>
    );
}
