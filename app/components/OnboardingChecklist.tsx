'use client';

import { X, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { OnboardingSteps } from '@/app/hooks/useOnboarding';

interface OnboardingChecklistProps {
  steps: OnboardingSteps;
  completedCount: number;
  totalSteps: number;
  isVisible: boolean;
  onDismiss: () => void;
  onStepClick?: (step: keyof OnboardingSteps) => void;
}

const STEP_KEYS: { key: keyof OnboardingSteps; labelKey: string; descKey: string }[] = [
  { key: 'firstTrade', labelKey: 'step1Label', descKey: 'step1Desc' },
  { key: 'buySellCycle', labelKey: 'step2Label', descKey: 'step2Desc' },
  { key: 'visitAnalysis', labelKey: 'step3Label', descKey: 'step3Desc' },
  { key: 'aiReport', labelKey: 'step4Label', descKey: 'step4Desc' },
];

export function OnboardingChecklist({
  steps,
  completedCount,
  totalSteps,
  isVisible,
  onDismiss,
  onStepClick,
}: OnboardingChecklistProps) {
  const t = useTranslations('onboarding');
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
                <h3 className="text-sm font-semibold">{t('guideTitle')}</h3>
                <p className="mt-0.5 text-xs text-white/40">
                  {t('progress', { completed: completedCount, total: totalSteps })}
                </p>
              </div>
              <button
                data-testid="dismiss-onboarding"
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
              {STEP_KEYS.map(({ key, labelKey, descKey }) => {
                const done = steps[key];
                const clickable = !done && onStepClick;
                return (
                  <div
                    key={key}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => onStepClick(key) : undefined}
                    onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStepClick(key); } } : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      done ? 'opacity-50' : 'hover:bg-white/5 cursor-pointer active:bg-white/8'
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
                      <div className={`text-sm ${done ? 'line-through' : 'font-medium'}`}>{t(labelKey)}</div>
                      {!done && <div className="text-xs text-white/30">{t(descKey)}</div>}
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
