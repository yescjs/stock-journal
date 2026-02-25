// POST /api/ai-analysis
// Generates AI-powered trading analysis reports using OpenAI GPT-4o-mini
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';

// Initialize OpenAI client (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Request / Response Types ────────────────────────────────────────────

interface WeeklyReportRequest {
  type: 'weekly_report';
  analysis: TradeAnalysis;
  username?: string;
}

interface TradeReviewRequest {
  type: 'trade_review';
  roundTrip: RoundTrip;
}

type AIAnalysisRequest = WeeklyReportRequest | TradeReviewRequest;

interface AIAnalysisResponse {
  report: string;
  generatedAt: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 10년 이상의 경력을 가진 전문 투자 코치입니다.
사용자의 매매 데이터를 분석하고, 구체적이고 실행 가능한 피드백을 한국어로 제공합니다.

반드시 지켜야 할 규칙:
1. 응답은 항상 **마크다운** 형식으로 작성합니다
2. 분석은 데이터에 근거해야 하며, 데이터가 없는 부분은 추측하지 않습니다
3. 긍정적인 점과 개선이 필요한 점을 균형 있게 제시합니다
4. 구체적인 수치를 활용하여 설명합니다
5. 투자 권유나 특정 종목 추천은 절대 하지 않습니다
6. 반말이 아닌 정중한 존댓말을 사용합니다
7. 응답은 500-800자 분량으로 간결하게 작성합니다`;

// ─── Prompt Builders ─────────────────────────────────────────────────────

function buildWeeklyReportPrompt(req: WeeklyReportRequest): string {
  const { analysis, username } = req;
  const { profile, insights, weekdayStats, emotionStats, strategyStats, streaks } = analysis;

  // Find most meaningful weekday stat
  const topWeekday = [...weekdayStats]
    .filter(s => s.count >= 2)
    .sort((a, b) => b.winRate - a.winRate)[0];

  // Build emotion summary
  const emotionSummary = emotionStats
    .filter(s => s.count > 0)
    .map(s => `${s.label}: 승률 ${s.winRate.toFixed(0)}% (${s.count}건)`)
    .join(', ');

  // Build strategy summary
  const stratSummary = strategyStats
    .filter(s => s.count > 0 && s.label !== '전략 미설정')
    .slice(0, 3)
    .map(s => `${s.label}: 승률 ${s.winRate.toFixed(0)}%`)
    .join(', ');

  const insightTexts = insights.map(i => `- ${i.title}: ${i.description}`).join('\n');

  return `${username ? `투자자 ${username}의 ` : ''}매매 분석 리포트를 작성해주세요.

## 매매 데이터 요약
- 완결된 총 거래: ${profile.totalTrades}건
- 승률: ${profile.winRate.toFixed(1)}%
- 평균 수익률: ${profile.avgReturn >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%
- 수익 팩터: ${profile.profitFactor.toFixed(2)}
- 최대 낙폭: -${profile.maxDrawdownPercent.toFixed(1)}%
- 평균 보유 기간: ${profile.avgHoldingDays.toFixed(0)}일
- 투자 스타일: ${profile.tradingStyleLabel}
- 위험 수준: ${profile.riskLevelLabel}
- 종합 등급: ${profile.overallGrade}
- 현재 연승: ${streaks.currentWin}연승 / 연패: ${streaks.currentLoss}연패

## 패턴 분석
${topWeekday ? `- 최고 성과 요일: ${topWeekday.label} (승률 ${topWeekday.winRate.toFixed(0)}%, ${topWeekday.count}건)` : ''}
${emotionSummary ? `- 감정별 성과: ${emotionSummary}` : ''}
${stratSummary ? `- 전략별 성과: ${stratSummary}` : ''}

## 시스템이 발견한 패턴
${insightTexts || '- 아직 유의미한 패턴이 감지되지 않았습니다'}

위 데이터를 바탕으로 다음 구조로 리포트를 작성해주세요:

## 📊 매매 성과 요약

## 💡 주요 발견 사항

## ⚠️ 개선이 필요한 부분

## 🎯 실행 가능한 제안 (3가지, 구체적으로)`;
}

function buildTradeReviewPrompt(req: TradeReviewRequest): string {
  const { roundTrip } = req;
  const holding = roundTrip.holdingDays === 0
    ? '당일 거래'
    : `${roundTrip.holdingDays}일 보유`;
  const result = roundTrip.isWin ? '수익' : '손실';

  return `다음 완결된 매매 1건에 대한 코드 리뷰 스타일의 짧은 피드백을 작성해주세요.

## 거래 정보
- 종목: ${roundTrip.symbolName || roundTrip.symbol}
- 매수일: ${roundTrip.entryDate} / 매수가: ${roundTrip.entryPrice.toLocaleString()}
- 매도일: ${roundTrip.exitDate} / 매도가: ${roundTrip.exitPrice.toLocaleString()}
- 보유 기간: ${holding}
- 결과: ${result} (${roundTrip.pnlPercent >= 0 ? '+' : ''}${roundTrip.pnlPercent.toFixed(2)}%, ${roundTrip.pnl >= 0 ? '+' : ''}${roundTrip.pnl.toLocaleString()}원)
${roundTrip.emotionTag ? `- 진입 심리: ${roundTrip.emotionTag}` : ''}
${roundTrip.strategyName ? `- 적용 전략: ${roundTrip.strategyName}` : ''}

다음 구조로 200자 이내로 간결하게 작성해주세요:
**한 줄 평**: (이 거래를 한 문장으로 평가)
**잘한 점**: (있다면)  
**개선 포인트**: (구체적으로 1-2가지)`;
}

// ─── Mock Report Builder (when OPENAI_API_KEY is not set) ────────────────

function buildMockReport(body: AIAnalysisRequest): string {
  if (body.type === 'weekly_report') {
    const { profile, insights } = body.analysis;
    const insightList = insights.slice(0, 3).map(i => `- ${i.icon} **${i.title}**: ${i.description}`).join('\n');

    return `## 📊 매매 성과 요약

> ⚠️ **Mock 모드**: OpenAI API 키가 설정되지 않아 샘플 리포트가 생성되었습니다.

총 **${profile.totalTrades}건**의 완결 거래를 분석했습니다. 현재 승률은 **${profile.winRate.toFixed(1)}%**이며, 평균 수익률은 **${profile.avgReturn >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%**입니다. 종합 등급은 **${profile.overallGrade}**입니다.

## 💡 주요 발견 사항

${insightList || '- 아직 유의미한 패턴이 발견되지 않았습니다.'}

## ⚠️ 개선이 필요한 부분

- 수익 팩터(${profile.profitFactor.toFixed(2)})를 1.5 이상으로 높이기 위해 손절 기준을 명확히 설정하세요.
- 평균 보유 기간 **${profile.avgHoldingDays.toFixed(0)}일**이 투자 스타일(${profile.tradingStyleLabel})에 적합한지 점검하세요.

## 🎯 실행 가능한 제안

1. **매매 전 체크리스트 활용**: 모든 매매 전 체크리스트를 100% 완료한 후 진입하세요.
2. **감정 태그 기록**: 진입 시 심리 상태를 기록하여 감정적 매매 패턴을 파악하세요.
3. **손익비 개선**: 목표 수익률과 손절 기준을 사전에 설정하고 일관되게 적용하세요.

---
*이 리포트는 Mock 데이터입니다. 실제 AI 분석을 받으려면 \`.env.local\`에 \`OPENAI_API_KEY\`를 설정하세요.*`;
  } else {
    const { roundTrip } = body;
    const result = roundTrip.isWin ? '수익' : '손실';

    return `> ⚠️ **Mock 모드**: OpenAI API 키 미설정

**한 줄 평**: ${roundTrip.symbolName || roundTrip.symbol} ${result} 거래 — ${roundTrip.pnlPercent >= 0 ? '+' : ''}${roundTrip.pnlPercent.toFixed(2)}% (${roundTrip.holdingDays}일 보유)

**잘한 점**: ${roundTrip.isWin ? '목표 수익률에 도달하여 정리한 판단력이 좋습니다.' : '손실을 인정하고 정리한 리스크 관리가 적절합니다.'}

**개선 포인트**: ${roundTrip.emotionTag ? `진입 심리(${roundTrip.emotionTag})를 고려하여` : ''} 다음 거래에서는 사전에 목표가와 손절가를 설정해보세요.

---
*Mock 리포트입니다. 실제 AI 리뷰는 OPENAI_API_KEY 설정 후 이용 가능합니다.*`;
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<AIAnalysisResponse | { error: string }>> {
  try {
    const body = (await req.json()) as AIAnalysisRequest;

    // Mock mode: return sample report when API key is not configured
    if (!process.env.OPENAI_API_KEY) {
      const mockReport = buildMockReport(body);
      return NextResponse.json({
        report: mockReport,
        generatedAt: new Date().toISOString(),
      });
    }

    let userPrompt: string;
    if (body.type === 'weekly_report') {
      userPrompt = buildWeeklyReportPrompt(body);
    } else if (body.type === 'trade_review') {
      userPrompt = buildTradeReviewPrompt(body);
    } else {
      return NextResponse.json({ error: '알 수 없는 요청 타입입니다.' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const report = completion.choices[0]?.message?.content ?? '리포트 생성에 실패했습니다.';

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI analysis error:', err);
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
