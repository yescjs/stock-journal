'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PnLPoint } from '@/app/types/stats';

// Chart color constants matching CSS variables
const CHART_COLORS = {
    up: '#F04452',      // --color-up
    down: '#3182F6',    // --color-down
} as const;

interface MonthlyBarChartProps {
    data: PnLPoint[];
    darkMode: boolean;
    title?: string;
}

// Custom Tooltip Component for Glassmorphism
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
    darkMode: boolean;
}

const CustomTooltip = ({ active, payload, label, darkMode }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-4 rounded-xl border backdrop-blur-md shadow-xl ${
                darkMode 
                ? 'bg-popover/80 border-slate-700 text-popover-foreground' 
                : 'bg-popover/80 border-white/50 text-popover-foreground'
            }`}>
                <p className={`text-xs font-bold mb-1 ${darkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{label}</p>
                <p className={`text-sm font-black ${payload[0].value >= 0 ? 'text-[color:var(--color-up)]' : 'text-[color:var(--color-down)]'}`}>
                    {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toLocaleString()} 원
                </p>
            </div>
        );
    }
    return null;
};

export function MonthlyBarChart({ data, darkMode, title }: MonthlyBarChartProps) {

    return (
        <div className="w-full h-[300px]">
            {title && (
                <h3 className={`text-sm font-bold mb-4 text-foreground`}>
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} opacity={0.5} />
                    <XAxis
                        dataKey="label"
                        stroke={darkMode ? '#94a3b8' : '#64748b'}
                        tick={{ fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke={darkMode ? '#94a3b8' : '#64748b'}
                        tick={{ fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${(val / 10000).toFixed(0)}만`}
                    />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip content={(props: any) => <CustomTooltip {...props} darkMode={darkMode} />} cursor={{ fill: darkMode ? '#ffffff05' : '#00000005', radius: 4 }} />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.value >= 0 ? CHART_COLORS.up : CHART_COLORS.down}
                                fillOpacity={0.9}
                                stroke={entry.value >= 0 ? CHART_COLORS.up : CHART_COLORS.down}
                                strokeWidth={0}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
