'use client';

import React, { useMemo, useEffect } from 'react';
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
import { ko, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useEventTracking } from '@/app/hooks/useEventTracking';
import { twMerge } from 'tailwind-merge';
import { useTranslations, useLocale } from 'next-intl';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DailyCalendarData {
  key: string;        // YYYY-MM-DD
  krwValue: number;   // KRW P&L
  usdValue: number;   // USD P&L
}

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  dailyData: DailyCalendarData[];
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
  const { user } = useSupabaseAuth();
  const { track } = useEventTracking(user);
  const t = useTranslations('calendar');
  const locale = useLocale();
  const dateFnsLocale = locale === 'ko' ? ko : enUS;
  const weekdays: string[] = t.raw('weekdays');

  useEffect(() => {
    track('calendar_viewed');
  }, [track]);

  // 1. Data Map: stores { krw, usd } per day
  const dataMap = useMemo(() => {
    const map = new Map<string, { krw: number; usd: number }>();
    dailyData.forEach(d => map.set(d.key, { krw: d.krwValue, usd: d.usdValue }));
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

  // Heatmap color using Korean stock convention: red=profit, blue=loss
  const getHeatmapColor = (totalPnl: number) => {
    if (totalPnl === 0) return darkMode ? 'bg-slate-800/40' : 'bg-slate-50/50';

    const abs = Math.abs(totalPnl);

    if (totalPnl > 0) {
      // Profit: Red (Korean convention)
      if (abs > 1000000) return 'bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]';
      if (abs > 300000) return 'bg-red-500/80 text-white';
      return 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30';
    } else {
      // Loss: Blue (Korean convention)
      if (abs > 1000000) return 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]';
      if (abs > 300000) return 'bg-blue-500/80 text-white';
      return 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/30';
    }
  };

  // Format currency values
  const formatKRW = (val: number) => {
    return Math.round(val).toLocaleString();
  };

  // Abbreviated KRW for mobile (e.g., 1,234,567 -> 123만)
  const formatKRWShort = (val: number) => {
    const abs = Math.abs(val);
    if (locale === 'ko') {
      if (abs >= 1_0000_0000) return `${(val / 1_0000_0000).toFixed(1)}억`;
      if (abs >= 1_0000) return `${Math.round(val / 1_0000)}만`;
    } else {
      if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
    }
    return Math.round(val).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');
  };

  const formatUSD = (val: number) => {
    return `$${Math.abs(val).toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  }

  // Abbreviated USD for mobile (e.g., $1,234 -> $1.2K)
  const formatUSDShort = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1000) return `$${(Math.abs(val) / 1000).toFixed(1)}K`;
    return `$${Math.round(Math.abs(val))}`;
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
            {locale === 'ko' ? format(currentDate, 'yyyy년 M월', { locale: dateFnsLocale }) : format(currentDate, 'MMMM yyyy', { locale: dateFnsLocale })}
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
        {weekdays.map((day, idx) => (
          <div key={day} className={cn(
              "py-2",
              idx === 0 ? 'text-rose-500' : (idx === 6 ? 'text-blue-500' : (darkMode ? 'text-slate-500' : 'text-slate-400'))
          )}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-3 flex-1">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayData = dataMap.get(dateKey);
          const krw = dayData?.krw ?? 0;
          const usd = dayData?.usd ?? 0;
          const totalPnl = krw + usd; // Combined for heatmap color
          const hasData = krw !== 0 || usd !== 0;
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDateStr === dateKey;
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectDate(dateKey)}
              role="button"
              tabIndex={isCurrentMonth ? 0 : -1}
              aria-label={`${locale === 'ko' ? format(day, 'yyyy년 M월 d일', { locale: dateFnsLocale }) : format(day, 'MMMM d, yyyy', { locale: dateFnsLocale })}${hasData ? `, KRW: ${krw > 0 ? '+' : ''}${formatKRW(krw)}, USD: ${usd > 0 ? '+' : '-'}${formatUSD(usd)}` : ''}`}
              className={cn(
                "group relative min-h-[60px] md:min-h-[100px] rounded-xl md:rounded-2xl flex flex-col p-1.5 md:p-3 cursor-pointer transition-all duration-300 border backdrop-blur-sm touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-400",
                // Base styles
                !isSelected && (darkMode ? "border-slate-800/50 hover:border-slate-700" : "border-slate-100 hover:border-indigo-200 hover:shadow-md"),
                // Background color based on combined P&L
                getHeatmapColor(totalPnl),
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
                  hasData && Math.abs(totalPnl) > 300000 ? "text-white/90" : (darkMode ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-indigo-600"),
                  isToday && "text-indigo-500"
                )}>
                  {format(day, 'd')}
                </span>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
              </div>

              <div className="flex-1 flex items-center justify-center">
                {hasData && (
                  <div className="text-center w-full space-y-0.5">
                    {/* KRW line - Desktop full, Mobile abbreviated */}
                    {krw !== 0 && (
                      <>
                        {/* Desktop */}
                        <div className={cn(
                          "hidden md:block text-xs font-black tracking-tight truncate",
                          Math.abs(totalPnl) > 300000 ? "text-white" : (darkMode ? "text-slate-200" : "text-slate-800")
                        )}>
                          {krw > 0 ? '+' : ''}{formatKRW(krw)}
                        </div>
                        {/* Mobile */}
                        <div className={cn(
                          "md:hidden text-[10px] font-black tracking-tight",
                          Math.abs(totalPnl) > 300000 ? "text-white" : (darkMode ? "text-slate-200" : "text-slate-800")
                        )}>
                          {krw > 0 ? '+' : ''}{formatKRWShort(krw)}
                        </div>
                      </>
                    )}
                    {/* USD line - Desktop full, Mobile abbreviated */}
                    {usd !== 0 && (
                      <>
                        {/* Desktop */}
                        <div className={cn(
                          "hidden md:block text-xs font-black tracking-tight truncate",
                          Math.abs(totalPnl) > 300000 ? "text-white/80" : (darkMode ? "text-slate-300" : "text-slate-600")
                        )}>
                          {usd > 0 ? '+' : '-'}{formatUSD(usd)}
                        </div>
                        {/* Mobile */}
                        <div className={cn(
                          "md:hidden text-[10px] font-black tracking-tight",
                          Math.abs(totalPnl) > 300000 ? "text-white/80" : (darkMode ? "text-slate-300" : "text-slate-600")
                        )}>
                          {usd > 0 ? '+' : '-'}{formatUSDShort(usd)}
                        </div>
                      </>
                    )}
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
