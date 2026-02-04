import { useState, useEffect } from 'react';
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
  const loadReports = async () => {
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
  };

  // 초기 로드
  useEffect(() => {
    loadReports();
  }, [user?.id]);

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

  // 수동 보고서 생성 (게스트/로그인 모두 지원)
  const generateManualReport = async (): Promise<DailyEconomicReport | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/economic-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id || null }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const result = await response.json();

      if (result.success && result.report) {
        const report = result.report as DailyEconomicReport;

        // id가 없으면 게스트용 id 할당
        if (!report.id) {
          report.id = `guest-report-${Date.now()}`;
        }

        // 이미 캐시된 보고서(중복)가 아닌 경우만 추가
        if (!result.cached) {
          setReports(prev => [report, ...prev]);
        }

        return report;
      }

      return null;
    } catch (err) {
      console.error('Error generating manual report:', err);
      const message = err instanceof Error ? err.message : '보고서 생성에 실패했습니다.';
      setError(message);
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

  const loadPreferences = async () => {
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
  };

  const setDefaultGuestPreferences = () => {
    setPreferences({
      enable_daily_report: true,
      report_time: '09:00',
      preferred_sources: ['naver', 'yahoo', 'bloomberg'],
    });
  };

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

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
