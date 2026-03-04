'use client';

import { X, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OnboardingSteps } from '@/app/hooks/useOnboarding';

interface OnboardingChecklistProps {
  steps: OnboardingSteps;
  completedCount: number;
  totalSteps: number;
  isVisible: boolean;
  onDismiss: () => void;
}

const STEP_CONFIG: { key: keyof OnboardingSteps; label: string; description: string }[] = [
  { key: 'firstTrade', label: '첫 매매 기록하기', description: '매수 또는 매도 거래를 1건 기록해보세요' },
  { key: 'buySellCycle', label: '매수→매도 한 사이클 완성', description: '같은 종목을 매수하고 매도해보세요' },
  { key: 'emotionTag', label: '감정 태그 기록하기', description: '거래 시 느낀 감정을 태그로 남겨보세요' },
  { key: 'visitAnalysis', label: '주간 분석 확인하기', description: '분석 탭에서 매매 통계를 확인해보세요' },
  { key: 'aiReport', label: 'AI 리포트 받아보기', description: 'AI가 분석한 매매 리포트를 확인해보세요' },
];

export function OnboardingChecklist({
  steps,
  completedCount,
  totalSteps,
  isVisible,
  onDismiss,
}: OnboardingChecklistProps) {
  const progressPct = (completedCount / totalSteps) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="mb-4 rounded-2xl border border-white/8 bg-white/3 p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">시작 가이드</h3>
                <p className="mt-0.5 text-xs text-white/40">
                  {completedCount}/{totalSteps} 완료
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-1">
              {STEP_CONFIG.map(({ key, label, description }) => {
                const done = steps[key];
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      done ? 'opacity-50' : 'hover:bg-white/3'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        done
                          ? 'border-emerald-400/50 bg-emerald-400/10'
                          : 'border-white/20'
                      }`}
                    >
                      {done && <Check className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${done ? 'line-through' : 'font-medium'}`}>{label}</div>
                      {!done && <div className="text-xs text-white/30">{description}</div>}
                    </div>
                    {!done && <ChevronRight className="h-4 w-4 text-white/20" />}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
