'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { format } from 'date-fns';

interface DailyBonusResult {
  amount: number;
  streak: number;
}

/**
 * Calculate bonus coins based on consecutive streak days.
 * 1 day: 1 coin, 3+ days: 2 coins, 7+ days: 3 coins, 30+ days: 5 coins
 */
function getBonusAmount(currentStreak: number): number {
  if (currentStreak >= 30) return 5;
  if (currentStreak >= 7) return 3;
  if (currentStreak >= 3) return 2;
  return 1;
}

export function useDailyBonus(
  user: User | null,
  currentStreak: number,
  streakLoading: boolean,
  onCoinsChanged?: () => Promise<void>
) {
  const [bonusResult, setBonusResult] = useState<DailyBonusResult | null>(null);
  const checkedRef = useRef(false);
  // Ref로 최신 streak 값 추적 (stale closure 방지)
  const streakRef = useRef(currentStreak);
  useEffect(() => {
    streakRef.current = currentStreak;
  }, [currentStreak]);

  const claimDailyBonus = useCallback(async (): Promise<DailyBonusResult | null> => {
    if (!user) return null;

    // 로컬 타임존 기준 오늘 날짜 (useStreak와 동일한 date-fns format 사용)
    const today = format(new Date(), 'yyyy-MM-dd');

    // p_ref_id에 날짜를 저장하므로, 같은 날짜로 중복 체크
    const { data: existing, error: checkError } = await supabase
      .from('coin_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'attendance_bonus')
      .eq('reference_id', today)
      .limit(1);

    if (checkError) {
      console.error('Failed to check daily bonus:', checkError);
      return null;
    }

    if (existing && existing.length > 0) return null; // Already claimed today

    const streak = streakRef.current;
    const amount = getBonusAmount(streak);

    const { error: addError } = await supabase.rpc('add_coins', {
      p_user_id: user.id,
      p_amount: amount,
      p_type: 'attendance_bonus',
      p_ref_type: 'attendance_bonus',
      p_ref_id: today,
    });

    if (addError) {
      console.error('Failed to add daily bonus:', addError);
      return null;
    }

    await onCoinsChanged?.();
    return { amount, streak };
  }, [user, onCoinsChanged]);

  // Auto-claim on page load (once, after streak is loaded)
  useEffect(() => {
    if (!user || streakLoading || checkedRef.current) return;
    checkedRef.current = true;

    // 비동기 함수를 분리하여 lint 규칙 준수 (setState는 콜백 내에서 호출)
    claimDailyBonus().then((result) => {
      if (result) {
        setBonusResult(result);
      }
    });
  }, [user, streakLoading, claimDailyBonus]);

  const dismissBonus = useCallback(() => {
    setBonusResult(null);
  }, []);

  return { bonusResult, dismissBonus };
}
