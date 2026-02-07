'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X, Calendar, Bell } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

interface DailyReminderProps {
  darkMode: boolean;
  lastTradeDate?: string;
  onDismiss?: () => void;
}

export function DailyReminder({ darkMode, lastTradeDate, onDismiss }: DailyReminderProps) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const dismissed = localStorage.getItem('daily-reminder-dismissed');
    const today = new Date().toDateString();
    return dismissed !== today;
  });

  const daysSinceLastTrade = React.useMemo(() => {
    if (!lastTradeDate) return 999;
    const lastDate = new Date(lastTradeDate);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [lastTradeDate]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
    localStorage.setItem('daily-reminder-dismissed', new Date().toDateString());
  };

  if (!isVisible) return null;

  const isFirstTrade = daysSinceLastTrade === 999;
  const isStreakAtRisk = daysSinceLastTrade >= 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <div
          className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
            darkMode
              ? 'bg-slate-900/90 border-orange-500/30 shadow-orange-500/10'
              : 'bg-white/90 border-orange-300 shadow-orange-200/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl ${
                isStreakAtRisk
                  ? darkMode
                    ? 'bg-red-500/20'
                    : 'bg-red-100'
                  : darkMode
                    ? 'bg-orange-500/20'
                    : 'bg-orange-100'
              }`}
            >
              {isFirstTrade ? (
                <Bell className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              ) : isStreakAtRisk ? (
                <Flame className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              ) : (
                <Calendar className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              )}
            </div>

            <div className="flex-1">
              <h3 className={`font-bold text-base mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {isFirstTrade
                  ? '첫 거래를 기록해보세요!'
                  : isStreakAtRisk
                    ? `${daysSinceLastTrade}일째 기록 없음`
                    : '오늘의 매매를 기록해요'}
              </h3>
              <p className={`text-sm mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {isFirstTrade
                  ? '매매일지 작성을 시작하여 수익 패턴을 분석해보세요.'
                  : isStreakAtRisk
                    ? '연속 기록이 끊길 위험이 있어요. 오늘의 거래를 기록하세요.'
                    : '꾸준한 기록이 트레이딩 성장의 첫걸음입니다.'}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    darkMode ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                  onClick={() => {
                    document.getElementById('trade-form')?.scrollIntoView({ behavior: 'smooth' });
                    handleDismiss();
                  }}
                >
                  지금 기록하기
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className={`text-sm ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  나중에
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className={`p-1 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
