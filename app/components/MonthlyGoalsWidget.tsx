'use client';

import React, { useState, useMemo } from 'react';
import { MonthlyGoal, MonthlyProgress, PnLPoint } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { Target, TrendingUp, BarChart3, Percent, Calendar, Plus, X, Edit2, Save, Trash2 } from 'lucide-react';

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

    const cardClass = 'rounded-2xl border ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm');
    const labelClass = 'text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-500' : 'text-slate-400');
    const inputClass = 'w-full px-3 py-2 text-sm font-medium rounded-lg outline-none transition-all ' +
        (darkMode
            ? 'bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-700 focus:ring-1 focus:ring-slate-600'
            : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-100');

    return (
        <div className={cardClass + ' p-6'}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className={'text-lg font-bold flex items-center gap-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        <Target size={20} className={darkMode ? 'text-violet-400' : 'text-violet-600'} />
                        월별 목표
                    </h3>
                    <p className={'text-xs mt-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                        월별 수익 목표를 설정하고 달성률을 추적합니다
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
                    className={'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ' +
                        (darkMode ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-600 hover:bg-violet-100')}
                >
                    {showForm ? <X size={14} /> : <Plus size={14} />}
                    {showForm ? '취소' : '목표 설정'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className={'mb-6 p-4 rounded-xl space-y-4 ' + (darkMode ? 'bg-slate-800/50' : 'bg-slate-50')}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>연도</label>
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
                            <label className={labelClass}>월</label>
                            <select
                                value={formData.month}
                                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                                className={inputClass}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}월</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>목표 수익 (원)</label>
                        <input
                            type="number"
                            value={formData.target_pnl}
                            onChange={(e) => setFormData({ ...formData, target_pnl: Number(e.target.value) })}
                            className={inputClass}
                            placeholder="1000000"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>목표 거래 횟수</label>
                            <input
                                type="number"
                                value={formData.target_trades}
                                onChange={(e) => setFormData({ ...formData, target_trades: Number(e.target.value) })}
                                className={inputClass}
                                placeholder="20"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>목표 승률 (%)</label>
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
                        <label className={labelClass}>메모 (선택사항)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className={inputClass + ' min-h-[60px] resize-none'}
                            placeholder="이번 달 목표에 대한 메모..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className={'w-full py-2 rounded-lg font-bold text-sm text-white transition-all ' +
                            (saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500')}
                    >
                        {saving ? '저장 중...' : (editingMonth ? '목표 수정' : '목표 저장')}
                    </button>
                </form>
            )}

            {/* Monthly Progress Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {monthlyProgress.map((progress) => {
                    const hasGoal = !!progress.goal;
                    const isCurrentMonth = progress.month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                    const pnlAchieved = progress.pnlProgress >= 100;

                    return (
                        <div
                            key={progress.month}
                            className={
                                'rounded-xl p-4 transition-all cursor-pointer group relative ' +
                                (isCurrentMonth
                                    ? (darkMode ? 'bg-violet-500/20 ring-2 ring-violet-500/50' : 'bg-violet-50 ring-2 ring-violet-300')
                                    : (darkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'))
                            }
                            onClick={() => openEditForm(progress)}
                        >
                            {/* Edit button on hover */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={12} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                            </div>

                            {/* Month */}
                            <div className={'text-xs font-bold mb-2 ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>
                                {progress.month.replace('-', '년 ')}월
                            </div>

                            {hasGoal ? (
                                <>
                                    {/* Target PnL */}
                                    <div className={'text-lg font-black mb-1 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                                        {formatNumber(progress.goal!.target_pnl)}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 mb-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${pnlAchieved ? 'bg-emerald-500' : 'bg-violet-500'}`}
                                            style={{ width: `${Math.min(100, Math.max(0, progress.pnlProgress))}%` }}
                                        />
                                    </div>

                                    {/* Actual PnL */}
                                    <div className="flex justify-between items-center">
                                        <span className={labelClass}>실적</span>
                                        <span className={
                                            'text-xs font-bold tabular-nums ' +
                                            (progress.actualPnL >= 0 ? 'text-emerald-500' : 'text-rose-500')
                                        }>
                                            {formatNumber(progress.actualPnL)}
                                        </span>
                                    </div>

                                    {/* Progress Percent */}
                                    <div className="flex justify-between items-center mt-1">
                                        <span className={labelClass}>달성률</span>
                                        <span className={`text-xs font-bold ${pnlAchieved ? 'text-emerald-500' : (darkMode ? 'text-slate-300' : 'text-slate-600')}`}>
                                            {progress.pnlProgress.toFixed(0)}%
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Plus size={20} className={darkMode ? 'text-slate-600' : 'text-slate-300'} />
                                    <span className={'text-xs mt-1 ' + (darkMode ? 'text-slate-600' : 'text-slate-400')}>
                                        목표 없음
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Current Month Summary */}
            {monthlyProgress.length > 0 && monthlyProgress[0].goal && (
                <div className={'mt-6 pt-6 border-t ' + (darkMode ? 'border-slate-800' : 'border-slate-100')}>
                    <div className="text-center">
                        <div className={labelClass}>이번 달 목표 달성률</div>
                        <div className={
                            'text-3xl font-black mt-1 ' +
                            (monthlyProgress[0].pnlProgress >= 100 ? 'text-emerald-500' : (darkMode ? 'text-slate-100' : 'text-slate-900'))
                        }>
                            {monthlyProgress[0].pnlProgress.toFixed(0)}%
                        </div>
                        <div className={'text-sm mt-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                            목표: {formatNumber(monthlyProgress[0].goal.target_pnl)} / 현재: {formatNumber(monthlyProgress[0].actualPnL)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
