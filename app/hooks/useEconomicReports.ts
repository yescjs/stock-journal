import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { DailyEconomicReport, UserPreferences } from '@/app/types/economicReports';

const GUEST_REPORTS_KEY = 'stock-journal-guest-economic-reports-v1';
const GUEST_PREFERENCES_KEY = 'stock-journal-guest-preferences-v1';

interface UseEconomicReportsReturn {
  reports: DailyEconomicReport[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (reportId: string) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  refreshReports: () => Promise<void>;
  generateManualReport: () => Promise<DailyEconomicReport | null>;
}

export function useEconomicReports(user: User | null): UseEconomicReportsReturn {
  const [reports, setReports] = useState<DailyEconomicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 보고서 불러오기
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (user) {
        // 로그인 사용자: Supabase에서 조회
        const { data, error: fetchError } = await supabase
          .from('daily_economic_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('report_date', { ascending: false })
          .limit(30);

        if (fetchError) {
          throw fetchError;
        }

        setReports(data as DailyEconomicReport[] || []);
      } else {
        // 게스트: LocalStorage에서 조회
        const saved = localStorage.getItem(GUEST_REPORTS_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setReports(parsed);
          } catch {
            setReports([]);
          }
        } else {
          setReports([]);
        }
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('경제 보고서를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 초기 로드
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // 게스트 모드 저장
  useEffect(() => {
    if (!user && !loading) {
      localStorage.setItem(GUEST_REPORTS_KEY, JSON.stringify(reports));
    }
  }, [reports, user, loading]);

  // 읽음 표시
  const markAsRead = async (reportId: string) => {
    try {
      if (user) {
        // Supabase 업데이트
        const { error: updateError } = await supabase
          .from('daily_economic_reports')
          .update({ is_read: true })
          .eq('id', reportId)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      // 로컬 상태 업데이트
      setReports(prev =>
        prev.map(report =>
          report.id === reportId ? { ...report, is_read: true } : report
        )
      );
    } catch (err) {
      console.error('Error marking report as read:', err);
    }
  };

  // 보고서 삭제
  const deleteReport = async (reportId: string) => {
    try {
      if (user) {
        // Supabase 삭제
        const { error: deleteError } = await supabase
          .from('daily_economic_reports')
          .delete()
          .eq('id', reportId)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }
      }

      // 로컬 상태 업데이트
      setReports(prev => prev.filter(report => report.id !== reportId));
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  // 수동 보고서 생성 (테스트/즉시 생성용)
  const generateManualReport = async (): Promise<DailyEconomicReport | null> => {
    if (!user) {
      // 게스트 모드에서는 API 호출 불가
      return null;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/cron/generate-economic-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate report');
      }

      const result = await response.json();
      
      if (result.success && result.report) {
        // 생성된 보고서를 목록에 추가 (중복 방지)
        setReports(prev => {
          if (prev.some((report) => report.id === result.report.id)) {
            return prev;
          }
          return [result.report, ...prev];
        });
        return result.report;
      }

      return null;
    } catch (err) {
      console.error('Error generating manual report:', err);
      setError('보고서 생성에 실패했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 읽지 않은 보고서 개수
  const unreadCount = reports.filter(r => !r.is_read).length;

  return {
    reports,
    loading,
    error,
    unreadCount,
    markAsRead,
    deleteReport,
    refreshReports: loadReports,
    generateManualReport,
  };
}

// 사용자 설정 관리 훅
interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

export function useUserPreferences(user: User | null): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      // 게스트: LocalStorage에서 기본값 사용
      const saved = localStorage.getItem(GUEST_PREFERENCES_KEY);
      if (saved) {
        try {
          setPreferences(JSON.parse(saved));
        } catch {
          setDefaultGuestPreferences();
        }
      } else {
        setDefaultGuestPreferences();
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      if (data) {
        setPreferences(data as UserPreferences);
      } else {
        // 기본 설정 생성
        const defaultPrefs: Partial<UserPreferences> = {
          enable_daily_report: true,
          report_time: '09:00',
          preferred_sources: ['naver', 'yahoo', 'bloomberg'],
        };

        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert([{ ...defaultPrefs, user_id: user.id }])
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setPreferences(newPrefs as UserPreferences);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setDefaultGuestPreferences = () => {
    setPreferences({
      enable_daily_report: true,
      report_time: '09:00',
      preferred_sources: ['naver', 'yahoo', 'bloomberg'],
    });
  };

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    try {
      if (user) {
        // Supabase 업데이트
        const { error } = await supabase
          .from('user_preferences')
          .update(prefs)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }
      } else {
        // 게스트: LocalStorage 업데이트
        localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify({
          ...preferences,
          ...prefs,
        }));
      }

      // 로컬 상태 업데이트
      setPreferences(prev => prev ? { ...prev, ...prefs } : null);
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
  };
}
