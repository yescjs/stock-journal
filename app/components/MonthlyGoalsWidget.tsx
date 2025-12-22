'use client';

import React, { useState, useMemo } from 'react';
import { MonthlyGoal, MonthlyProgress, PnLPoint } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { Target, TrendingUp, BarChart3, Calendar, Plus, X, Edit2, TrendingDown, Trophy } from 'lucide-react';

interface MonthlyGoalsWidgetProps {
    goals: MonthlyGoal[];
    monthlyPnLPoints: PnLPoint[];
    onSetGoal: (goal: Omit<MonthlyGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
    onRemoveGoal: (id: string) => Promise<void>;
    darkMode: boolean;
}

export function MonthlyGoalsWidget({
    goals,
    monthlyPnLPoints,
    onSetGoal,
    onRemoveGoal,
    darkMode,
}: MonthlyGoalsWidgetProps) {
    const [editingMonth, setEditingMonth] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        target_pnl: 0,
        target_trades: 0,
        target_win_rate: 50,
        notes: '',
    });
    const [saving, setSaving] = useState(false);

    // Calculate progress for each month
    const monthlyProgress = useMemo<MonthlyProgress[]>(() => {
        const last6Months: MonthlyProgress[] = [];
        const now = new Date();

        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            const goal = goals.find(g => g.year === d.getFullYear() && g.month === d.getMonth() + 1);
            const pnlPoint = monthlyPnLPoints.find(p => p.key === monthKey);

            // TODO: 실제 거래 횟수와 승률은 trades 데이터에서 계산해야 함
            const actualPnL = pnlPoint?.value || 0;
            const actualTrades = 0; // 추후 구현
            const actualWinRate = 0; // 추후 구현

            last6Months.push({
                month: monthKey,
                goal,
                actualPnL,
                actualTrades,
                actualWinRate,
                pnlProgress: goal?.target_pnl ? (actualPnL / goal.target_pnl) * 100 : 0,
                tradesProgress: goal?.target_trades ? (actualTrades / goal.target_trades) * 100 : 0,
                winRateProgress: goal?.target_win_rate ? (actualWinRate / goal.target_win_rate) * 100 : 0,
            });
        }

        return last6Months;
    }, [goals, monthlyPnLPoints]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSetGoal(formData);
            setShowForm(false);
            setEditingMonth(null);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const openEditForm = (progress: MonthlyProgress) => {
        const [year, month] = progress.month.split('-').map(Number);
        setFormData({
            year,
            month,
            target_pnl: progress.goal?.target_pnl || 0,
            target_trades: progress.goal?.target_trades || 0,
            target_win_rate: progress.goal?.target_win_rate || 50,
            notes: progress.goal?.notes || '',
        });
        setEditingMonth(progress.month);
        setShowForm(true);
    };

    // Style Classes reflecting Glassmorphism
    const cardClass = `glass-card p-6 rounded-3xl ${darkMode ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white/60 border-white/60 shadow-sm'}`;
    const dateBadgeClass = `text-xs font-bold px-2.5 py-1 rounded-lg ${darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-indigo-50 text-indigo-600'}`;
    const labelClass = `text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`;
    const inputClass = `w-full px-4 py-2.5 text-sm font-medium rounded-xl outline-none transition-all ${
        darkMode
            ? 'bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            : 'bg-white/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
    }`;

    return (
        <div className={cardClass}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${darkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-600'}`}>
                            <Target size={22} strokeWidth={2.5} />
                        </div>
                        <span className={darkMode ? 'text-slate-100' : 'text-slate-800'}>월별 목표</span>
                    </h3>
                    <p className={`text-sm mt-1.5 ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        수익 목표를 설정하고 달성률을 추적하세요
                    </p>
                </div>

                <button
                    onClick={() => {
                        setFormData({
                            year: new Date().getFullYear(),
                            month: new Date().getMonth() + 1,
                            target_pnl: 0,
                            target_trades: 0,
                            target_win_rate: 50,
                            notes: '',
                        });
                        setEditingMonth(null);
                        setShowForm(!showForm);
                    }}
                    className={`
                        flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all btn-press
                        ${showForm 
                            ? (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                            : (darkMode 
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20' 
                                : 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/30')}
                    `}
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? '닫기' : '새 목표 설정'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className={`mb-8 p-6 rounded-2xl border transition-all animate-scale-in ${darkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/60 border-indigo-100 shadow-inner'}`}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className={labelClass + ' mb-1.5 block'}>연도</label>
                                <input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                                    className={inputClass}
                                    min={2020}
                                    max={2030}
                                />
                            </div>
                            <div>
                                <label className={labelClass + ' mb-1.5 block'}>월</label>
                                <div className="relative">
                                    <select
                                        value={formData.month}
                                        onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                                        className={inputClass + ' appearance-none'}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}월</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <Calendar size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className={labelClass + ' mb-1.5 block'}>목표 수익 (원)</label>
                            <input
                                type="number"
                                value={formData.target_pnl}
                                onChange={(e) => setFormData({ ...formData, target_pnl: Number(e.target.value) })}
                                className={inputClass + ' text-lg font-bold'}
                                placeholder="1000000"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className={labelClass + ' mb-1.5 block'}>목표 거래 횟수</label>
                                <input
                                    type="number"
                                    value={formData.target_trades}
                                    onChange={(e) => setFormData({ ...formData, target_trades: Number(e.target.value) })}
                                    className={inputClass}
                                    placeholder="20"
                                />
                            </div>
                            <div>
                                <label className={labelClass + ' mb-1.5 block'}>목표 승률 (%)</label>
                                <input
                                    type="number"
                                    value={formData.target_win_rate}
                                    onChange={(e) => setFormData({ ...formData, target_win_rate: Number(e.target.value) })}
                                    className={inputClass}
                                    min={0}
                                    max={100}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass + ' mb-1.5 block'}>메모</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className={inputClass + ' min-h-[80px] resize-none'}
                                placeholder="이번 달 목표에 대한 다짐이나 메모를 남겨주세요..."
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className={`
                                    w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all btn-press shadow-lg
                                    ${saving 
                                        ? 'bg-slate-400 cursor-not-allowed' 
                                        : 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/25'}
                                `}
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <TrendingUp className="animate-spin" size={16} /> 저장 중...
                                    </span>
                                ) : (editingMonth ? '목표 수정 완료' : '목표 저장하기')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Monthly Progress Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {monthlyProgress.map((progress) => {
                    const hasGoal = !!progress.goal;
                    const isCurrentMonth = progress.month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                    const pnlAchieved = progress.pnlProgress >= 100;

                    return (
                        <div
                            key={progress.month}
                            className={`
                                relative p-4 rounded-2xl transition-all duration-300 cursor-pointer group border btn-press
                                ${isCurrentMonth
                                    ? (darkMode 
                                        ? 'bg-violet-900/10 border-violet-500/30' 
                                        : 'bg-violet-50 border-violet-200')
                                    : (darkMode 
                                        ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600' 
                                        : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-md')}
                            `}
                            onClick={() => openEditForm(progress)}
                        >
                            {/* Edit Icon on Hover */}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-100 scale-75">
                                <div className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-indigo-500 shadow-sm'}`}>
                                    <Edit2 size={12} />
                                </div>
                            </div>

                            {/* Month Badge */}
                            <div className="mb-3">
                                <span className={dateBadgeClass}>
                                    {progress.month.split('-')[1]}월
                                </span>
                                {isCurrentMonth && <span className="ml-2 text-[10px] font-bold text-violet-500 animate-pulse">THIS MONTH</span>}
                            </div>

                            {hasGoal ? (
                                <>
                                    {/* Target PnL */}
                                    <div className="mb-4">
                                        <div className={labelClass + ' mb-0.5'}>목표</div>
                                        <div className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {formatNumber(progress.goal!.target_pnl)}
                                        </div>
                                    </div>

                                    {/* Progress Radial or Bar */}
                                    <div className="relative pt-1 mb-4">
                                        <div className="flex items-end justify-between mb-1.5">
                                            <span className={`text-2xl font-black tabular-nums ${pnlAchieved ? 'text-emerald-500' : (darkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                                                {progress.pnlProgress.toFixed(0)}<span className="text-sm font-bold align-top ml-0.5">%</span>
                                            </span>
                                            {pnlAchieved && <Trophy size={16} className="text-amber-400 mb-1" fill="currentColor" />}
                                        </div>
                                        
                                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${pnlAchieved ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-violet-500'}`}
                                                style={{ width: `${Math.min(100, Math.max(0, progress.pnlProgress))}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Actual PnL */}
                                    <div className={`pt-3 mt-1 border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className={labelClass}>실적</span>
                                            <span className={`font-bold text-sm ${progress.actualPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {progress.actualPnL > 0 ? '+' : ''}{formatNumber(progress.actualPnL)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-5 opacity-60">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full mb-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        <Plus size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                                    </div>
                                    <span className={`text-xs font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        목표 설정하기
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

             {/* Current Month Summary Footer */}
             {monthlyProgress.length > 0 && monthlyProgress[0].goal && (
                <div className={`mt-6 p-4 rounded-2xl flex items-center justify-between ${darkMode ? 'bg-violet-500/5 border border-violet-500/10' : 'bg-violet-50/50 border border-violet-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${darkMode ? 'bg-violet-500/20' : 'bg-white shadow-sm'}`}>
                            <TrendingUp size={18} className="text-violet-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-xs font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>이번 달 달성률</span>
                            <span className={`font-black text-lg ${monthlyProgress[0].pnlProgress >= 100 ? 'text-emerald-500' : (darkMode ? 'text-white' : 'text-slate-900')}`}>
                                {monthlyProgress[0].pnlProgress.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span className="opacity-60">목표까지</span> <strong className="text-violet-500">{formatNumber(monthlyProgress[0].goal.target_pnl - monthlyProgress[0].actualPnL)}</strong> <span className="opacity-60">원 남음</span>
                    </div>
                </div>
            )}
        </div>
    );
}
