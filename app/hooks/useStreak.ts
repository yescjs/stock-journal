'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { format, differenceInCalendarDays, isWeekend } from 'date-fns';

const GUEST_STREAK_KEY = 'stock-journal-guest-streaks-v1';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastRecordDate: string | null; // 'YYYY-MM-DD'
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastRecordDate: null,
};

export function useStreak(user: User | null) {
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);
  const [loading, setLoading] = useState(true);
  const dataLoaded = useRef(false);

  // Load
  useEffect(() => {
    let mounted = true;
    dataLoaded.current = false;
    setStreak(DEFAULT_STREAK);

    async function load() {
      setLoading(true);
      try {
        if (user) {
          const { data, error } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (mounted && data) {
            setStreak({
              currentStreak: data.current_streak,
              longestStreak: data.longest_streak,
              lastRecordDate: data.last_record_date,
            });
          }
        } else {
          const stored = localStorage.getItem(GUEST_STREAK_KEY);
          if (stored && mounted) {
            setStreak(JSON.parse(stored));
          }
        }
      } catch (err) {
        console.error('Failed to load streak:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          dataLoaded.current = true;
        }
      }
    }

    load();
    return () => { mounted = false; };
  }, [user]);

  // Save guest streak to localStorage
  useEffect(() => {
    if (!user && !loading && dataLoaded.current) {
      localStorage.setItem(GUEST_STREAK_KEY, JSON.stringify(streak));
    }
  }, [streak, user, loading]);

  // 거래일 사이의 영업일 차이 계산 (주말 제외)
  const getBusinessDayGap = useCallback((lastDate: string, today: string): number => {
    const last = new Date(lastDate);
    const now = new Date(today);
    const calendarDays = differenceInCalendarDays(now, last);

    if (calendarDays <= 1) return calendarDays;

    // 주말만 건너뛰기 (공휴일은 미지원)
    let businessDays = 0;
    const current = new Date(last);
    for (let i = 1; i <= calendarDays; i++) {
      current.setDate(current.getDate() + 1);
      if (!isWeekend(current)) {
        businessDays++;
      }
    }
    return businessDays;
  }, []);

  const recordToday = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');

    if (streak.lastRecordDate === today) return; // 이미 오늘 기록함

    let newStreak: StreakData;

    if (!streak.lastRecordDate) {
      // 첫 기록
      newStreak = { currentStreak: 1, longestStreak: 1, lastRecordDate: today };
    } else {
      const gap = getBusinessDayGap(streak.lastRecordDate, today);

      if (gap <= 1) {
        // 연속 (어제 또는 오늘 — 주말 건너뛰기 포함)
        const newCurrent = streak.currentStreak + 1;
        newStreak = {
          currentStreak: newCurrent,
          longestStreak: Math.max(streak.longestStreak, newCurrent),
          lastRecordDate: today,
        };
      } else {
        // 스트릭 리셋
        newStreak = {
          currentStreak: 1,
          longestStreak: streak.longestStreak,
          lastRecordDate: today,
        };
      }
    }

    setStreak(newStreak);

    if (user) {
      try {
        await supabase.from('user_streaks').upsert(
          {
            user_id: user.id,
            current_streak: newStreak.currentStreak,
            longest_streak: newStreak.longestStreak,
            last_record_date: newStreak.lastRecordDate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (err) {
        console.error('Failed to save streak:', err);
      }
    }
  }, [user, streak, getBusinessDayGap]);

  return { streak, loading, recordToday };
}
