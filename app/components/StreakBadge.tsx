'use client';

import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
}

export function StreakBadge({ currentStreak, longestStreak, loading }: StreakBadgeProps) {
  const t = useTranslations('streak');

  if (loading || currentStreak === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5">
      <Flame className="h-4 w-4 text-orange-400" />
      <span className="text-sm font-bold text-orange-400">{currentStreak}</span>
      <span className="text-xs text-white/40">{t('consecutive')}</span>
      {longestStreak > currentStreak && (
        <span className="ml-1 text-xs text-white/20">{t('best', { count: longestStreak })}</span>
      )}
    </div>
  );
}
