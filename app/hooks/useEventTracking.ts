'use client';

import { useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';

export function useEventTracking(user: User | null) {
  const track = useCallback(
    async (eventName: string, properties: Record<string, unknown> = {}) => {
      if (!user) return; // 게스트는 추적 안 함

      try {
        await supabase.from('user_events').insert({
          user_id: user.id,
          event_name: eventName,
          properties,
        });
      } catch (err) {
        // 추적 실패는 조용히 무시 (사용자 경험 영향 없도록)
        console.error('[analytics] track failed:', err);
      }
    },
    [user]
  );

  return { track };
}
