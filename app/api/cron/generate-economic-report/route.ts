import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews, filterYesterdayNews } from '@/app/utils/newsCollector';
import { analyzeEconomicNews, createFallbackReport } from '@/app/utils/aiAnalyzer';
import { DailyEconomicReport } from '@/app/types/economicReports';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Supabase Admin Client (서버에서 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

function serializeReport(report: DailyEconomicReport) {
  return JSON.parse(
    JSON.stringify(report, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))
  );
}

function toSafeReport(report: DailyEconomicReport) {
  return {
    id: report.id,
    user_id: report.user_id,
    report_date: report.report_date,
    title: report.title,
    summary: report.summary,
    korean_news: report.korean_news,
    global_news: report.global_news,
    key_issues: report.key_issues,
    market_sentiment: report.market_sentiment,
    ai_generated: report.ai_generated,
    is_read: report.is_read,
    created_at: report.created_at,
    updated_at: report.updated_at,
  };
}

/**
 * 사용자 목록 가져오기 (daily report 활성화된 사용자만)
 */
async function getActiveUsers(): Promise<{ user_id: string }[]> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id')
      .eq('enable_daily_report', true);

    if (error) {
      console.error('Error fetching active users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching active users:', error);
    return [];
  }
}

/**
 * 단일 사용자를 위한 보고서 생성
 */
async function generateReportForUser(
  userId: string
): Promise<DailyEconomicReport | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return null;
  }

  try {
    console.log('[EconomicReport] Generate start', { userId });
    // 1. 뉴스 수집
    const { korean, global } = await fetchAllNews();
    console.log('[EconomicReport] News collected', { korean: korean.length, global: global.length });

    // 2. 어제 날짜 뉴스 필터링
    const yesterdayKorean = filterYesterdayNews(korean);
    const yesterdayGlobal = filterYesterdayNews(global);
    console.log('[EconomicReport] Yesterday filter', {
      korean: yesterdayKorean.items.length,
      global: yesterdayGlobal.items.length,
      date: yesterdayKorean.date.toISOString().split('T')[0],
    });

    // 3. 뉴스가 없으면 전체 사용
    const koreanNews = yesterdayKorean.items.length > 0 
      ? yesterdayKorean.items 
      : korean.slice(0, 15);
    const globalNews = yesterdayGlobal.items.length > 0 
      ? yesterdayGlobal.items 
      : global.slice(0, 15);

    const reportDate = yesterdayKorean.date;

    // 4. AI 분석
    let reportData = await analyzeEconomicNews(koreanNews, globalNews, reportDate);
    console.log('[EconomicReport] AI analysis', { success: !!reportData });

    // 5. AI 분석 실패 시 Fallback 사용
    if (!reportData) {
      reportData = createFallbackReport(koreanNews, globalNews, reportDate);
      console.log('[EconomicReport] Fallback report used');
    }

    // 6. 사용자 ID 추가
    reportData.user_id = userId;

    // 7. 중복 확인 (이미 생성된 보고서가 있는지)
    const { data: existingReport, error: existingError } = await supabaseAdmin
      .from('daily_economic_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('report_date', reportData.report_date)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[EconomicReport] Existing report check failed', existingError);
      return null;
    }

    if (existingReport) {
      console.log(`Report already exists for user ${userId} on ${reportData.report_date}`);
      return existingReport as DailyEconomicReport;
    }

    // 8. Supabase에 저장
    const { data: savedReport, error } = await supabaseAdmin
      .from('daily_economic_reports')
      .insert([reportData])
      .select()
      .single();

    if (error) {
      console.error('[EconomicReport] Error saving report', error);
      return null;
    }

    console.log('[EconomicReport] Report saved', { reportId: savedReport?.id });
    return savedReport as DailyEconomicReport;
  } catch (error) {
    console.error(`[EconomicReport] Error generating report for user ${userId}:`, error);
    return null;
  }
}

/**
 * GET: 보고서 생성 요청 수동 트리거 (테스트용)
 */
export async function GET(request: NextRequest) {
  try {
    // Authorization 확인 (선택적)
    const authHeader = request.headers.get('authorization');
    const isCron = request.headers.get('x-vercel-cron') === 'true';
    
    // Vercel Cron이거나 특정 토큰으로 인증된 경우에만 실행
    if (!isCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 활성 사용자 목록 가져오기
    const activeUsers = await getActiveUsers();

    if (activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users found',
        generated: [],
      });
    }

    // 각 사용자별 보고서 생성
    const results = await Promise.all(
      activeUsers.map(async (user) => {
        const report = await generateReportForUser(user.user_id);
        return {
          user_id: user.user_id,
          success: !!report,
          report_id: report?.id,
        };
      })
    );

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount}/${results.length} reports`,
      generated: results,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: 특정 사용자를 위한 보고서 수동 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[EconomicReport] Manual generate request', { userId });
    const report = await generateReportForUser(userId);

    if (!report) {
      console.error('[EconomicReport] Generate returned null, trying fallback fetch', { userId });
      if (supabaseAdmin) {
        const { data: latestReport, error: latestError } = await supabaseAdmin
          .from('daily_economic_reports')
          .select('*')
          .eq('user_id', userId)
          .order('report_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestError) {
          console.error('[EconomicReport] Fallback fetch failed', latestError);
        } else if (latestReport) {
          console.log('[EconomicReport] Fallback fetch succeeded', { id: latestReport.id });
          const safeReport = serializeReport(toSafeReport(latestReport as DailyEconomicReport));
          return NextResponse.json({
            success: true,
            report: safeReport,
            fallback: true,
          });
        }
      } else {
        console.error('[EconomicReport] Supabase admin client not initialized in POST');
      }

      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      );
    }

    console.log('[EconomicReport] Responding with report', { id: report.id });
    let safeReport: ReturnType<typeof toSafeReport>;
    try {
      safeReport = serializeReport(toSafeReport(report));
    } catch (error) {
      console.error('[EconomicReport] Report serialization failed', error);
      safeReport = toSafeReport(report);
    }

    return NextResponse.json({
      success: true,
      report: safeReport,
    });
  } catch (error) {
    console.error('[EconomicReport] Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
