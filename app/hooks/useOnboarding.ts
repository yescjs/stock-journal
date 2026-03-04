'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

const GUEST_ONBOARDING_KEY = 'stock-journal-guest-onboarding-v1';

export interface OnboardingSteps {
  firstTrade: boolean;
  buySellCycle: boolean;
  emotionTag: boolean;
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
  emotionTag: false,
  visitAnalysis: false,
  aiReport: false,
};

const DEFAULT_ONBOARDING: OnboardingData = {
  steps: DEFAULT_STEPS,
  completedAt: null,
  dismissed: false,
};

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
              steps: { ...DEFAULT_STEPS, ...(row.steps as Partial<OnboardingSteps>) },
              completedAt: row.completed_at,
              dismissed: false,
            });
          }
        } else {
          const stored = localStorage.getItem(GUEST_ONBOARDING_KEY);
          if (stored && mounted) {
            setData(JSON.parse(stored));
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
  const isVisible = !data.dismissed && !isComplete;

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
