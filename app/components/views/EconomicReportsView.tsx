'use client';

import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useEconomicReports, useUserPreferences } from '@/app/hooks/useEconomicReports';
import { EconomicReportCard } from '@/app/components/EconomicReportCard';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { FileText, RefreshCw, Settings, Bell, BellOff, Plus } from 'lucide-react';

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

  const handleGenerateReport = async () => {
    if (!currentUser) {
      alert('AI 일보 생성은 로그인 사용자만 가능합니다.');
      return;
    }

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
      <div
        className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AI 일보 브리프
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              매일 오전 9시, 핵심 시장 요약과 주요 이슈를 제공합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <div
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
              }`}
            >
              {unreadCount}건 미읽음
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={refreshReports} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <Card className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                일보 자동 수신
              </span>
              {!currentUser && (
                <span className="text-xs text-amber-500">(로그인 필요)</span>
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

      {currentUser && (
        <div className="p-4">
          <Button onClick={handleGenerateReport} disabled={generating} className="w-full" variant="secondary">
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                AI 일보 생성 중...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                수동으로 AI 일보 생성
              </>
            )}
          </Button>
        </div>
      )}

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

function LoadingSkeleton({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="w-full max-w-2xl space-y-4 p-4">
      <div className={`h-8 w-48 rounded ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} animate-pulse`} />
      <div className={`h-40 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} animate-pulse`} />
      <div className={`h-40 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} animate-pulse`} />
    </div>
  );
}

function EmptyState({
  darkMode,
  onGenerate,
  hasUser,
}: {
  darkMode: boolean;
  onGenerate: () => void;
  hasUser: boolean;
}) {
  return (
    <Card className={`p-8 text-center ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
      <div
        className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
          darkMode ? 'bg-slate-800' : 'bg-slate-100'
        }`}
      >
        <FileText className={`w-8 h-8 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
      </div>
      <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        아직 생성된 일보가 없어요
      </h3>
      <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {hasUser
          ? '매일 오전 9시에 최신 시장 브리프가 자동으로 생성됩니다.'
          : '로그인하면 매일 오전 9시에 최신 시장 브리프를 받아볼 수 있습니다.'}
      </p>
      {hasUser && (
        <Button onClick={onGenerate} variant="secondary">
          <Plus className="w-4 h-4 mr-2" />
          수동으로 AI 일보 생성
        </Button>
      )}
    </Card>
  );
}
