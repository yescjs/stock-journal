'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PnLChartProps {
  data: { date: string; cumulativePnL: number }[];
  darkMode: boolean;
}

export function PnLChart({ data, darkMode }: PnLChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
          <XAxis 
            dataKey="date" 
            stroke={darkMode ? '#94a3b8' : '#64748b'} 
            fontSize={12} 
            tickFormatter={(str) => str.slice(5)} // Show MM-DD
          />
          <YAxis 
            stroke={darkMode ? '#94a3b8' : '#64748b'} 
            fontSize={11}
            tickFormatter={(val) => `${(val / 10000).toFixed(0)}만`} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: darkMode ? '#1e293b' : '#fff', 
              borderColor: darkMode ? '#334155' : '#e2e8f0',
              color: darkMode ? '#f1f5f9' : '#0f172a'
            }}
            formatter={(val: number | undefined) => (val ?? 0).toLocaleString() + ' 원'}
          />
          <Area 
            type="monotone" 
            dataKey="cumulativePnL" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorPnL)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
