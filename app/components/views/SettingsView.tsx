import React from 'react';
import { User } from '@supabase/supabase-js';
import { SettingsPanel } from '@/app/components/SettingsPanel';
import { useBackupManager } from '@/app/hooks/useBackupManager';
import { Download, Upload, Trash2, Database, Target, Sliders } from 'lucide-react';
import { StrategyManager } from '@/app/components/StrategyManager';
import { Strategy } from '@/app/types/strategies';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  currentUser: User | null;
  backupManager: ReturnType<typeof useBackupManager>;
  strategies: Strategy[];
  onAddStrategy: (s: Omit<Strategy, 'id' | 'created_at'>) => Promise<any>;
  onUpdateStrategy: (id: string, s: Partial<Strategy>) => Promise<any>;
  onRemoveStrategy: (id: string) => Promise<any>;
}

export function SettingsView({
  darkMode,
  setDarkMode,
  currentUser,
  backupManager,
  strategies,
  onAddStrategy,
  onUpdateStrategy,
  onRemoveStrategy
}: SettingsViewProps) {
  const {
    handleExportCsv,
    handleExportBackup,
    handleImportBackupClick,
    handleBackupFileChange,
    fileInputRef,
    handleDropGuestData
  } = backupManager;

  return (
    <div className="space-y-8 w-full animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm'}`}>
            <Sliders size={24} strokeWidth={2.5} />
        </div>
        <div>
            <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>환경 설정</h2>
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>전략 및 데이터 관리, 백업 설정</p>
        </div>
      </div>
      
      {/* Strategy Management Section */}
      <div className={`rounded-3xl border overflow-hidden glass-card ${darkMode ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white/60 border-white/60 shadow-lg'}`}>
         <div className="p-6 md:p-8">
             <h3 className={`text-lg font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                 <Target size={20} className="text-indigo-500" />
                 매매 전략 관리
             </h3>
             <StrategyManager 
                strategies={strategies}
                darkMode={darkMode}
                onAdd={onAddStrategy}
                onUpdate={onUpdateStrategy}
                onRemove={onRemoveStrategy}
             />
         </div>
      </div>

      {/* Profile & Data Management via SettingsPanel */}
      <SettingsPanel
        darkMode={darkMode}
        currentUser={currentUser}
        onExportCsv={handleExportCsv}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackupClick}
        onClearAll={handleDropGuestData}
        backupMessage={null}
      />

      {/* Hidden File Input for Backup Import */}
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        onChange={handleBackupFileChange}
        className="hidden"
      />
    </div>
  );
}
