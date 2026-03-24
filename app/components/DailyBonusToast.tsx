'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DailyBonusToastProps {
  amount: number;
  streak: number;
  onDismiss: () => void;
}

export function DailyBonusToast({ amount, streak, onDismiss }: DailyBonusToastProps) {
  const t = useTranslations('dailyBonus');

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] cursor-pointer"
        onClick={onDismiss}
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600/90 to-purple-600/90 border border-white/20 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15">
            <Gem size={16} className="text-yellow-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {t('received', { amount })}
            </p>
            {streak >= 3 && (
              <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
                <Flame size={10} className="text-orange-400" />
                {t('streakBonus', { days: streak })}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
