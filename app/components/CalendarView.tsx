'use client';

import React, { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  dailyData: { key: string; value: number }[]; // key is YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  selectedDateStr?: string;
  darkMode: boolean;
}

export function CalendarView({
  currentDate,
  onDateChange,
  dailyData,
  onSelectDate,
  selectedDateStr,
  darkMode
}: CalendarViewProps) {

  // 1. Data Map
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    dailyData.forEach(d => map.set(d.key, d.value));
    return map;
  }, [dailyData]);

  // 2. Calendar Grid Generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart); // Default starts on Sunday? ko locale usually starts Sunday too.
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // 3. Helpers
  const nextMonth = () => onDateChange(addMonths(currentDate, 1));
  const prevMonth = () => onDateChange(subMonths(currentDate, 1));

  const getHeatmapColor = (pnl: number) => {
    if (pnl === 0) return darkMode ? 'bg-slate-800' : 'bg-slate-100';

    // Simple thresholds 
    // TODO: Dynamic scaling based on max PnL? 
    // For now, hardcoded tiers for simplicity
    const abs = Math.abs(pnl);

    if (pnl > 0) {
      if (abs > 1000000) return 'bg-emerald-600 text-white'; // > 100k (Example: 1M won)
      if (abs > 300000) return 'bg-emerald-500 text-white';
      if (abs > 100000) return 'bg-emerald-400 text-white';
      return 'bg-emerald-200 text-emerald-900';
    } else {
      if (abs > 1000000) return 'bg-rose-600 text-white';
      if (abs > 300000) return 'bg-rose-500 text-white';
      if (abs > 100000) return 'bg-rose-400 text-white';
      return 'bg-rose-200 text-rose-900';
    }
  };

  const formatMoney = (val: number) => {
    return Math.abs(val).toLocaleString();
  }

  return (
    <div className={cn("p-4 rounded-xl border shadow-sm transition-all",
      darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={'text-lg font-bold ' + (darkMode ? 'text-white' : 'text-slate-900')}>
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
        </h2>
        <div className="flex gap-1">
          <button onClick={prevMonth} className={'p-1.5 rounded-lg transition-colors ' + (darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200')}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className={'p-1.5 rounded-lg transition-colors ' + (darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200')}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium opacity-60">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className={cn(day === '일' && 'text-rose-500', day === '토' && 'text-blue-500')}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const pnl = dataMap.get(dateKey) ?? 0;
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDateStr === dateKey;
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={cn(
                "relative h-20 md:h-24 rounded-lg flex flex-col p-1 md:p-2 cursor-pointer transition-transform hover:scale-[1.02] border",
                // Background color
                getHeatmapColor(pnl),
                // Opacity for non-current month
                !isCurrentMonth && "opacity-30 grayscale",
                // Borders
                isSelected
                  ? "ring-2 ring-blue-500 z-10"
                  : (darkMode ? "border-slate-800" : "border-slate-100"),
                // Today indicator (dot or subtle border)
                isToday && !isSelected && "ring-1 ring-slate-400"
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  "text-xs font-semibold",
                  // If background is dark (emerald-500+), text is white. 
                  // If background is light (emerald-200), text is emerald-900.
                  // Default (bg-slate-100) is text-slate-500.
                  pnl === 0 ? "text-slate-400" : ""
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center">
                {pnl !== 0 && (
                  <div className="text-center">
                    <div className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200">
                      {pnl > 0 ? '+' : '-'}{formatMoney(pnl)} <span className="text-[10px] font-normal text-slate-500">원</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
