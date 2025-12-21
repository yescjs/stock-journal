'use client';

import React, { useState } from 'react';
import { Strategy, DEFAULT_STRATEGIES, EMOTION_TAG_LABELS, EMOTION_TAG_COLORS } from '@/app/types/strategies';
import { Plus, Edit2, Trash2, X, Check, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface StrategyManagerProps {
    strategies: Strategy[];
    darkMode: boolean;
    onAdd: (strategy: Omit<Strategy, 'id' | 'user_id' | 'created_at'>) => Promise<Strategy>;
    onUpdate: (id: string, updates: Partial<Strategy>) => Promise<void>;
    onRemove: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#64748b', // Slate
];

export function StrategyManager({ strategies, darkMode, onAdd, onUpdate, onRemove }: StrategyManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        entry_rules: '',
        exit_rules: '',
        risk_notes: '',
        color: PRESET_COLORS[0],
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            entry_rules: '',
            exit_rules: '',
            risk_notes: '',
            color: PRESET_COLORS[0],
        });
    };

    const handleAdd = async () => {
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            await onAdd(formData);
            resetForm();
            setIsAdding(false);
        } catch (err) {
            console.error('Failed to add strategy:', err);
            alert('전략 추가에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (strategy: Strategy) => {
        setEditingId(strategy.id);
        setFormData({
            name: strategy.name,
            description: strategy.description || '',
            entry_rules: strategy.entry_rules || '',
            exit_rules: strategy.exit_rules || '',
            risk_notes: strategy.risk_notes || '',
            color: strategy.color || PRESET_COLORS[0],
        });
    };

    const handleUpdate = async () => {
        if (!editingId || !formData.name.trim()) return;

        setLoading(true);
        try {
            await onUpdate(editingId, formData);
            setEditingId(null);
            resetForm();
        } catch (err) {
            console.error('Failed to update strategy:', err);
            alert('전략 수정에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm('이 전략을 삭제하시겠습니까? 연결된 매매 기록에서 전략 정보가 해제됩니다.')) return;

        setLoading(true);
        try {
            await onRemove(id);
        } catch (err) {
            console.error('Failed to remove strategy:', err);
            alert('전략 삭제에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const cardClass = `rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`;
    const inputClass = `w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 ${darkMode
            ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500'
            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500'
        }`;
    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

    const renderForm = (isEdit: boolean = false) => (
        <div className={`${cardClass} p-4 space-y-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>전략명 *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="예: 돌파매매"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className={labelClass}>색상</label>
                    <div className="flex gap-1.5 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => setFormData({ ...formData, color })}
                                className={`w-6 h-6 rounded-full transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <label className={labelClass}>설명</label>
                <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="전략에 대한 간단한 설명"
                    className={inputClass}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>진입 규칙</label>
                    <textarea
                        value={formData.entry_rules}
                        onChange={(e) => setFormData({ ...formData, entry_rules: e.target.value })}
                        placeholder="언제 진입하는가?"
                        rows={3}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className={labelClass}>청산 규칙</label>
                    <textarea
                        value={formData.exit_rules}
                        onChange={(e) => setFormData({ ...formData, exit_rules: e.target.value })}
                        placeholder="언제 청산하는가?"
                        rows={3}
                        className={inputClass}
                    />
                </div>
            </div>

            <div>
                <label className={labelClass}>리스크 노트</label>
                <textarea
                    value={formData.risk_notes}
                    onChange={(e) => setFormData({ ...formData, risk_notes: e.target.value })}
                    placeholder="이 전략의 리스크와 주의사항"
                    rows={2}
                    className={inputClass}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    onClick={() => {
                        if (isEdit) setEditingId(null);
                        else setIsAdding(false);
                        resetForm();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    disabled={loading}
                >
                    <X size={14} className="inline mr-1" />
                    취소
                </button>
                <button
                    onClick={isEdit ? handleUpdate : handleAdd}
                    disabled={loading || !formData.name.trim()}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        } disabled:opacity-50`}
                >
                    {loading ? (
                        <span className="animate-spin">⏳</span>
                    ) : (
                        <Check size={14} />
                    )}
                    {isEdit ? '수정' : '추가'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    <Zap size={20} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                    전략 관리
                </h3>
                {!isAdding && !editingId && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${darkMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                    >
                        <Plus size={14} />
                        새 전략
                    </button>
                )}
            </div>

            {/* Add Form */}
            {isAdding && renderForm(false)}

            {/* Strategy List */}
            <div className="space-y-2">
                {strategies.map((strategy) => (
                    <div key={strategy.id}>
                        {editingId === strategy.id ? (
                            renderForm(true)
                        ) : (
                            <div className={`${cardClass} overflow-hidden`}>
                                {/* Strategy Header */}
                                <div
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                                        }`}
                                    onClick={() => setExpandedId(expandedId === strategy.id ? null : strategy.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: strategy.color || PRESET_COLORS[0] }}
                                        />
                                        <span className={`font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                            {strategy.name}
                                        </span>
                                        {strategy.description && (
                                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                - {strategy.description}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(strategy);
                                            }}
                                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                                                }`}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemove(strategy.id);
                                            }}
                                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-500'
                                                }`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        {expandedId === strategy.id ? (
                                            <ChevronUp size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                                        ) : (
                                            <ChevronDown size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === strategy.id && (
                                    <div className={`px-4 pb-4 pt-0 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                            {strategy.entry_rules && (
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        진입 규칙
                                                    </div>
                                                    <div className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        {strategy.entry_rules}
                                                    </div>
                                                </div>
                                            )}
                                            {strategy.exit_rules && (
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        청산 규칙
                                                    </div>
                                                    <div className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        {strategy.exit_rules}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {strategy.risk_notes && (
                                            <div className="mt-4">
                                                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    리스크 노트
                                                </div>
                                                <div className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-amber-400/80' : 'text-amber-600'}`}>
                                                    ⚠️ {strategy.risk_notes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {strategies.length === 0 && !isAdding && (
                <div className={`text-center py-12 rounded-xl border-2 border-dashed ${darkMode ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    <Zap size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">등록된 전략이 없습니다.</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className={`mt-3 text-sm font-bold ${darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
                    >
                        + 첫 전략 추가하기
                    </button>
                </div>
            )}
        </div>
    );
}
