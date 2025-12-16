'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useTagColors, TAG_PRESETS } from '@/app/hooks/useTagColors';

interface TagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    allTags: string[];
    darkMode: boolean;
    tagColors: Record<string, string>;
    setTagColor: (tag: string, color: string) => void;
}

export function TagManagerModal({
    isOpen,
    onClose,
    allTags,
    darkMode,
    tagColors,
    setTagColor
}: TagManagerModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className={'w-full max-w-lg rounded-xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto ' + (darkMode ? 'bg-slate-900 text-slate-100 border border-slate-700' : 'bg-white text-slate-900')}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold">태그 색상 관리</h2>
                        <p className="text-xs text-slate-500">전략별로 태그 색상을 지정하여 가시성을 높이세요.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {allTags.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">태그가 없습니다. 매매 일지에 태그를 먼저 추가해주세요.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {allTags.map(tag => (
                                <div key={tag} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-4 h-4 rounded-full shadow-sm"
                                            style={{ backgroundColor: tagColors[tag] || '#64748b' }}
                                        />
                                        <span className="font-medium">#{tag}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {TAG_PRESETS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setTagColor(tag, color)}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${tagColors[tag] === color ? 'border-black dark:border-white' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium hover:brightness-95 transition"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
