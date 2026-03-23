'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

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

  const claimDailyBonus = useCallback(async () => {
    if (!user) return;

    // Check if already claimed today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: existing, error: checkError } = await supabase
      .from('coin_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'daily_bonus')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .limit(1);

    if (checkError) {
      console.error('Failed to check daily bonus:', checkError);
      return;
    }

    if (existing && existing.length > 0) return; // Already claimed today

    const amount = getBonusAmount(currentStreak);

    const { error: addError } = await supabase.rpc('add_coins', {
      p_user_id: user.id,
      p_amount: amount,
      p_type: 'daily_bonus',
      p_ref_type: 'daily_bonus',
      p_ref_id: today,
    });

    if (addError) {
      console.error('Failed to add daily bonus:', addError);
      return;
    }

    setBonusResult({ amount, streak: currentStreak });
    await onCoinsChanged?.();
  }, [user, currentStreak, onCoinsChanged]);

  // Auto-claim on page load (once, after streak is loaded)
  useEffect(() => {
    if (!user || streakLoading || checkedRef.current) return;
    checkedRef.current = true;
    claimDailyBonus();
  }, [user, streakLoading, claimDailyBonus]);

  const dismissBonus = useCallback(() => {
    setBonusResult(null);
  }, []);

  return { bonusResult, dismissBonus };
}
