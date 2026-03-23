// POST /api/ai-analysis
// Generates AI-powered trading analysis reports using Google Gemini API
import { NextRequest, NextResponse } from 'next/server';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';
import { COIN_COSTS, CHAT_QA_FREE_DAILY } from '@/app/types/coins';
import { getAuthUser, createAuthedClient } from '@/app/lib/supabaseServerAuth';

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

interface PreTradeCoachRequest {
  type: 'pre_trade_coach';
  analysis: TradeAnalysis;
  symbol: string;
  side: string;
}

interface ChatQARequest {
  type: 'chat_qa';
  analysis: TradeAnalysis;
  question: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
}

interface BaseRequest {
  locale?: string;
}

type AIAnalysisRequest = (WeeklyReportRequest | TradeReviewRequest | PreTradeCoachRequest | ChatQARequest) & BaseRequest;

interface AIAnalysisResponse {
  report: string;
  generatedAt: string;
  /** For chat_qa: how many free questions used today (including this one) */
  chatQaDailyUsed?: number;
  /** For chat_qa: daily free limit */
  chatQaDailyLimit?: number;
  /** For chat_qa: true if this question was free (no coin charged) */
  wasFree?: boolean;
}

// ─── System Prompts ──────────────────────────────────────────────────────

const SYSTEM_PROMPT_KO = `당신은 월스트리트 헤지펀드에서 10년 이상 트레이딩 코치로 활동한 전문 투자 코치입니다.
사용자의 매매 데이터를 심층 분석하고, 전문적이고 실행 가능한 피드백을 한국어로 제공합니다.

반드시 지켜야 할 규칙:
1. 응답은 항상 **마크다운** 형식으로, 볼드/이탤릭을 활용하여 가독성 높게 작성합니다
2. 이모지(이모티콘)는 **## 레벨의 대분류 헤딩에만** 사용하고, 그 외 본문 내용(리스트 항목, 문장 중간 등)에서는 이모지를 절대 사용하지 않습니다
3. 분석은 데이터에 근거해야 하며, 데이터가 없는 부분은 추측하지 않습니다
4. 긍정적인 점과 개선이 필요한 점을 균형 있게 제시하되, 구체적 근거를 반드시 함께 제시합니다
5. 승률, 수익률, 수익 팩터, R:R 비율, Expectancy 등 핵심 수치를 적극 인용하고 의미를 해석합니다
6. 투자 권유나 특정 종목 추천은 절대 하지 않습니다
7. 정중한 존댓말을 사용하면서도 프로페셔널한 톤을 유지합니다
8. 응답은 2000-3000자 분량으로 충분히 상세하게 작성합니다
9. 각 섹션에서 단순 수치 나열이 아니라 "왜 그런지", "어떻게 개선할 수 있는지"를 분석적으로 설명합니다
10. 업계 용어(수익 팩터, 최대 낙폭, 손익비, Expectancy 등)를 사용하되 괄호 안에 쉬운 설명을 병기합니다
11. 체크리스트 섹션(## ✅ 다음 거래 전 체크리스트)은 반드시 \`- [ ]\` 형식의 마크다운 체크박스로만 작성합니다
12. 체크리스트 각 항목에는 현재 수치를 괄호로 병기합니다. 예: \`- [ ] R:R 1.5 이상 확인 (현재 R:R: 0.8, 목표: 1.5)\``;

const SYSTEM_PROMPT_EN = `You are a professional trading coach with 10+ years of experience at Wall Street hedge funds.
You analyze users' trading data in depth and provide professional, actionable feedback in English.

Rules you must follow:
1. Always respond in **markdown** format, using bold/italic for readability
2. Use emojis **only in ## level section headings**, never in body text (list items, mid-sentence, etc.)
3. Analysis must be data-driven; do not speculate where data is missing
4. Present strengths and areas for improvement in a balanced manner, always citing specific evidence
5. Actively reference and interpret key metrics: win rate, return, profit factor, R:R ratio, Expectancy
6. Never recommend specific stocks or make investment recommendations
7. Maintain a professional yet approachable tone
8. Write detailed responses of 2000-3000 characters
9. In each section, explain "why" and "how to improve" rather than simply listing numbers
10. Use industry terms (profit factor, max drawdown, risk-reward ratio, Expectancy) with brief explanations in parentheses
11. The checklist section (## ✅ Pre-Trade Checklist) must use \`- [ ]\` markdown checkbox format only
12. Each checklist item should include current metrics in parentheses. Example: \`- [ ] Confirm R:R ≥ 1.5 (Current R:R: 0.8, Target: 1.5)\``;

function getSystemPrompt(locale?: string): string {
  return locale === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_KO;
}

// ─── Prompt Builders ─────────────────────────────────────────────────────

function buildWeeklyReportPrompt(req: WeeklyReportRequest): string {
  const { analysis, username } = req;
  const { profile, insights, weekdayStats, emotionStats, strategyStats, streaks, holdingPeriodStats, concentration, advancedMetrics } = analysis;
  const { rrRatio, expectancy, volatility, sharpeProxy, biasScore, timing, rrRatioBenchmark, expectancyBenchmark } = advancedMetrics;

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

  // Build holding period summary
  const holdingSummary = holdingPeriodStats
    .filter(s => s.count > 0)
    .map(s => `${s.label}: ${s.count}건, 승률 ${s.winRate.toFixed(0)}%, 평균수익 ${s.avgReturn.toFixed(1)}%`)
    .join('\n  ');

  // Build concentration summary
  const concentrationSummary = concentration.length > 0
    ? concentration.slice(0, 3).map(c => `${c.symbolName || c.symbol}: ${c.percentage.toFixed(0)}%${c.isRisky ? ' (위험)' : ''}`).join(', ')
    : '보유 포지션 없음';

  const insightTexts = insights.map(i => `- ${i.title}: ${i.description}`).join('\n');

  return `${username ? `투자자 ${username}의 ` : ''}매매 분석 리포트를 작성해주세요.

## 기본 성과 지표
- 완결된 총 거래: ${profile.totalTrades}건
- 승률: ${profile.winRate.toFixed(1)}%
- 평균 수익률: ${profile.avgReturn >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%
- 수익 팩터: ${profile.profitFactor.toFixed(2)}
- 최대 낙폭: -${profile.maxDrawdownPercent.toFixed(1)}%
- 평균 보유 기간: ${profile.avgHoldingDays.toFixed(0)}일
- 일관성 점수: ${profile.consistencyScore.toFixed(0)}/100
- 투자 스타일: ${profile.tradingStyleLabel}
- 위험 수준: ${profile.riskLevelLabel}
- 종합 등급: ${profile.overallGrade}
- 현재 연승: ${streaks.currentWin}연승 / 연패: ${streaks.currentLoss}연패

## 고급 지표 (Advanced Metrics)
- R:R 비율 (손익비): ${rrRatio.toFixed(2)} → 평가: ${rrRatioBenchmark} (excellent≥2.0, good≥1.5, fair≥1.0, poor<1.0)
- Expectancy (기대값): ${expectancy.toFixed(2)}% → ${expectancyBenchmark} (양수 = 장기 수익 기대 가능)
- 수익률 변동성: ${volatility.toFixed(2)}%
- Sharpe 유사지표: ${sharpeProxy.toFixed(2)}
- 심리 편향 점수: ${biasScore.biasScore.toFixed(0)}/100 (높을수록 규율 양호)
  - FOMO 비율: ${(biasScore.fomoRatio * 100).toFixed(0)}%
  - 복수매매(REVENGE) 비율: ${(biasScore.revengeRatio * 100).toFixed(0)}%
  - 충동매매(IMPULSE) 비율: ${(biasScore.impulsiveRatio * 100).toFixed(0)}%
  - 과매매 발생일(3건 이상): ${biasScore.overTradingDays}일
  - 손실 직후 재진입 횟수: ${biasScore.consecutiveLossEntry}회

## 타이밍 분석
- 수익 거래 평균 보유일: ${timing.avgWinHoldingDays.toFixed(1)}일
- 손실 거래 평균 보유일: ${timing.avgLossHoldingDays.toFixed(1)}일
- 보유 우위(holdingEdge): ${timing.holdingEdge >= 0 ? '+' : ''}${timing.holdingEdge.toFixed(1)}일 (양수 = 손절이 더 빠름)
- 조기 청산 비율: ${(timing.earlyExitRatio * 100).toFixed(0)}%

## 보유 기간별 성과
  ${holdingSummary || '데이터 없음'}

## 포트폴리오 집중도
- ${concentrationSummary}

## 패턴 분석
${topWeekday ? `- 최고 성과 요일: ${topWeekday.label} (승률 ${topWeekday.winRate.toFixed(0)}%, ${topWeekday.count}건)` : ''}
${emotionSummary ? `- 감정별 성과: ${emotionSummary}` : ''}
${stratSummary ? `- 전략별 성과: ${stratSummary}` : ''}

## 시스템이 발견한 패턴
${insightTexts || '- 아직 유의미한 패턴이 감지되지 않았습니다'}

위 데이터를 바탕으로 다음 7개 섹션으로 리포트를 작성해주세요. 각 섹션에서 제공된 수치를 직접 인용하여 분석하세요:

## 📊 핵심 성과 지표 (업계 기준 대비 평가)
R:R 비율, Expectancy, 수익 팩터, Sharpe 유사지표를 업계 기준과 비교 평가하세요.

## 🧠 심리 패턴 진단
감지된 행동 편향(FOMO/복수매매/충동매매/과매매)을 구체적 거래 패턴 데이터와 연결하여 설명하세요.

## ⚖️ 리스크 관리 평가
손절 준수 현황, 포트폴리오 집중도 위험, 연패 패턴을 분석하세요.

## ⏱️ 타이밍 능력 분석
수익/손실 거래의 보유기간 차이, 조기청산 패턴을 분석하세요.

## 🏆 이번 기간 잘한 점 (2-3가지, 반드시 구체적인 데이터 수치 근거 포함)

## ⚠️ 핵심 개선 포인트 (2-3가지, 반드시 구체적인 수치 포함)

## ✅ 다음 거래 전 체크리스트
이 투자자의 약점과 데이터를 기반으로 한 개인 맞춤 5가지 체크리스트.
반드시 마크다운 체크박스(- [ ] 항목) 형식으로만 작성.
각 항목에 현재 수치를 괄호로 병기.
예: - [ ] R:R 1.5 이상 확인 (현재 R:R: 0.8, 목표: 1.5)`;
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

// ─── Pre-Trade Coach Prompt ──────────────────────────────────────────────

function buildPreTradeCoachPrompt(req: PreTradeCoachRequest & BaseRequest): string {
  const { analysis, symbol, side, locale } = req;
  const { profile, advancedMetrics, emotionStats, weekdayStats, streaks } = analysis;
  const today = new Date();
  const isEn = locale === 'en';

  const weekdayKo = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
  const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()];

  const weekdayStat = weekdayStats.find(s => s.label === `${weekdayKo}요일`);
  const emotionSummary = emotionStats
    .filter(s => s.count > 0)
    .map(s => isEn
      ? `${s.label}: Win rate ${s.winRate.toFixed(0)}% (${s.count} trades)`
      : `${s.label}: 승률 ${s.winRate.toFixed(0)}% (${s.count}건)`)
    .join(', ');

  if (isEn) {
    return `The trader is about to ${side === 'BUY' ? 'buy' : 'sell'} ${symbol}.
Based on past trading data, create a pre-entry checklist.

## Trader Profile
- Total closed trades: ${profile.totalTrades}
- Win rate: ${profile.winRate.toFixed(1)}%
- R:R ratio: ${advancedMetrics.rrRatio.toFixed(2)}
- Current win streak: ${streaks.currentWin} / Current loss streak: ${streaks.currentLoss}
- Bias score: ${advancedMetrics.biasScore.biasScore.toFixed(0)}/100
- FOMO ratio: ${(advancedMetrics.biasScore.fomoRatio * 100).toFixed(0)}%
- Impulse trade ratio: ${(advancedMetrics.biasScore.impulsiveRatio * 100).toFixed(0)}%

## Today
- Day: ${weekdayEn}
${weekdayStat ? `- ${weekdayEn} win rate: ${weekdayStat.winRate.toFixed(0)}% (${weekdayStat.count} trades)` : ''}

## Performance by Emotion
${emotionSummary || 'No data'}

Write **exactly 3** checklist items.

Rules:
1. Use markdown checkbox (\`- [ ]\`) format
2. Each item must be a **short question under 15 words** (e.g., "Have you set a stop-loss?")
3. Include one supporting metric in parentheses (e.g., "(current win rate 42%)")
4. Use plain language, not jargon (R:R → risk-reward, Expectancy → expected return)
5. Do not use emojis
6. Focus on the trader's **3 weakest areas**

Example:
- [ ] Have you set a stop-loss? (avg loss -3.2%)
- [ ] Is this not an impulse trade? (recent impulse ratio 25%)
- [ ] Have you traded too much today? (overtrading 3 days)

Output only the checklist. No explanations or greetings.`;
  }

  return `투자자가 ${symbol} 종목을 ${side === 'BUY' ? '매수' : '매도'}하려고 합니다.
과거 매매 데이터를 바탕으로 진입 전 체크리스트를 작성해주세요.

## 투자자 프로필
- 총 완결 거래: ${profile.totalTrades}건
- 승률: ${profile.winRate.toFixed(1)}%
- R:R 비율: ${advancedMetrics.rrRatio.toFixed(2)}
- 현재 연승: ${streaks.currentWin} / 현재 연패: ${streaks.currentLoss}
- 편향 점수: ${advancedMetrics.biasScore.biasScore.toFixed(0)}/100
- FOMO 비율: ${(advancedMetrics.biasScore.fomoRatio * 100).toFixed(0)}%
- 충동매매 비율: ${(advancedMetrics.biasScore.impulsiveRatio * 100).toFixed(0)}%

## 오늘 정보
- 요일: ${weekdayKo}요일
${weekdayStat ? `- ${weekdayKo}요일 승률: ${weekdayStat.winRate.toFixed(0)}% (${weekdayStat.count}건)` : ''}

## 감정별 성과
${emotionSummary || '데이터 없음'}

**정확히 3개**의 체크리스트를 작성하세요.

작성 규칙:
1. 마크다운 체크박스(\`- [ ]\`) 형식
2. 각 항목은 **한 줄, 15자 이내**의 짧은 질문형으로 작성 (예: "손절가 정했나요?")
3. 괄호 안에 판단 근거가 되는 수치 1개만 병기 (예: "(현재 승률 42%)")
4. 전문 용어 대신 일상 언어 사용 (R:R → 손익비, Expectancy → 기대수익)
5. 이모지 사용 금지
6. 이 투자자의 **가장 약한 부분** 3가지에 집중

예시:
- [ ] 손절가 정했나요? (평균 손실 -3.2%)
- [ ] 충동 매매 아닌가요? (최근 충동 비율 25%)
- [ ] 오늘 너무 많이 거래하진 않았나요? (과매매 3일)

체크리스트만 출력하세요. 다른 설명이나 인사는 생략하세요.`;
}

// ─── Chat QA Prompt ─────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT_KO = `당신은 개인 트레이딩 데이터 분석가입니다.
사용자의 매매 데이터를 기반으로 질문에 정확하고 간결하게 답변합니다.

규칙:
1. 데이터에 근거해 답변하세요. 추측하지 마세요.
2. 답변은 마크다운 형식으로, 표나 수치를 적극 활용하세요.
3. 200-500자 분량으로 간결하게 답변하세요.
4. 투자 권유나 특정 종목 추천은 하지 않습니다.
5. 이모지는 사용하지 마세요.
6. 존댓말을 사용하세요.`;

const CHAT_SYSTEM_PROMPT_EN = `You are a personal trading data analyst.
You answer questions accurately and concisely based on the user's trading data.

Rules:
1. Base your answers on the data. Do not speculate.
2. Use markdown format with tables and numbers where helpful.
3. Keep answers concise (200-500 characters).
4. Do not recommend investments or specific stocks.
5. Do not use emojis.
6. Respond in English.`;

function getChatSystemPrompt(locale?: string): string {
  return locale === 'en' ? CHAT_SYSTEM_PROMPT_EN : CHAT_SYSTEM_PROMPT_KO;
}

function buildChatQAPrompt(req: ChatQARequest, locale?: string): string {
  const { analysis, question } = req;
  const { profile, advancedMetrics, weekdayStats, emotionStats, strategyStats, streaks, holdingPeriodStats } = analysis;
  const isEn = locale === 'en';

  const unitLabel = isEn ? 'trades' : '건';
  const winRateLabel = isEn ? 'Win rate' : '승률';
  const avgReturnLabel = isEn ? 'Avg return' : '평균수익';
  const noData = isEn ? 'No data' : '데이터 없음';

  const emotionSummary = emotionStats
    .filter(s => s.count > 0)
    .map(s => `${s.label}: ${winRateLabel} ${s.winRate.toFixed(0)}% (${s.count}${unitLabel}, ${avgReturnLabel} ${s.avgReturn.toFixed(1)}%)`)
    .join('\n  ');

  const strategySummary = strategyStats
    .filter(s => s.count > 0)
    .map(s => `${s.label}: ${winRateLabel} ${s.winRate.toFixed(0)}% (${s.count}${unitLabel}, ${avgReturnLabel} ${s.avgReturn.toFixed(1)}%)`)
    .join('\n  ');

  const weekdaySummary = weekdayStats
    .filter(s => s.count > 0)
    .map(s => `${s.label}: ${winRateLabel} ${s.winRate.toFixed(0)}% (${s.count}${unitLabel})`)
    .join(', ');

  const holdingSummary = holdingPeriodStats
    .filter(s => s.count > 0)
    .map(s => `${s.label}: ${winRateLabel} ${s.winRate.toFixed(0)}% (${s.count}${unitLabel}, ${avgReturnLabel} ${s.avgReturn.toFixed(1)}%)`)
    .join('\n  ');

  if (isEn) {
    return `## Trader Data Summary
- Total closed trades: ${profile.totalTrades}
- Win rate: ${profile.winRate.toFixed(1)}%
- Average return: ${profile.avgReturn >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%
- Profit factor: ${profile.profitFactor.toFixed(2)}
- R:R ratio: ${advancedMetrics.rrRatio.toFixed(2)}
- Expectancy: ${advancedMetrics.expectancy.toFixed(2)}%
- Max drawdown: -${profile.maxDrawdownPercent.toFixed(1)}%
- Overall grade: ${profile.overallGrade}
- Trading style: ${profile.tradingStyleLabel}
- Current win streak: ${streaks.currentWin} / Loss streak: ${streaks.currentLoss}
- Bias score: ${advancedMetrics.biasScore.biasScore.toFixed(0)}/100

## Performance by Day of Week
  ${weekdaySummary || noData}

## Performance by Emotion
  ${emotionSummary || noData}

## Performance by Strategy
  ${strategySummary || noData}

## Performance by Holding Period
  ${holdingSummary || noData}

## Question
${question}`;
  }

  return `## 투자자 데이터 요약
- 총 완결 거래: ${profile.totalTrades}건
- 승률: ${profile.winRate.toFixed(1)}%
- 평균 수익률: ${profile.avgReturn >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%
- 수익 팩터: ${profile.profitFactor.toFixed(2)}
- R:R 비율: ${advancedMetrics.rrRatio.toFixed(2)}
- Expectancy: ${advancedMetrics.expectancy.toFixed(2)}%
- 최대 낙폭: -${profile.maxDrawdownPercent.toFixed(1)}%
- 종합 등급: ${profile.overallGrade}
- 투자 스타일: ${profile.tradingStyleLabel}
- 현재 연승: ${streaks.currentWin} / 연패: ${streaks.currentLoss}
- 편향 점수: ${advancedMetrics.biasScore.biasScore.toFixed(0)}/100

## 요일별 성과
  ${weekdaySummary || noData}

## 감정별 성과
  ${emotionSummary || noData}

## 전략별 성과
  ${strategySummary || noData}

## 보유 기간별 성과
  ${holdingSummary || noData}

## 질문
${question}`;
}

// ─── Mock Report Builder (when GEMINI_API_KEY is not set) ────────────────

function buildMockReport(body: AIAnalysisRequest): string {
  if (body.type === 'pre_trade_coach') {
    if (body.locale === 'en') {
      return `- [ ] Have you set a stop-loss? (Current R:R ${body.analysis.advancedMetrics.rrRatio.toFixed(1)})
- [ ] Is this not an impulse trade? (Discipline score ${body.analysis.advancedMetrics.biasScore.biasScore.toFixed(0)}/100)
- [ ] Have you traded too much today? (Overtrading ${body.analysis.advancedMetrics.biasScore.overTradingDays} days)

> Mock mode: Set GEMINI_API_KEY for personalized checklists.`;
    }
    return `- [ ] 손절가 정했나요? (현재 손익비 ${body.analysis.advancedMetrics.rrRatio.toFixed(1)})
- [ ] 충동 매매 아닌가요? (규율 점수 ${body.analysis.advancedMetrics.biasScore.biasScore.toFixed(0)}/100)
- [ ] 오늘 거래 횟수 괜찮나요? (과매매 ${body.analysis.advancedMetrics.biasScore.overTradingDays}일)

> Mock 모드: GEMINI_API_KEY 설정 후 맞춤형 체크리스트를 받을 수 있습니다.`;
  }

  if (body.type === 'chat_qa') {
    if (body.locale === 'en') {
      return `Analysis for your question: "${body.question}"

You currently have **${body.analysis.profile.totalTrades}** closed trades.
Win rate **${body.analysis.profile.winRate.toFixed(1)}%**, overall grade **${body.analysis.profile.overallGrade}**.

> Mock mode: Set GEMINI_API_KEY for detailed AI analysis.`;
    }
    return `질문: "${body.question}"에 대한 분석입니다.

현재 총 **${body.analysis.profile.totalTrades}건**의 완결 거래 데이터가 있습니다.
승률 **${body.analysis.profile.winRate.toFixed(1)}%**, 종합 등급 **${body.analysis.profile.overallGrade}**입니다.

> Mock 모드: GEMINI_API_KEY 설정 후 상세한 AI 분석을 받을 수 있습니다.`;
  }

  if (body.type === 'weekly_report') {
    const { profile, advancedMetrics } = body.analysis;
    const { rrRatio, expectancy, biasScore, timing } = advancedMetrics;

    return `## 📊 핵심 성과 지표 (업계 기준 대비 평가)

> ⚠️ **Mock 모드**: Gemini API 키가 설정되지 않아 샘플 리포트가 생성되었습니다.

총 **${profile.totalTrades}건**의 완결 거래를 분석했습니다. R:R 비율은 **${rrRatio.toFixed(2)}**로 업계 권장 기준(1.5 이상)${rrRatio >= 1.5 ? '을 충족합니다' : '에 미달합니다'}. Expectancy(기대값)는 **${expectancy.toFixed(2)}%**로 ${expectancy >= 0 ? '양수(장기 수익 가능 구조)' : '음수(구조 개선 필요)'}입니다. 수익 팩터 **${profile.profitFactor.toFixed(2)}**, 승률 **${profile.winRate.toFixed(1)}%**, 종합 등급 **${profile.overallGrade}**입니다.

## 🧠 심리 패턴 진단

심리 편향 점수는 **${biasScore.biasScore.toFixed(0)}/100**입니다. FOMO 매매 비율 **${(biasScore.fomoRatio * 100).toFixed(0)}%**, 복수매매 비율 **${(biasScore.revengeRatio * 100).toFixed(0)}%**가 감지되었습니다. 과매매 발생일은 **${biasScore.overTradingDays}일**, 손실 직후 재진입 횟수는 **${biasScore.consecutiveLossEntry}회**입니다. 감정적 매매 패턴은 장기 수익률에 직접적인 영향을 미치므로 매매 일지에 진입 심리를 꾸준히 기록하는 것이 중요합니다.

## ⚖️ 리스크 관리 평가

최대 낙폭(MDD)은 **-${profile.maxDrawdownPercent.toFixed(1)}%**이며, 일관성 점수는 **${profile.consistencyScore.toFixed(0)}/100**입니다. 연속 손실 시 포지션 크기를 줄이는 리스크 관리 전략을 적용하면 최대 낙폭을 효과적으로 제한할 수 있습니다.

## ⏱️ 타이밍 능력 분석

수익 거래 평균 보유일 **${timing.avgWinHoldingDays.toFixed(1)}일** vs 손실 거래 평균 보유일 **${timing.avgLossHoldingDays.toFixed(1)}일**입니다. 보유 우위(holdingEdge)는 **${timing.holdingEdge >= 0 ? '+' : ''}${timing.holdingEdge.toFixed(1)}일**로, ${timing.holdingEdge >= 0 ? '손절이 수익 청산보다 빠른 긍정적 패턴' : '수익 청산이 손절보다 빠른 패턴(익절 후 미련)'} 입니다.

## 🏆 이번 기간 잘한 점

- ${profile.winRate >= 50 ? `승률 ${profile.winRate.toFixed(1)}%로 과반 이상의 거래에서 수익을 달성했습니다.` : `${profile.totalTrades}건의 거래 데이터를 꾸준히 기록하여 분석 가능한 패턴 데이터를 축적했습니다.`}
- 평균 보유 기간 ${profile.avgHoldingDays.toFixed(0)}일로 ${profile.tradingStyleLabel} 스타일에 맞는 일관된 매매를 유지하고 있습니다.

## ⚠️ 핵심 개선 포인트

- R:R 비율 **${rrRatio.toFixed(2)}** — 목표 1.5 이상 달성을 위해 익절 목표가와 손절가를 사전에 설정하세요.
- Expectancy **${expectancy.toFixed(2)}%** — ${expectancy < 0 ? '현재 음수로, 승률 또는 손익비 개선이 시급합니다.' : '양수를 유지하며 꾸준히 개선하세요.'}

## ✅ 다음 거래 전 체크리스트

- [ ] R:R 1.5 이상 확인 후 진입 (현재 R:R: ${rrRatio.toFixed(2)}, 목표: 1.5)
- [ ] 감정 상태 점검 — FOMO/충동 매매 여부 자가 진단 (현재 편향점수: ${biasScore.biasScore.toFixed(0)}/100)
- [ ] 손절가와 목표가를 진입 전 미리 설정 (현재 평균손실 보유일: ${timing.avgLossHoldingDays.toFixed(1)}일)
- [ ] 하루 최대 거래 횟수 2건 이내 유지 (과매매 발생일: ${biasScore.overTradingDays}일)
- [ ] 전략 적합성 확인 — 전략 없는 매매는 하지 않기

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

        // Gemini response success
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

// ─── GET Handler — fetch current daily chat_qa usage ─────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await getAuthUser(req);
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!user || !token) {
      return NextResponse.json({ chatQaDailyUsed: 0, chatQaDailyLimit: CHAT_QA_FREE_DAILY });
    }

    const supabase = createAuthedClient(token);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('coin_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reference_type', 'chat_qa')
      .eq('amount', 0)
      .gte('created_at', todayStart.toISOString());

    return NextResponse.json({
      chatQaDailyUsed: count ?? 0,
      chatQaDailyLimit: CHAT_QA_FREE_DAILY,
    });
  } catch {
    return NextResponse.json({ chatQaDailyUsed: 0, chatQaDailyLimit: CHAT_QA_FREE_DAILY });
  }
}

// ─── POST Handler — generate AI analysis ─────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<AIAnalysisResponse | { error: string }>> {
  try {
    const body = (await req.json()) as AIAnalysisRequest;

    // 입력 검증
    if (!body.type || !['weekly_report', 'trade_review', 'pre_trade_coach', 'chat_qa'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }
    if (body.type === 'weekly_report' && !(body as WeeklyReportRequest).analysis?.profile) {
      return NextResponse.json({ error: 'Missing analysis data' }, { status: 400 });
    }
    if (body.type === 'trade_review' && !(body as TradeReviewRequest).roundTrip) {
      return NextResponse.json({ error: 'Missing roundTrip data' }, { status: 400 });
    }

    // 인증 확인
    const { user } = await getAuthUser(req);
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const supabase = token ? createAuthedClient(token) : null;

    const costMap: Record<string, number> = {
      weekly_report: COIN_COSTS.weekly_report,
      trade_review: COIN_COSTS.trade_review,
      pre_trade_coach: COIN_COSTS.pre_trade_coach,
      chat_qa: COIN_COSTS.chat_qa,
    };
    let cost = costMap[body.type] ?? COIN_COSTS.trade_review;
    let coinDeducted = false;
    let chatQaDailyUsed = 0;

    // Mock mode: API 키 미설정 또는 비인증 사용자
    if (!process.env.GEMINI_API_KEY || !user) {
      const mockReport = buildMockReport(body);
      return NextResponse.json({
        report: mockReport,
        generatedAt: new Date().toISOString(),
      });
    }

    // chat_qa: check daily free quota before charging coins
    if (body.type === 'chat_qa' && user && supabase) {
      // Use UTC midnight for consistent day boundary regardless of server timezone
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      // Count only free-tier tracking records (amount=0) to avoid counting old paid questions
      const { count } = await supabase
        .from('coin_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reference_type', 'chat_qa')
        .eq('amount', 0)
        .gte('created_at', todayStart.toISOString());

      chatQaDailyUsed = count ?? 0;

      if (chatQaDailyUsed < CHAT_QA_FREE_DAILY) {
        cost = 0;
      }
    }

    if (user && supabase && cost > 0) {
      const { error: deductError } = await supabase.rpc('deduct_coins', {
        p_user_id: user.id,
        p_amount: cost,
        p_ref_type: body.type,
        p_ref_id: null,
      });

      if (deductError) {
        if (deductError.message.includes('INSUFFICIENT_COINS')) {
          return NextResponse.json({ error: 'INSUFFICIENT_COINS' }, { status: 402 });
        }
        return NextResponse.json({ error: 'Coin deduction failed' }, { status: 500 });
      }
      coinDeducted = true;
    }

    // For free-tier chat_qa, record a zero-amount transaction with real balance for daily count tracking
    if (body.type === 'chat_qa' && user && supabase && cost === 0) {
      // Fetch actual balance to avoid corrupting the ledger with sentinel values
      const { data: balanceData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const { error: trackError } = await supabase.from('coin_transactions').insert({
        user_id: user.id,
        type: 'spend',
        amount: 0,
        balance_after: balanceData?.balance ?? 0,
        reference_type: 'chat_qa',
        reference_id: null,
      });
      if (trackError) {
        console.error('Failed to record free chat_qa usage:', trackError);
      }
    }

    try {
      // chat_qa usage metadata to include in response
      const chatQaMeta = body.type === 'chat_qa'
        ? { chatQaDailyUsed: cost === 0 ? chatQaDailyUsed + 1 : chatQaDailyUsed, chatQaDailyLimit: CHAT_QA_FREE_DAILY, wasFree: cost === 0 }
        : {};

      let userPrompt: string;
      let systemPrompt = getSystemPrompt(body.locale);

      if (body.type === 'weekly_report') {
        userPrompt = buildWeeklyReportPrompt(body);
      } else if (body.type === 'trade_review') {
        userPrompt = buildTradeReviewPrompt(body);
      } else if (body.type === 'pre_trade_coach') {
        userPrompt = buildPreTradeCoachPrompt(body);
      } else if (body.type === 'chat_qa') {
        // Include conversation history in system prompt for context
        const isEn = body.locale === 'en';
        const historyLabel = isEn ? '## Previous Conversation' : '## 이전 대화';
        const qLabel = isEn ? 'Question' : '질문';
        const aLabel = isEn ? 'Answer' : '답변';
        const historyContext = body.history && body.history.length > 0
          ? `\n\n${historyLabel}\n` + body.history.slice(0, -1).map(h =>
              h.role === 'user' ? `${qLabel}: ${h.text}` : `${aLabel}: ${h.text}`
            ).join('\n')
          : '';
        systemPrompt = getChatSystemPrompt(body.locale) + historyContext;
        userPrompt = buildChatQAPrompt(body, body.locale);
      } else {
        userPrompt = buildTradeReviewPrompt(body);
      }

      const report = await callGeminiAPI(systemPrompt, userPrompt);

      return NextResponse.json({
        report,
        generatedAt: new Date().toISOString(),
        ...chatQaMeta,
      });
    } catch (err) {
      // AI 실패 시 코인 반환
      if (coinDeducted && supabase) {
        const { error: refundError } = await supabase.rpc('add_coins', {
          p_user_id: user.id,
          p_amount: cost,
          p_type: 'refund',
          p_ref_type: body.type,
          p_ref_id: null,
        });
        if (refundError) {
          console.error('Coin refund failed:', refundError);
        }
      }
      throw err;
    }
  } catch (err) {
    console.error('AI analysis error:', err);
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
