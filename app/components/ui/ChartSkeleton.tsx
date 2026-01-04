import React from 'react';

interface ChartSkeletonProps {
    darkMode: boolean;
    compact?: boolean;
}

export function ChartSkeleton({ darkMode, compact = false }: ChartSkeletonProps) {
    const baseClass = `animate-pulse rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`;

    const shimmerClass = darkMode ? 'bg-slate-800' : 'bg-slate-100';

    return (
        <div className={baseClass}>
            {/* Header Skeleton */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${shimmerClass}`} />
                    <div className={`w-20 h-4 rounded-md ${shimmerClass}`} />
                </div>
                <div className={`flex gap-1`}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`w-10 h-6 rounded-md ${shimmerClass}`} />
                    ))}
                </div>
            </div>

            {/* Toolbar Skeleton */}
            <div className={`flex items-center gap-2 px-4 py-2 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className={`w-12 h-4 rounded-md ${shimmerClass}`} />
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`w-12 h-5 rounded-md ${shimmerClass}`} />
                ))}
            </div>

            {/* Main Chart Area */}
            <div className={`p-4`}>
                <div className={`w-full ${compact ? 'h-[220px]' : 'h-[300px]'} rounded-xl ${shimmerClass} relative overflow-hidden`}>
                    {/* Simulated Bars/Candles */}
                    <div className="absolute inset-0 flex items-end justify-around px-2 pb-2 opacity-50">
                        {[...Array(12)].map((_, i) => {
                            const height = Math.random() * 60 + 20 + '%';
                            return (
                                <div
                                    key={i}
                                    style={{ height }}
                                    className={`w-full mx-1 rounded-sm ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Volume Chart Skeleton */}
            <div className={`px-4 pb-4 border-t pt-2 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${shimmerClass}`} />
                    <div className={`w-10 h-3 rounded-md ${shimmerClass}`} />
                </div>
                <div className={`w-full ${compact ? 'h-[60px]' : 'h-[100px]'} rounded-xl ${shimmerClass}`} />
            </div>
        </div>
    );
}
