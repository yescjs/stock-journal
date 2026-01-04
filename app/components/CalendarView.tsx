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
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
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
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // 3. Helpers
  const nextMonth = () => onDateChange(addMonths(currentDate, 1));
  const prevMonth = () => onDateChange(subMonths(currentDate, 1));

  const getHeatmapColor = (pnl: number) => {
    if (pnl === 0) return darkMode ? 'bg-slate-800/40' : 'bg-slate-50/50';

    const abs = Math.abs(pnl);

    if (pnl > 0) {
      if (abs > 1000000) return 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]';
      if (abs > 300000) return 'bg-emerald-400 text-white';
      return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    } else {
      if (abs > 1000000) return 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]';
      if (abs > 300000) return 'bg-rose-400 text-white';
      return 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
  };

  const formatMoney = (val: number) => {
    return Math.abs(val).toLocaleString();
  }

  return (
    <div className={cn("transition-all h-full flex flex-col")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-indigo-500 shadow-sm'}`}>
                <CalendarIcon size={20} />
            </div>
            <h2 className={'text-xl font-black tracking-tight ' + (darkMode ? 'text-white' : 'text-slate-900')}>
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </h2>
        </div>
        <div className={`flex items-center p-1 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <button onClick={prevMonth} className={'p-2 rounded-lg transition-all ' + (darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600')}>
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div className={`w-px h-4 mx-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <button onClick={nextMonth} className={'p-2 rounded-lg transition-all ' + (darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600')}>
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 mb-3 text-center text-xs font-bold tracking-wider">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className={cn(
              "py-2",
              day === '일' ? 'text-rose-500' : (day === '토' ? 'text-blue-500' : (darkMode ? 'text-slate-500' : 'text-slate-400'))
          )}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 md:gap-3 flex-1">
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
                "group relative min-h-[80px] md:min-h-[100px] rounded-2xl flex flex-col p-2 md:p-3 cursor-pointer transition-all duration-300 border backdrop-blur-sm",
                // Base styles
                !isSelected && (darkMode ? "border-slate-800/50 hover:border-slate-700" : "border-slate-100 hover:border-indigo-200 hover:shadow-md"),
                // Background color
                getHeatmapColor(pnl),
                // Opacity for non-current month
                !isCurrentMonth && "opacity-20 grayscale scale-95 border-none bg-transparent",
                // Selection state
                isSelected
                  ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent z-10 transform scale-105 shadow-xl"
                  : "",
                // Today indicator
                isToday && !isSelected && (darkMode ? "ring-1 ring-slate-500" : "ring-1 ring-slate-300 shadow-inner")
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-xs font-bold transition-colors",
                  pnl !== 0 && Math.abs(pnl) > 300000 ? "text-white/90" : (darkMode ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-indigo-600"),
                  isToday && "text-indigo-500"
                )}>
                  {format(day, 'd')}
                </span>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
              </div>

              <div className="flex-1 flex items-center justify-center">
                {pnl !== 0 && (
                  <div className="text-center w-full">
                    <div className={cn(
                        "text-xs md:text-[13px] font-black tracking-tight truncate",
                        Math.abs(pnl) > 300000 ? "text-white" : (darkMode ? "text-slate-200" : "text-slate-800")
                    )}>
                      {pnl > 0 ? '+' : ''}{formatMoney(pnl)}
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
