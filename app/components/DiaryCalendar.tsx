'use client';

import React, { useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Smile, Meh, Frown } from 'lucide-react';
import { MarketDiary } from '@/app/types/diary';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DiaryCalendarProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    diaries: MarketDiary[];
    onSelectDate: (dateStr: string) => void;
    selectedDateStr?: string;
    darkMode: boolean;
}

export function DiaryCalendar({
    currentDate,
    onDateChange,
    diaries,
    onSelectDate,
    selectedDateStr,
    darkMode
}: DiaryCalendarProps) {

    // 1. Data Map
    const diaryMap = useMemo(() => {
        const map = new Map<string, MarketDiary>();
        diaries.forEach(d => map.set(d.date, d));
        return map;
    }, [diaries]);

    // 2. Calendar Grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // 3. Helpers
    const nextMonth = () => onDateChange(addMonths(currentDate, 1));
    const prevMonth = () => onDateChange(subMonths(currentDate, 1));

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case 'bullish': return '🔥'; // Fire
            case 'bearish': return '💧'; // Water/Rain
            case 'neutral': return '☁️'; // Cloud
            case 'volatile': return '⚡'; // Lightning
            default: return null;
        }
    };

    const getConditionColor = (condition: number) => {
        if (condition >= 4) return 'bg-emerald-400';
        if (condition <= 2) return 'bg-rose-400';
        return 'bg-amber-400';
    };

    return (
        <div className="h-full flex flex-col">
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
                    const diary = diaryMap.get(dateKey);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDateStr === dateKey;
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={dateKey}
                            onClick={() => onSelectDate(dateKey)}
                            className={cn(
                                "group relative min-h-[100px] rounded-2xl flex flex-col p-3 cursor-pointer transition-all duration-300 border backdrop-blur-sm",
                                // Base Style
                                !isSelected && (darkMode
                                    ? "bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/60 hover:border-slate-700"
                                    : "bg-white/60 border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-md"
                                ),
                                // Non-Current Month
                                !isCurrentMonth && "opacity-30 grayscale",
                                // Selected State
                                isSelected && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent z-10 transform scale-105 shadow-xl bg-indigo-50 dark:bg-slate-800",
                                // Today Style
                                isToday && !isSelected && (darkMode ? "ring-1 ring-slate-500" : "ring-1 ring-slate-300 shadow-inner")
                            )}
                        >
                            {/* Date Number */}
                            <div className="flex justify-between items-start mb-2">
                                <span className={cn(
                                    "text-xs font-bold transition-colors",
                                    darkMode ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-indigo-600",
                                    isToday && "text-indigo-500"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {/* Condition Dot */}
                                {diary && (
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        getConditionColor(diary.my_condition)
                                    )} title={`컨디션: ${diary.my_condition}/5`} />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col items-center justify-center gap-1">
                                {diary ? (
                                    <>
                                        <div className="text-2xl animate-in zoom-in duration-300">
                                            {getSentimentIcon(diary.market_sentiment)}
                                        </div>
                                        {diary.market_issue && (
                                            <div className={`text-[10px] w-full text-center truncate px-1 rounded ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                {diary.market_issue}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                                        + 작성
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
