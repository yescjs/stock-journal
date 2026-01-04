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
    CheckCircle2,
    RefreshCw
} from 'lucide-react';

interface SettingsPanelProps {
    darkMode: boolean;
    currentUser: User | null;
    onExportCsv: () => void;
    onExportBackup: () => void;
    onImportBackup: () => void;
    onClearAll: () => void;
    onDeleteAccount?: () => void;
    backupMessage: string | null;
    onUpdateSymbolNames?: () => void; // New prop
    isUpdating?: boolean; // New prop
}

export function SettingsPanel({
    darkMode,
    currentUser,
    onExportCsv,
    onExportBackup,
    onImportBackup,
    onClearAll,
    onDeleteAccount,
    backupMessage,
    onUpdateSymbolNames,
    isUpdating
}: SettingsPanelProps) {
    const cardClass = `rounded-3xl p-6 md:p-8 border transition-all glass-card ${darkMode
        ? 'bg-slate-900/40 border-slate-700/50'
        : 'bg-white/60 border-white/60 shadow-lg'
        }`;

    const buttonClass = `px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-press ${darkMode
        ? 'bg-slate-800 text-slate-200 hover:bg-indigo-600 hover:text-white border border-slate-700/50'
        : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
        }`;

    const labelClass = `text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'
        }`;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Profile Card */}
            <div className={cardClass}>
                <div className="flex items-center gap-5">
                    {currentUser ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-500/25">
                                {currentUser.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {currentUser.email}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <CheckCircle2 size={12} />
                                        <span className="text-xs font-bold">
                                            클라우드 동기화 활성화
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <UserIcon size={28} />
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    게스트 모드
                                </div>
                                <div className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    데이터가 브라우저에만 저장됩니다 (로그인하여 백업 권장)
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

                    {/* Data Correction */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white/50 border-white/50'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-indigo-500 shadow-sm'
                                }`}>
                                <RefreshCw size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    종목명 데이터 업데이트
                                </div>
                                <div className={`text-xs mt-0.5 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    이전 데이터의 누락된 종목명을 복구합니다
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onUpdateSymbolNames}
                            disabled={isUpdating}
                            className={buttonClass}
                        >
                            <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
                            {isUpdating ? '업데이트 중...' : '업데이트'}
                        </button>
                    </div>

                    {/* CSV Export */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white/50 border-white/50'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-indigo-500 shadow-sm'
                                }`}>
                                <FileDown size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    CSV 내보내기
                                </div>
                                <div className={`text-xs mt-0.5 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    엑셀 호환 형식으로 저장
                                </div>
                            </div>
                        </div>
                        <button onClick={onExportCsv} className={buttonClass}>
                            <Download size={14} />
                            내보내기
                        </button>
                    </div>

                    {/* Backup Export */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white/50 border-white/50'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-indigo-500 shadow-sm'
                                }`}>
                                <Shield size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    백업 파일 저장
                                </div>
                                <div className={`text-xs mt-0.5 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    JSON 형식 전체 백업
                                </div>
                            </div>
                        </div>
                        <button onClick={onExportBackup} className={buttonClass}>
                            <Download size={14} />
                            다운로드
                        </button>
                    </div>

                    {/* Backup Import */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white/50 border-white/50'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-indigo-500 shadow-sm'
                                }`}>
                                <Upload size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    백업 복원
                                </div>
                                <div className={`text-xs mt-0.5 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    JSON 파일에서 복구
                                </div>
                                {backupMessage && (
                                    <div className="text-xs font-bold text-indigo-500 mt-1">{backupMessage}</div>
                                )}
                            </div>
                        </div>
                        <button onClick={onImportBackup} className={buttonClass}>
                            <Upload size={14} />
                            파일 선택
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className={`rounded-3xl p-6 md:p-8 border-2 transition-all ${darkMode
                ? 'bg-rose-950/20 border-rose-900/30'
                : 'bg-rose-50/50 border-rose-100'
                }`}>
                <div className={`text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-rose-400' : 'text-rose-500'
                    }`}>
                    <AlertTriangle size={14} />
                    위험 영역
                </div>

                <div className="space-y-3">
                    {/* Clear All Data */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-rose-900/30' : 'bg-white border-rose-100'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-rose-900/20' : 'bg-rose-50'
                                }`}>
                                <Trash2 size={20} className="text-rose-500" />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {currentUser ? '데이터 초기화' : '게스트 데이터 삭제'}
                                </div>
                                <div className={`text-xs mt-0.5 font-medium ${darkMode ? 'text-rose-300' : 'text-rose-400'}`}>
                                    {currentUser ? '현재 계정의 모든 거래내역을 삭제합니다' : '브라우저에 저장된 데이터를 삭제합니다'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClearAll}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-press ${darkMode
                                ? 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50 border border-rose-800'
                                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                }`}
                        >
                            <Trash2 size={14} />
                            초기화
                        </button>
                    </div>

                    {/* Delete Account (Only for Logged In Users) */}
                    {currentUser && onDeleteAccount && (
                        <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-rose-900/30' : 'bg-white border-rose-100'
                            }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-rose-900/20' : 'bg-rose-50'
                                    }`}>
                                    <UserIcon size={20} className="text-rose-500" />
                                </div>
                                <div>
                                    <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        회원 탈퇴
                                    </div>
                                    <div className={`text-xs mt-0.5 font-medium ${darkMode ? 'text-rose-300' : 'text-rose-400'}`}>
                                        계정과 모든 데이터를 영구적으로 삭제합니다
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onDeleteAccount}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-press bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                            >
                                <Trash2 size={14} />
                                탈퇴하기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
