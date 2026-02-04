import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews, filterYesterdayNews } from '@/app/utils/newsCollector';
import { analyzeEconomicNews, createFallbackReport } from '@/app/utils/aiAnalyzer';
import { DailyEconomicReport } from '@/app/types/economicReports';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Supabase Admin Client (서버에서 사용, 로그인 사용자 저장용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * POST: 보고서 생성 (게스트/로그인 모두 지원)
 * - userId가 있으면: 뉴스 수집 → AI 분석 → Supabase 저장 → 응답
 * - userId가 없으면: 뉴스 수집 → AI 분석 → 응답만 반환 (저장 안 함)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId: string | null = body.userId || null;

    // 1. 뉴스 수집
    const { korean, global } = await fetchAllNews();

    if (korean.length === 0 && global.length === 0) {
      return NextResponse.json(
        { error: '뉴스를 수집할 수 없습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    // 2. 어제 날짜 뉴스 필터링
    const yesterdayKorean = filterYesterdayNews(korean);
    const yesterdayGlobal = filterYesterdayNews(global);

    const koreanNews = yesterdayKorean.items.length > 0
      ? yesterdayKorean.items
      : korean.slice(0, 15);
    const globalNews = yesterdayGlobal.items.length > 0
      ? yesterdayGlobal.items
      : global.slice(0, 15);

    const reportDate = yesterdayKorean.items.length > 0
      ? yesterdayKorean.date
      : new Date();

    // 3. AI 분석
    let reportData = await analyzeEconomicNews(koreanNews, globalNews, reportDate);

    if (!reportData) {
      reportData = createFallbackReport(koreanNews, globalNews, reportDate);
    }

    // 4. 로그인 사용자: Supabase에 저장
    if (userId && supabaseAdmin) {
      reportData.user_id = userId;

      // 중복 확인
      const { data: existingReport } = await supabaseAdmin
        .from('daily_economic_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('report_date', reportData.report_date)
        .single();

      if (existingReport) {
        // 이미 존재하면 기존 보고서 반환
        const { data: existing } = await supabaseAdmin
          .from('daily_economic_reports')
          .select('*')
          .eq('id', existingReport.id)
          .single();

        return NextResponse.json({
          success: true,
          report: existing as DailyEconomicReport,
          cached: true,
        });
      }

      const { data: savedReport, error } = await supabaseAdmin
        .from('daily_economic_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) {
        console.error('Error saving report:', error);
        return NextResponse.json(
          { error: '보고서 저장에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        report: savedReport as DailyEconomicReport,
      });
    }

    // 5. 게스트 모드: 저장 없이 응답만 반환
    const guestReport: DailyEconomicReport = {
      id: `guest-report-${Date.now()}`,
      ...reportData,
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      title: reportData.title || '경제 일보',
      summary: reportData.summary || '',
      korean_news: reportData.korean_news || [],
      global_news: reportData.global_news || [],
      key_issues: reportData.key_issues || [],
      market_sentiment: reportData.market_sentiment || 'neutral',
      ai_generated: reportData.ai_generated ?? false,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      report: guestReport,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: '보고서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
