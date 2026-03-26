import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface DatePickerProps {
    selectedDate: Date | string;
    onChange: (dateObj: Date, dateStr: string) => void;
    darkMode: boolean;
    className?: string;
}

export function DatePicker({ selectedDate, onChange, darkMode, className = '' }: DatePickerProps) {
    const t = useTranslations('calendar');
    const locale = useLocale();
    const WEEKDAYS: string[] = t.raw('weekdays');
    const [isOpen, setIsOpen] = useState(false);
    const selectedDateObj = useMemo(() => {
        if (selectedDate instanceof Date) return selectedDate;
        // "YYYY-MM-DD" 문자열을 로컬 시간으로 파싱 (UTC 파싱 방지)
        const [y, m, d] = selectedDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }, [selectedDate]);
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

    // Reset offset when selectedDate changes (React recommended pattern for derived state)
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
    if (prevSelectedDate !== selectedDate) {
        setPrevSelectedDate(selectedDate);
        setCurrentMonthOffset(0);
    }

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

    const startDayOfWeek = getDay(monthStart); // 0 (Sun) - 6 (Sat)
    const paddingDays = Array.from({ length: startDayOfWeek }).fill(null);

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

    const formattedDate = format(selectedDateObj, 'yyyy-MM-dd');
    const today = useMemo(() => new Date(), []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                setCurrentMonthOffset(prev => prev - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                setCurrentMonthOffset(prev => prev + 1);
                break;
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Input Trigger */}
            <div
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={`${formattedDate} - ${isOpen ? t('closeCalendar') : t('openCalendar')}`}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
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
                <div
                    role="dialog"
                    aria-label={t('calendarDialog')}
                    className={`
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
                            aria-label={t('prevMonth')}
                            onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                            className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {locale === 'ko' ? format(currentMonth, 'yyyy년 M월') : format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <button
                            type="button"
                            aria-label={t('nextMonth')}
                            onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                            className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2">
                        {WEEKDAYS.map((day, idx) => (
                            <div key={day} className={`text-center text-xs font-bold ${idx === 0 ? 'text-rose-500' : (idx === 6 ? 'text-blue-500' : (darkMode ? 'text-slate-500' : 'text-slate-400'))}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
                        {days.map(day => {
                            const isSelected = isSameDay(day, selectedDateObj);
                            const isToday = isSameDay(day, today);
                            const dayNum = getDay(day);

                            // Color priority: selected > today > sunday/saturday > default
                            let textColorClass: string;
                            if (isSelected) {
                                textColorClass = 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 font-bold';
                            } else if (isToday) {
                                textColorClass = darkMode
                                    ? 'text-indigo-400 font-bold hover:bg-slate-800'
                                    : 'text-indigo-600 font-bold hover:bg-slate-100';
                            } else if (dayNum === 0) {
                                textColorClass = darkMode
                                    ? 'text-rose-500 hover:bg-slate-800'
                                    : 'text-rose-500 hover:bg-slate-100';
                            } else if (dayNum === 6) {
                                textColorClass = darkMode
                                    ? 'text-blue-500 hover:bg-slate-800'
                                    : 'text-blue-500 hover:bg-slate-100';
                            } else {
                                textColorClass = darkMode
                                    ? 'text-slate-300 hover:bg-slate-800'
                                    : 'text-slate-700 hover:bg-slate-100';
                            }

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    aria-label={format(day, 'yyyy-MM-dd')}
                                    aria-pressed={isSelected}
                                    onClick={(e) => { e.stopPropagation(); handleDateClick(day); }}
                                    className={`
                                        h-9 w-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative
                                        ${textColorClass}
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
