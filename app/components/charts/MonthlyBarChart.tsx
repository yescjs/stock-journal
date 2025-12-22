'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PnLPoint } from '@/app/types/stats';

interface MonthlyBarChartProps {
    data: PnLPoint[];
    darkMode: boolean;
    title?: string;
}

export function MonthlyBarChart({ data, darkMode, title }: MonthlyBarChartProps) {
    // Custom Tooltip Component for Glassmorphism
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className={`p-4 rounded-xl border backdrop-blur-md shadow-xl ${
                    darkMode 
                    ? 'bg-slate-900/80 border-slate-700 text-white' 
                    : 'bg-white/80 border-white/50 text-slate-900'
                }`}>
                    <p className={`text-xs font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                    <p className={`text-sm font-black ${payload[0].value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toLocaleString()} 원
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[300px]">
            {title && (
                <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
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
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: darkMode ? '#ffffff05' : '#00000005', radius: 4 }} />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} 
                                fillOpacity={0.8}
                                stroke={entry.value >= 0 ? '#059669' : '#e11d48'}
                                strokeWidth={2}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
