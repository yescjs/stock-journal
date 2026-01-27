import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
    selectedDate: Date | string;
    onChange: (dateObj: Date, dateStr: string) => void;
    darkMode: boolean;
    className?: string;
}

export function DatePicker({ selectedDate, onChange, darkMode, className = '' }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);
    // Derive currentMonth from selectedDate for sync
    const derivedMonth = useMemo(() => {
        return new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
    }, [selectedDateObj]);
    const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
    const currentMonth = useMemo(() => {
        const result = new Date(derivedMonth);
        result.setMonth(result.getMonth() + currentMonthOffset);
        return result;
    }, [derivedMonth, currentMonthOffset]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset offset when selectedDate changes to a different month
    useEffect(() => {
        const newDate = new Date(selectedDate);
        if (!isSameMonth(newDate, currentMonth)) {
            setTimeout(() => setCurrentMonthOffset(0), 0);
        }
    }, [selectedDate, currentMonth]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = monthStart;
    const endDate = monthEnd;

    // Generate days for grid
    // Need to pad start to align with weekday
    const startDayOfWeek = getDay(monthStart); // 0 (Sun) - 6 (Sat)
    const paddingDays = Array.from({ length: startDayOfWeek }).fill(null);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const handleDateClick = (date: Date) => {
        // Adjust for timezone offset issue? Native date inputs use YYYY-MM-DD
        // We'll return local YYYY-MM-DD string
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        onChange(date, dateStr);
        setIsOpen(false);
    };

    const nextMonth = () => setCurrentMonthOffset(prev => prev + 1);
    const prevMonth = () => setCurrentMonthOffset(prev => prev - 1);

    const displayDate = typeof selectedDate === 'string' ? new Date(selectedDate) : selectedDate;
    const formattedDate = format(displayDate, 'yyyy-MM-dd');

    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Input Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border transition-all select-none
                    ${darkMode
                        ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 text-white'
                        : 'bg-white/50 border-indigo-50/50 hover:bg-white text-slate-900 shadow-sm'}
                `}
            >
                <div className="flex items-center gap-3">
                    <Calendar size={18} className={darkMode ? 'text-indigo-400' : 'text-indigo-500'} />
                    <span className="font-mono font-bold tracking-tight">{formattedDate}</span>
                </div>
            </div>

            {/* Dropdown Calendar */}
            {isOpen && (
                <div className={`
                    absolute top-full mt-2 z-50 p-4 rounded-2xl border shadow-xl animate-in fade-in zoom-in-95 w-[320px]
                    left-0 right-auto sm:left-0
                    max-w-[calc(100vw-2rem)]
                    ${darkMode
                        ? 'bg-slate-900 border-slate-700'
                        : 'bg-white border-slate-200'}
                `}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                            className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {format(currentMonth, 'yyyy년 M월')}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                            className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2">
                        {WEEKDAYS.map(day => (
                            <div key={day} className={`text-center text-xs font-bold ${day === '일' ? 'text-rose-500' : (day === '토' ? 'text-blue-500' : (darkMode ? 'text-slate-500' : 'text-slate-400'))}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
                        {days.map(day => {
                            const isSelected = isSameDay(day, displayDate);
                            const isToday = isSameDay(day, new Date());
                            const dayNum = getDay(day);
                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDateClick(day); }}
                                    className={`
                                        h-9 w-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative
                                        ${isSelected
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 font-bold'
                                            : (darkMode
                                                ? 'hover:bg-slate-800 text-slate-300'
                                                : 'hover:bg-slate-100 text-slate-700')}
                                        ${!isSelected && isToday && (darkMode ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold')}
                                        ${!isSelected && dayNum === 0 && 'text-rose-500'}
                                        ${!isSelected && dayNum === 6 && 'text-blue-500'}
                                    `}
                                >
                                    {format(day, 'd')}
                                    {isToday && !isSelected && (
                                        <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-current opacity-50" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
