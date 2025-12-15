import React from 'react';
import { User } from '@supabase/supabase-js';

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
            <div className="flex items-center justify-between mb-4">
                <h3 className={'text-lg font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-800')}>
                    Data Management
                </h3>
                <span className={'text-xs px-2 py-1 rounded-full ' + (currentUser ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400')}>
                    {currentUser ? 'Cloud Mode (Supabase)' : 'Guest Mode (Local Only)'}
                </span>
            </div>

            <p className="text-sm text-slate-500 mb-6">
                Manage your trading data. You can export your logs to CSV for analysis or backup your data as JSON.
                {currentUser ? ' Your data is safely stored in the cloud.' : ' Warning: Data is only stored in your browser. Clear cache will lose data.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Export & Backup</h4>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={onExportCsv}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                            <span>📊</span> Download CSV
                        </button>
                        <button
                            type="button"
                            onClick={onExportBackup}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                            <span>💾</span> Download JSON Backup
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Danger Zone</h4>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={onImportBackup}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                            <span>📂</span> Restore from Backup
                        </button>
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 transition-colors"
                        >
                            <span>⚠️</span> Clear All Data
                        </button>
                    </div>
                </div>
            </div>

            {backupMessage && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-sm border border-blue-100 dark:border-blue-900/30">
                    {backupMessage}
                </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">
                <strong>Note:</strong> JSON backups include current view filters and price data. Use regular backups to prevent data loss in Guest Mode.
            </div>
        </div>
    );
}
