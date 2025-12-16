import React from 'react';
import { User } from '@supabase/supabase-js';
import { User as UserIcon } from 'lucide-react';

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
    return (
        <div
            className={
                'rounded-2xl p-6 border shadow-sm transition-all ' +
                (darkMode
                    ? 'border-slate-800 bg-slate-900 shadow-slate-900/50'
                    : 'border-slate-200 bg-white shadow-slate-200/50')
            }
        >
            <h2 className="text-xl font-bold mb-6">설정</h2>
            
            <div className="space-y-8">
                {/* Data Management */}
                <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">데이터 관리</h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div>
                                <div className="font-medium">CSV 내보내기</div>
                                <div className="text-xs text-slate-500">모든 매매 기록을 엑셀로 저장합니다.</div>
                            </div>
                            <button 
                                onClick={onExportCsv}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                            >
                                내보내기
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div>
                                <div className="font-medium">백업 파일 저장</div>
                                <div className="text-xs text-slate-500">데이터를 JSON 파일로 다운로드합니다.</div>
                            </div>
                            <button 
                                onClick={onExportBackup}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                            >
                                백업
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                             <div>
                                <div className="font-medium">백업 파일 복원</div>
                                <div className="text-xs text-slate-500">JSON 파일을 불러와 데이터를 복구합니다.</div>
                                {backupMessage && <div className="text-xs text-blue-500 mt-1">{backupMessage}</div>}
                            </div>
                            <button 
                                onClick={onImportBackup}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                            >
                                복원 (불러오기)
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-rose-100 dark:border-rose-900/30">
                            <div>
                                <div className="font-medium text-rose-600">데이터 초기화</div>
                                <div className="text-xs text-rose-400">모든 매매 기록이 영구적으로 삭제됩니다.</div>
                            </div>
                            <button 
                                onClick={onClearAll}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-rose-200 dark:border-rose-800 text-rose-500 rounded-lg text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                            >
                                초기화
                            </button>
                        </div>
                    </div>
                </section>

                {/* Account Info */}
                <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">계정 정보</h3>
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        {currentUser ? (
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                    {currentUser.email?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{currentUser.email}</div>
                                    <div className="text-xs text-emerald-500">로그인됨 (Supabase)</div>
                                </div>
                             </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                                    <UserIcon size={20} />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">게스트 모드</div>
                                    <div className="text-xs text-slate-500">로컬 브라우저에 데이터가 저장됩니다.</div>
                                </div>
                            </div>
                        )}
                     </div>
                </section>
            </div>
        </div>
    );
}
