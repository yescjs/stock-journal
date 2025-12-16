'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SymbolSummary } from '@/app/types/stats';

interface WinLossChartProps {
    symbolSummaries: SymbolSummary[];
    darkMode: boolean;
}

export function WinLossChart({ symbolSummaries, darkMode }: WinLossChartProps) {
    // Calculate total Wins vs Losses across all symbols
    // Or should we just count trades?
    // SymbolSummary has winCount, lossCount, evenCount.
    
    const data = symbolSummaries.reduce((acc, curr) => {
        acc[0].value += curr.winCount;
        acc[1].value += curr.lossCount;
        acc[2].value += curr.evenCount;
        return acc;
    }, [
        { name: '수익 (Wins)', value: 0, color: '#22c55e' }, // Green
        { name: '손실 (Losses)', value: 0, color: '#ef4444' }, // Red
        { name: '보합 (Break Even)', value: 0, color: '#94a3b8' }, // Slate
    ]).filter(d => d.value > 0);

    if (data.length === 0) {
       return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No trades to analyze</div>;
    }

    return (
        <div className="w-full h-[300px]">
             <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>승/패 비율 (Win / Loss Ratio)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: darkMode ? '#1e293b' : '#fff',
                            borderColor: darkMode ? '#334155' : '#e2e8f0',
                            borderRadius: '12px',
                            color: darkMode ? '#fff' : '#000'
                        }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
