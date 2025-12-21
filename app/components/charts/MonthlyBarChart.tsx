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
    return (
        <div className="w-full h-[300px]">
            <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {title || '월별 순손익 (Monthly Net Profit)'}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis
                        dataKey="label"
                        stroke={darkMode ? '#94a3b8' : '#64748b'}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={darkMode ? '#94a3b8' : '#64748b'}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val / 1000}k`}
                    />
                    <Tooltip
                        cursor={{ fill: darkMode ? '#ffffff10' : '#00000005' }}
                        contentStyle={{
                            backgroundColor: darkMode ? '#1e293b' : '#fff',
                            borderColor: darkMode ? '#334155' : '#e2e8f0',
                            borderRadius: '12px',
                            color: darkMode ? '#fff' : '#000',
                            padding: '12px 16px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            padding: 0
                        }}
                        labelStyle={{
                            fontSize: '12px',
                            color: darkMode ? '#94a3b8' : '#64748b',
                            marginBottom: '4px'
                        }}
                        formatter={(val: number | undefined) => [
                            (val ?? 0).toLocaleString() + ' 원',
                            '손익'
                        ]}
                        labelFormatter={(label) => `${label}`}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
