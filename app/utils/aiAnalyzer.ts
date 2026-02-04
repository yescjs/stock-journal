import { DailyEconomicReport, KeyIssue, RawNewsItem, SectorAnalysis, MarketIndicator, InvestmentInsight } from '@/app/types/economicReports';
import {
  extractKeyIssuesFromNews,
  analyzeMarketSentiment,
  generateReportTitle,
  generateKeywordSummary,
  extractKeywords,
  extractSectorAnalysis,
} from './keywordAnalyzer';

// Gemini API 설정
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface AIAnalysisResult {
  title: string;
  summary: string;
  key_issues: KeyIssue[];
  market_sentiment: string;
  market_overview?: string;
  sector_analysis?: SectorAnalysis[];
  market_indicators?: MarketIndicator[];
  investment_insights?: InvestmentInsight[];
}

/**
 * Google Gemini API 호출 (무료 티어)
 * https://ai.google.dev/ 에서 무료 API 키 발급 가능
 */
async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
          responseMimeType: 'application/json',
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return null;
  }
}

/**
 * 뉴스 텍스트를 AI 분석용으로 포맷팅
 * 제목 + 본문(200자) 포함
 */
function formatNewsForAI(news: RawNewsItem[], maxItems: number = 15): string {
  return news
    .slice(0, maxItems)
    .map((n) => {
      const content = n.content ? ` - ${n.content.substring(0, 200)}` : '';
      return `[${n.source}] ${n.title}${content}`;
    })
    .join('\n');
}

/**
 * AI 기반 경제 뉴스 분석 (Gemini 2.0 Flash)
 */
async function analyzeWithAI(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  reportDate: Date
): Promise<AIAnalysisResult | null> {
  const koreanText = formatNewsForAI(koreanNews);
  const globalText = formatNewsForAI(globalNews);
  const dateStr = reportDate.toISOString().split('T')[0];

  const prompt = `당신은 전문 경제 분석가입니다. 다음 ${dateStr} 날짜의 경제 뉴스를 분석하여 투자자를 위한 상세한 시황 리포트를 작성해주세요.

## 국내 경제 뉴스
${koreanText || '(데이터 없음)'}

## 해외 경제 뉴스
${globalText || '(데이터 없음)'}

다음 JSON 형식으로 응답해주세요:

{
  "title": "보고서 제목 (날짜 포함, 30자 이내)",
  "summary": "전체 시장 상황 요약 (투자자 관점, 500자 이내)",
  "market_overview": "시장 전체 개요를 마크다운으로 서술 (1000자 이내). 국내외 주요 지수 동향, 환율/금리/원자재 흐름, 글로벌 매크로 이벤트 등을 포함. 줄바꿈은 \\n으로 표시",
  "market_sentiment": "bullish 또는 bearish 또는 neutral 또는 volatile",
  "key_issues": [
    {
      "topic": "핵심 이슈 주제",
      "impact": "high 또는 medium 또는 low",
      "description": "이슈에 대한 상세 설명 (150자 이내)"
    }
  ],
  "sector_analysis": [
    {
      "sector": "섹터명 (예: 반도체, 2차전지, 바이오 등)",
      "trend": "up 또는 down 또는 neutral",
      "summary": "해당 섹터의 동향 요약 (100자 이내)",
      "relatedStocks": ["관련 종목명"]
    }
  ],
  "market_indicators": [
    {
      "name": "지표명 (예: 코스피, 원/달러 환율, 미 국채 10년물 등)",
      "direction": "up 또는 down 또는 stable",
      "description": "지표 설명 (50자 이내)"
    }
  ],
  "investment_insights": [
    {
      "type": "opportunity 또는 risk 또는 watch",
      "title": "시사점 제목 (20자 이내)",
      "description": "투자 시사점 상세 설명 (100자 이내)"
    }
  ]
}

주의사항:
1. title은 반드시 날짜를 포함해주세요
2. summary는 투자자 관점에서 핵심 동향과 시사점을 담아주세요 (500자)
3. market_overview는 마크다운 형식으로 서술하되, 줄바꿈은 \\n으로 표시해주세요 (1000자)
4. key_issues는 3-5개 핵심 이슈를 추출해주세요
5. sector_analysis는 2-4개 주요 섹터를 분석해주세요
6. market_indicators는 3-5개 주요 경제 지표를 포함해주세요
7. investment_insights는 2-3개 투자 시사점을 제시해주세요
8. JSON 형식만 반환하고 다른 텍스트는 포함하지 마세요`;

  const aiContent = await callGemini(prompt);

  if (!aiContent) {
    return null;
  }

  try {
    // responseMimeType: "application/json"으로 설정했으므로 직접 파싱 시도
    let parsed: AIAnalysisResult;
    try {
      parsed = JSON.parse(aiContent);
    } catch {
      // fallback: JSON 블록 추출
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in AI response');
        return null;
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed.title || !parsed.summary || !parsed.market_sentiment) {
      console.error('Invalid AI response structure');
      return null;
    }

    return {
      title: parsed.title,
      summary: parsed.summary,
      market_overview: parsed.market_overview,
      key_issues: parsed.key_issues || [],
      market_sentiment: parsed.market_sentiment,
      sector_analysis: parsed.sector_analysis || [],
      market_indicators: parsed.market_indicators || [],
      investment_insights: parsed.investment_insights || [],
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return null;
  }
}

/**
 * 키워드 기반 경제 뉴스 분석 (AI 없이)
 * API 키가 없을 때 사용
 */
function analyzeWithKeywords(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  reportDate: Date
): AIAnalysisResult {
  const allNews = [...koreanNews, ...globalNews];
  const allText = allNews.map(n => n.title + ' ' + (n.content || '')).join(' ');
  const keywords = extractKeywords(allText);

  const marketSentiment = analyzeMarketSentiment(koreanNews, globalNews);
  const keyIssues = extractKeyIssuesFromNews(koreanNews, globalNews);
  const title = generateReportTitle(keywords, reportDate);
  const summary = generateKeywordSummary(koreanNews, globalNews, keywords);
  const sectorAnalysis = extractSectorAnalysis(koreanNews, globalNews);

  return {
    title,
    summary,
    key_issues: keyIssues,
    market_sentiment: marketSentiment,
    sector_analysis: sectorAnalysis,
    market_indicators: [],
    investment_insights: [],
  };
}

/**
 * 메인: 경제 뉴스를 분석하여 보고서 생성
 * Gemini API 키가 있으면 AI 사용, 없으면 키워드 기반 분석 사용
 */
export async function analyzeEconomicNews(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  reportDate: Date
): Promise<Partial<DailyEconomicReport> | null> {
  const dateStr = reportDate.toISOString().split('T')[0];

  // 1. AI 분석 시도 (Gemini API 키가 있으면)
  let analysis = await analyzeWithAI(koreanNews, globalNews, reportDate);
  let usedAI = !!analysis;

  // 2. AI 실패시 키워드 기반 분석
  if (!analysis) {
    analysis = analyzeWithKeywords(koreanNews, globalNews, reportDate);
    usedAI = false;
  }

  // 뉴스 데이터 정제
  const processedKoreanNews = koreanNews.slice(0, 10).map((n) => ({
    title: n.title,
    source: n.source,
    url: n.link,
    summary: n.content?.substring(0, 100) || '',
    publishedAt: n.pubDate,
  }));

  const processedGlobalNews = globalNews.slice(0, 10).map((n) => ({
    title: n.title,
    source: n.source,
    url: n.link,
    summary: n.content?.substring(0, 100) || '',
    publishedAt: n.pubDate,
  }));

  return {
    report_date: dateStr,
    title: analysis.title,
    summary: analysis.summary,
    market_overview: analysis.market_overview,
    market_sentiment: analysis.market_sentiment as 'bullish' | 'bearish' | 'neutral' | 'volatile',
    korean_news: processedKoreanNews,
    global_news: processedGlobalNews,
    key_issues: analysis.key_issues,
    sector_analysis: analysis.sector_analysis,
    market_indicators: analysis.market_indicators,
    investment_insights: analysis.investment_insights,
    ai_generated: usedAI,
    is_read: false,
  };
}

/**
 * Fallback: 뉴스가 없는 경우 간단한 보고서 생성
 */
export function createFallbackReport(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  reportDate: Date
): Partial<DailyEconomicReport> {
  const dateStr = reportDate.toISOString().split('T')[0];
  const dateDisplay = reportDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    report_date: dateStr,
    title: `${dateDisplay} 경제 일보`,
    summary: `${dateDisplay} 경제 뉴스를 분석한 결과, 국내 ${koreanNews.length}건, 해외 ${globalNews.length}건의 뉴스를 수집했습니다. 자세한 내용은 아래 뉴스 목록을 참고하세요.`,
    market_sentiment: 'neutral',
    korean_news: koreanNews.slice(0, 10).map((n) => ({
      title: n.title,
      source: n.source,
      url: n.link,
      summary: n.content?.substring(0, 100) || '',
      publishedAt: n.pubDate,
    })),
    global_news: globalNews.slice(0, 10).map((n) => ({
      title: n.title,
      source: n.source,
      url: n.link,
      summary: n.content?.substring(0, 100) || '',
      publishedAt: n.pubDate,
    })),
    key_issues: [],
    ai_generated: false,
    is_read: false,
  };
}

/**
 * 사용 가능한 AI 서비스 확인
 */
export function getAvailableAIService(): 'gemini' | 'none' {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'none';
}

/**
 * 분석 방식 설명 반환
 */
export function getAnalysisModeDescription(): string {
  const service = getAvailableAIService();
  if (service === 'gemini') return 'Google Gemini 2.0 Flash로 분석됩니다 (무료)';
  return '키워드 기반 규칙으로 분석됩니다 (AI 미사용)';
}
