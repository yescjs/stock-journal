import React, { useState, useMemo } from 'react';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    addMonths, 
    subMonths, 
    isSameMonth, 
    isSameDay, 
    parseISO 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PnLPoint } from '@/app/types/stats';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarHeatmapProps {
    dailyData: PnLPoint[];
    darkMode?: boolean;
}

export function CalendarHeatmap({ dailyData, darkMode = false }: CalendarHeatmapProps) {
    const [currentMonth, setCurrentMonth] = useState(() => new Date());

    const pnlMap = useMemo(() => {
        const map = new Map<string, number>();
        dailyData.forEach(point => {
            map.set(point.key, point.value);
        });
        return map;
    }, [dailyData]);

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        return eachDayOfInterval({
            start: startDate,
            end: endDate
        });
    }, [currentMonth]);

    const monthlyStats = useMemo(() => {
        let totalPnL = 0;
        let winCount = 0;
        let lossCount = 0;
        let tradeCount = 0;

        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        dailyData.forEach(point => {
            const date = parseISO(point.key);
            if (date >= monthStart && date <= monthEnd) {
                totalPnL += point.value;
                if (point.value !== 0) {
                    tradeCount++;
                    if (point.value > 0) winCount++;
                    else if (point.value < 0) lossCount++;
                }
            }
        });

        return { totalPnL, winCount, lossCount, tradeCount };
    }, [dailyData, currentMonth]);

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className={cn(
            "w-full p-6 rounded-3xl border backdrop-blur-md transition-colors duration-300",
            darkMode 
                ? "bg-slate-900/50 border-slate-700/50 text-white" 
                : "bg-white/50 border-slate-200/50 text-slate-900"
        )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold tracking-tight">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                        <button 
                            onClick={prevMonth}
                            className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={nextMonth}
                            className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                            aria-label="Next month"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-xl border",
                    monthlyStats.totalPnL >= 0 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                        : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
                )}>
                    <span className="text-sm font-medium opacity-80">Monthly PnL:</span>
                    <span className="text-lg font-bold">
                        {monthlyStats.totalPnL > 0 ? '+' : ''}{formatCurrency(monthlyStats.totalPnL)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}

                {calendarDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const pnl = pnlMap.get(dateKey);
                    const hasTrade = pnl !== undefined && pnl !== 0;
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    let cellBg = darkMode ? "bg-slate-800/30" : "bg-slate-50/50";
                    let cellBorder = "border-transparent";
                    let textColor = darkMode ? "text-slate-400" : "text-slate-500";
                    let pnlColor = "";

                    if (hasTrade) {
                        if (pnl > 0) {
                            cellBg = darkMode ? "bg-emerald-500/20" : "bg-emerald-50";
                            cellBorder = darkMode ? "border-emerald-500/30" : "border-emerald-200";
                            textColor = darkMode ? "text-emerald-100" : "text-emerald-900";
                            pnlColor = darkMode ? "text-emerald-400" : "text-emerald-600";
                        } else {
                            cellBg = darkMode ? "bg-rose-500/20" : "bg-rose-50";
                            cellBorder = darkMode ? "border-rose-500/30" : "border-rose-200";
                            textColor = darkMode ? "text-rose-100" : "text-rose-900";
                            pnlColor = darkMode ? "text-rose-400" : "text-rose-600";
                        }
                    }

                    return (
                        <div 
                            key={day.toString()}
                            className={cn(
                                "relative aspect-square sm:aspect-[1.2] p-2 rounded-xl border transition-all duration-200 group",
                                "flex flex-col justify-between",
                                cellBg,
                                cellBorder,
                                !isCurrentMonth && "opacity-30 grayscale",
                                isToday && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900",
                                hasTrade && "hover:scale-105 hover:shadow-lg hover:z-10 cursor-default"
                            )}
                        >
                            <span className={cn(
                                "text-xs sm:text-sm font-medium",
                                textColor
                            )}>
                                {format(day, 'd')}
                            </span>

                            {hasTrade && (
                                <div className="flex flex-col items-end justify-end h-full">
                                    <span className={cn(
                                        "text-[10px] sm:text-xs font-bold truncate w-full text-right",
                                        pnlColor
                                    )}>
                                        {pnl > 0 ? '+' : ''}{Math.abs(pnl).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
