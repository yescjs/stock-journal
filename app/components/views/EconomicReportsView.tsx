'use client';

import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useEconomicReports, useUserPreferences } from '@/app/hooks/useEconomicReports';
import { EconomicReportCard } from '@/app/components/EconomicReportCard';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { FileText, RefreshCw, Settings, Bell, BellOff, Plus, Loader2 } from 'lucide-react';

interface EconomicReportsViewProps {
  darkMode: boolean;
  currentUser: User | null;
}

export function EconomicReportsView({ darkMode, currentUser }: EconomicReportsViewProps) {
  const {
    reports,
    loading,
    error,
    unreadCount,
    markAsRead,
    deleteReport,
    refreshReports,
    generateManualReport,
  } = useEconomicReports(currentUser);

  const { preferences, updatePreferences } = useUserPreferences(currentUser);
  const [generating, setGenerating] = useState(false);

  // 수동 보고서 생성 (게스트/로그인 모두 지원)
  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await generateManualReport();
    } finally {
      setGenerating(false);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <LoadingSkeleton darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        darkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AI 경제 일보
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              매일 아침 9시, AI가 정리하는 경제 소식
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
              darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>
              {unreadCount}개 읽지 않음
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshReports}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Settings */}
      <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <Card className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                일일 보고서 수신
              </span>
              {!currentUser && (
                <span className="text-xs text-amber-500">(자동 수신은 로그인 후 가능)</span>
              )}
            </div>
            <button
              onClick={() => {
                if (currentUser) {
                  updatePreferences({ enable_daily_report: !preferences?.enable_daily_report });
                }
              }}
              disabled={!currentUser}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preferences?.enable_daily_report
                  ? 'bg-blue-500 text-white'
                  : darkMode
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-200 text-slate-600'
              } ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {preferences?.enable_daily_report ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              {preferences?.enable_daily_report ? '활성화' : '비활성화'}
            </button>
          </div>
        </Card>
      </div>

      {/* Generate Button (Manual) */}
      <div className="p-4">
        <Button
          onClick={handleGenerateReport}
          disabled={generating}
          className="w-full"
          variant="secondary"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              보고서 생성 중...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              지금 보고서 생성하기
            </>
          )}
        </Button>
        {!currentUser && (
          <p className="text-xs text-amber-500 mt-2 text-center">
            게스트 모드: 보고서가 이 기기에만 저장됩니다
          </p>
        )}
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-rose-500/20' : 'bg-rose-100'}`}>
            <p className="text-rose-500 text-sm">{error}</p>
          </div>
        )}

        {reports.length === 0 ? (
          <EmptyState darkMode={darkMode} onGenerate={handleGenerateReport} hasUser={!!currentUser} />
        ) : (
          reports.map((report) => (
            <EconomicReportCard
              key={report.id}
              report={report}
              darkMode={darkMode}
              onMarkAsRead={markAsRead}
              onDelete={deleteReport}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="w-full max-w-2xl space-y-4 p-4">
      <div className={`h-8 w-48 rounded ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} animate-pulse`} />
      <div className={`h-32 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} animate-pulse`} />
      <div className={`h-32 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} animate-pulse`} />
    </div>
  );
}

// Empty State
function EmptyState({ 
  darkMode, 
  onGenerate, 
  hasUser 
}: { 
  darkMode: boolean; 
  onGenerate: () => void;
  hasUser: boolean;
}) {
  return (
    <Card className={`p-8 text-center ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
        darkMode ? 'bg-slate-800' : 'bg-slate-100'
      }`}>
        <FileText className={`w-8 h-8 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
      </div>
      <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        아직 보고서가 없습니다
      </h3>
      <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {hasUser
          ? '매일 아침 9시에 AI가 자동으로 경제 보고서를 생성합니다.'
          : '아래 버튼을 눌러 지금 바로 경제 보고서를 생성해보세요.'}
      </p>
      <Button onClick={onGenerate} variant="secondary">
        <Plus className="w-4 h-4 mr-2" />
        지금 보고서 생성하기
      </Button>
    </Card>
  );
}
