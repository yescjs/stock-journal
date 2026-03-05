'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

const GUEST_ONBOARDING_KEY = 'stock-journal-guest-onboarding-v1';

export interface OnboardingSteps {
  firstTrade: boolean;
  buySellCycle: boolean;
  visitAnalysis: boolean;
  aiReport: boolean;
}

interface OnboardingData {
  steps: OnboardingSteps;
  completedAt: string | null;
  dismissed: boolean;
}

const DEFAULT_STEPS: OnboardingSteps = {
  firstTrade: false,
  buySellCycle: false,
  visitAnalysis: false,
  aiReport: false,
};

const DEFAULT_ONBOARDING: OnboardingData = {
  steps: DEFAULT_STEPS,
  completedAt: null,
  dismissed: false,
};

const VALID_KEYS = Object.keys(DEFAULT_STEPS) as (keyof OnboardingSteps)[];

/** 유효한 키만 남기고 나머지 제거 (마이그레이션 호환) */
function sanitizeSteps(raw: Record<string, boolean>): OnboardingSteps {
  const result = { ...DEFAULT_STEPS };
  for (const key of VALID_KEYS) {
    if (key in raw) result[key] = raw[key];
  }
  return result;
}

export function useOnboarding(user: User | null) {
  const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING);
  const [loading, setLoading] = useState(true);
  const dataLoaded = useRef(false);

  // Load
  useEffect(() => {
    let mounted = true;
    dataLoaded.current = false;
    setData(DEFAULT_ONBOARDING);

    async function load() {
      setLoading(true);
      try {
        if (user) {
          const { data: row, error } = await supabase
            .from('user_onboarding')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (mounted && row) {
            setData({
              steps: sanitizeSteps(row.steps as Record<string, boolean>),
              completedAt: row.completed_at,
              dismissed: false,
            });
          }
        } else {
          const stored = localStorage.getItem(GUEST_ONBOARDING_KEY);
          if (stored && mounted) {
            const parsed = JSON.parse(stored) as OnboardingData;
            setData({
              ...parsed,
              steps: sanitizeSteps(parsed.steps as unknown as Record<string, boolean>),
            });
          }
        }
      } catch (err) {
        console.error('Failed to load onboarding:', err);
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

  // Save guest to localStorage
  useEffect(() => {
    if (!user && !loading && dataLoaded.current) {
      localStorage.setItem(GUEST_ONBOARDING_KEY, JSON.stringify(data));
    }
  }, [data, user, loading]);

  const completeStep = useCallback(
    async (step: keyof OnboardingSteps) => {
      if (data.steps[step]) return; // 이미 완료

      const newSteps = { ...data.steps, [step]: true };
      const allDone = Object.values(newSteps).every(Boolean);
      const completedAt = allDone ? new Date().toISOString() : data.completedAt;

      setData((prev) => ({ ...prev, steps: newSteps, completedAt }));

      if (user) {
        try {
          await supabase.from('user_onboarding').upsert(
            {
              user_id: user.id,
              steps: newSteps,
              completed_at: completedAt,
            },
            { onConflict: 'user_id' }
          );
        } catch (err) {
          console.error('Failed to save onboarding:', err);
        }
      }
    },
    [user, data]
  );

  const dismiss = useCallback(() => {
    setData((prev) => ({ ...prev, dismissed: true }));
  }, []);

  const completedCount = Object.values(data.steps).filter(Boolean).length;
  const totalSteps = Object.keys(data.steps).length;
  const isComplete = data.completedAt !== null;
  const isVisible = !loading && !data.dismissed && !isComplete;

  return {
    steps: data.steps,
    completedCount,
    totalSteps,
    isComplete,
    isVisible,
    loading,
    completeStep,
    dismiss,
  };
}
