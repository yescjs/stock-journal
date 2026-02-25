// POST /api/ai-analysis
// Generates AI-powered trading analysis reports using Google Gemini API
import { NextRequest, NextResponse } from 'next/server';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';

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

const SYSTEM_PROMPT = `당신은 월스트리트 헤지펀드에서 10년 이상 트레이딩 코치로 활동한 전문 투자 코치입니다.
사용자의 매매 데이터를 심층 분석하고, 전문적이고 실행 가능한 피드백을 한국어로 제공합니다.

반드시 지켜야 할 규칙:
1. 응답은 항상 **마크다운** 형식으로, 볼드/이탤릭을 활용하여 가독성 높게 작성합니다
2. 이모지(이모티콘)는 **## 레벨의 대분류 헤딩에만** 사용하고, 그 외 본문 내용(리스트 항목, 문장 중간 등)에서는 이모지를 절대 사용하지 않습니다
3. 분석은 데이터에 근거해야 하며, 데이터가 없는 부분은 추측하지 않습니다
4. 긍정적인 점과 개선이 필요한 점을 균형 있게 제시하되, 구체적 근거를 반드시 함께 제시합니다
5. 승률, 수익률, 수익 팩터 등 핵심 수치를 적극 인용하고, 해당 수치의 의미를 해석해줍니다
6. 투자 권유나 특정 종목 추천은 절대 하지 않습니다
7. 정중한 존댓말을 사용하면서도 프로페셔널한 톤을 유지합니다
8. 응답은 1500-2500자 분량으로 충분히 상세하게 작성합니다
9. 각 섹션에서 단순 수치 나열이 아니라 "왜 그런지", "어떻게 개선할 수 있는지"를 분석적으로 설명합니다
10. 업계 용어(수익 팩터, 최대 낙폭, 손익비 등)를 사용하되 괄호 안에 쉬운 설명을 병기합니다`;

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

  return `다음 완결된 매매 1건에 대한 전문 투자 코치의 상세한 거래 리뷰를 작성해주세요.

## 거래 정보
- 종목: ${roundTrip.symbolName || roundTrip.symbol}
- 매수일: ${roundTrip.entryDate} / 매수가: ${roundTrip.entryPrice.toLocaleString()}
- 매도일: ${roundTrip.exitDate} / 매도가: ${roundTrip.exitPrice.toLocaleString()}
- 보유 기간: ${holding}
- 결과: ${result} (${roundTrip.pnlPercent >= 0 ? '+' : ''}${roundTrip.pnlPercent.toFixed(2)}%, ${roundTrip.pnl >= 0 ? '+' : ''}${roundTrip.pnl.toLocaleString()}원)
${roundTrip.emotionTag ? `- 진입 심리: ${roundTrip.emotionTag}` : ''}
${roundTrip.strategyName ? `- 적용 전략: ${roundTrip.strategyName}` : ''}

다음 구조로 400-600자 분량의 전문적인 리뷰를 작성해주세요.
이모지는 아래 섹션 제목에만 사용하고 본문에는 사용하지 마세요:

## 📋 한 줄 평
(이 거래를 핵심 한 문장으로 평가)

## ✅ 잘한 점
(진입 타이밍, 보유 기간, 리스크 관리 등에서 잘한 부분을 구체적으로 분석)

## ⚠️ 개선 포인트
(2-3가지, 각각 구체적인 이유와 함께 제시)

## 🎯 다음 거래 제안
(이 거래 경험을 바탕으로 다음에 적용할 수 있는 액션 1-2가지)`;
}

// ─── Mock Report Builder (when GEMINI_API_KEY is not set) ────────────────

function buildMockReport(body: AIAnalysisRequest): string {
  if (body.type === 'weekly_report') {
    const { profile, insights } = body.analysis;
    const insightList = insights.slice(0, 3).map(i => `- ${i.icon} **${i.title}**: ${i.description}`).join('\n');

    return `## 📊 매매 성과 요약

> ⚠️ **Mock 모드**: Gemini API 키가 설정되지 않아 샘플 리포트가 생성되었습니다.

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
*이 리포트는 Mock 데이터입니다. 실제 AI 분석을 받으려면 \`.env.local\`에 \`GEMINI_API_KEY\`를 설정하세요.*`;
  } else {
    const { roundTrip } = body;
    const result = roundTrip.isWin ? '수익' : '손실';

    return `> ⚠️ **Mock 모드**: Gemini API 키 미설정

**한 줄 평**: ${roundTrip.symbolName || roundTrip.symbol} ${result} 거래 — ${roundTrip.pnlPercent >= 0 ? '+' : ''}${roundTrip.pnlPercent.toFixed(2)}% (${roundTrip.holdingDays}일 보유)

**잘한 점**: ${roundTrip.isWin ? '목표 수익률에 도달하여 정리한 판단력이 좋습니다.' : '손실을 인정하고 정리한 리스크 관리가 적절합니다.'}

**개선 포인트**: ${roundTrip.emotionTag ? `진입 심리(${roundTrip.emotionTag})를 고려하여` : ''} 다음 거래에서는 사전에 목표가와 손절가를 설정해보세요.

---
*Mock 리포트입니다. 실제 AI 리뷰는 GEMINI_API_KEY 설정 후 이용 가능합니다.*`;
  }
}

// ─── Gemini API 호출 ─────────────────────────────────────────────────────

// 우선순위 순서: 첫 번째 모델 실패 시 다음 모델로 자동 폴백
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

async function callGeminiAPI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

  const requestBody = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
    },
  });

  let lastError: Error | null = null;

  // 각 모델에 대해 최대 2회 재시도 (지수 백오프)
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          // 재시도 시 대기 (1초, 2초)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });

        if (response.status === 503 || response.status === 429) {
          // 서비스 일시 불가 또는 속도 제한 — 재시도 또는 다음 모델로
          const errorBody = await response.text();
          console.warn(`Gemini ${model} (attempt ${attempt + 1}): ${response.status} — ${errorBody.slice(0, 200)}`);
          lastError = new Error(`Gemini ${model}: ${response.status}`);
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Gemini ${model} error:`, errorBody);
          lastError = new Error(`Gemini API 요청 실패 (${response.status})`);
          break; // 4xx 등 다른 에러는 재시도 불필요, 다음 모델로
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = new Error('Gemini API에서 유효한 응답을 받지 못했습니다.');
          break;
        }

        console.log(`✅ Gemini 응답 성공: ${model} (attempt ${attempt + 1})`);
        return text;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini ${model} network error (attempt ${attempt + 1}):`, lastError.message);
      }
    }
    // 현재 모델 실패 — 다음 모델 시도
    console.warn(`⚠ ${model} 실패, 다음 모델로 폴백...`);
  }

  throw lastError ?? new Error('모든 Gemini 모델 호출에 실패했습니다.');
}

// ─── Route Handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<AIAnalysisResponse | { error: string }>> {
  try {
    const body = (await req.json()) as AIAnalysisRequest;

    // Mock mode: API 키가 설정되지 않은 경우 샘플 리포트 반환
    if (!process.env.GEMINI_API_KEY) {
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

    const report = await callGeminiAPI(SYSTEM_PROMPT, userPrompt);

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
