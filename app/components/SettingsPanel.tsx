'use client';

import React from 'react';
import { User } from '@supabase/supabase-js';
import {
    User as UserIcon,
    Download,
    Upload,
    FileDown,
    Trash2,
    Shield,
    Database,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';

interface SettingsPanelProps {
    darkMode: boolean;
    currentUser: User | null;
    onExportCsv: () => void;
    onExportBackup: () => void;
    onImportBackup: () => void;
    onClearAll: () => void;
    backupMessage: string | null;
}

export function SettingsPanel({
    darkMode,
    currentUser,
    onExportCsv,
    onExportBackup,
    onImportBackup,
    onClearAll,
    backupMessage,
}: SettingsPanelProps) {
    const cardClass = `rounded-2xl p-5 border transition-all ${darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`;

    const buttonClass = `px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${darkMode
            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
        }`;

    const labelClass = `text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'
        }`;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Profile Card */}
            <div className={cardClass}>
                <div className="flex items-center gap-4">
                    {currentUser ? (
                        <>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/25">
                                {currentUser.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {currentUser.email}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                    <span className="text-xs font-medium text-emerald-500">
                                        클라우드 동기화 활성화
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'
                                }`}>
                                <UserIcon size={24} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    게스트 모드
                                </div>
                                <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    데이터가 브라우저에만 저장됩니다
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Data Management Section */}
            <div className={cardClass}>
                <div className={labelClass}>
                    <Database size={14} />
                    데이터 관리
                </div>

                <div className="space-y-3">
                    {/* CSV Export */}
                    <div className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-white border border-slate-200'
                                }`}>
                                <FileDown size={18} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
                            </div>
                            <div>
                                <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    CSV 내보내기
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    엑셀 호환 형식으로 저장
                                </div>
                            </div>
                        </div>
                        <button onClick={onExportCsv} className={buttonClass}>
                            <Download size={16} />
                            내보내기
                        </button>
                    </div>

                    {/* Backup Export */}
                    <div className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-white border border-slate-200'
                                }`}>
                                <Shield size={18} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
                            </div>
                            <div>
                                <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    백업 파일 저장
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    JSON 형식 전체 백업
                                </div>
                            </div>
                        </div>
                        <button onClick={onExportBackup} className={buttonClass}>
                            <Download size={16} />
                            백업
                        </button>
                    </div>

                    {/* Backup Import */}
                    <div className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-white border border-slate-200'
                                }`}>
                                <Upload size={18} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
                            </div>
                            <div>
                                <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    백업 복원
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    JSON 파일에서 복구
                                </div>
                                {backupMessage && (
                                    <div className="text-xs text-blue-500 mt-1">{backupMessage}</div>
                                )}
                            </div>
                        </div>
                        <button onClick={onImportBackup} className={buttonClass}>
                            <Upload size={16} />
                            복원
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className={`rounded-2xl p-5 border-2 ${darkMode
                    ? 'bg-rose-950/30 border-rose-900/50'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-rose-400' : 'text-rose-500'
                    }`}>
                    <AlertTriangle size={14} />
                    위험 영역
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-900/50' : 'bg-white'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-rose-900/30' : 'bg-rose-100'
                            }`}>
                            <Trash2 size={18} className="text-rose-500" />
                        </div>
                        <div>
                            <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                모든 데이터 삭제
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                이 작업은 되돌릴 수 없습니다
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClearAll}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${darkMode
                                ? 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50 border border-rose-800'
                                : 'bg-rose-100 text-rose-600 hover:bg-rose-200 border border-rose-200'
                            }`}
                    >
                        <Trash2 size={16} />
                        초기화
                    </button>
                </div>
            </div>
        </div>
    );
}
