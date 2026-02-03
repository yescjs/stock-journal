import { DailyEconomicReport, KeyIssue, RawNewsItem } from '@/app/types/economicReports';
import { 
  extractKeyIssuesFromNews, 
  analyzeMarketSentiment, 
  generateReportTitle,
  generateKeywordSummary,
  extractKeywords
} from './keywordAnalyzer';

// API 설정
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * OpenAI API 호출 (API 키가 있는 경우에만)
 */
async function callOpenAI(
  messages: { role: 'system' | 'user'; content: string }[],
  maxTokens: number = 1500
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('OpenAI API key not configured, skipping AI analysis');
    return null;
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return null;
  }
}

/**
 * Google Gemini API 호출 (무료 티어)
 * https://ai.google.dev/ 에서 무료 API 키 발급 가능
 */
async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('Gemini API key not configured, skipping AI analysis');
    return null;
  }

  try {
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
          maxOutputTokens: 1500,
        }
      }),
    });

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
 * AI 기반 경제 뉴스 분석 (API 키가 있는 경우)
 * OpenAI > Gemini 순서로 시도
 */
async function analyzeWithAI(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  reportDate: Date
): Promise<{ title: string; summary: string; key_issues: KeyIssue[]; market_sentiment: string } | null> {
  const koreanText = koreanNews
    .slice(0, 15)
    .map((n) => `[${n.source}] ${n.title}`)
    .join('\n');
  
  const globalText = globalNews
    .slice(0, 15)
    .map((n) => `[${n.source}] ${n.title}`)
    .join('\n');

  const dateStr = reportDate.toISOString().split('T')[0];

  const prompt = `당신은 경제 분석가입니다. 다음 ${dateStr} 날짜의 경제 뉴스를 분석해주세요.

## 국내 경제 뉴스
${koreanText || '(데이터 없음)'}

## 해외 경제 뉴스
${globalText || '(데이터 없음)'}

다음 JSON 형식으로 응답해주세요:

{
  "title": "보고서 제목 (날짜 포함, 30자 이내)",
  "summary": "전체 시장 상황 요약 (200자 이내)",
  "market_sentiment": "bullish|bearish|neutral|volatile",
  "key_issues": [
    {
      "topic": "핵심 이슈 주제",
      "impact": "high|medium|low",
      "description": "이슈 설명 (100자 이내)"
    }
  ]
}

주의사항:
1. title은 반드시 날짜를 포함해주세요
2. summary는 투자자 관점에서 작성해주세요
3. key_issues는 3-5개 핵심 이슈만 추출해주세요
4. market_sentiment는 전반적인 시장 분위기를 판단해주세요
5. JSON 형식만 반환하고 다른 텍스트는 포함하지 마세요`;

  // 1. OpenAI 시도
  const openaiContent = await callOpenAI([
    { role: 'system', content: '당신은 전문 경제 분석가입니다.' },
    { role: 'user', content: prompt },
  ]);

  // 2. OpenAI 실패시 Gemini 시도
  const aiContent = openaiContent || await callGemini(prompt);

  if (!aiContent) {
    return null;
  }

  try {
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.title || !parsed.summary || !parsed.market_sentiment) {
      console.error('Invalid AI response structure');
      return null;
    }

    return {
      title: parsed.title,
      summary: parsed.summary,
      key_issues: parsed.key_issues || [],
      market_sentiment: parsed.market_sentiment,
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
): { title: string; summary: string; key_issues: KeyIssue[]; market_sentiment: string } {
  // 키워드 추출
  const allNews = [...koreanNews, ...globalNews];
  const allText = allNews.map(n => n.title + ' ' + (n.content || '')).join(' ');
  const keywords = extractKeywords(allText);
  
  // 시장 심리 분석
  const marketSentiment = analyzeMarketSentiment(koreanNews, globalNews);
  
  // 핵심 이슈 추출
  const keyIssues = extractKeyIssuesFromNews(koreanNews, globalNews);
  
  // 제목 생성
  const title = generateReportTitle(keywords, reportDate);
  
  // 요약 생성
  const summary = generateKeywordSummary(koreanNews, globalNews, keywords);
  
  return {
    title,
    summary,
    key_issues: keyIssues,
    market_sentiment: marketSentiment,
  };
}

/**
 * 메인: 경제 뉴스를 분석하여 보고서 생성
 * API 키가 있으면 AI 사용, 없으면 키워드 기반 분석 사용
 */
export async function analyzeEconomicNews(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  reportDate: Date
): Promise<Partial<DailyEconomicReport> | null> {
  const dateStr = reportDate.toISOString().split('T')[0];
  
  // 1. AI 분석 시도 (API 키가 있으면)
  let analysis = await analyzeWithAI(koreanNews, globalNews, reportDate);
  let usedAI = !!analysis;
  
  // 2. AI 실패시 키워드 기반 분석
  if (!analysis) {
    console.log('Using keyword-based analysis (no AI API key or API failed)');
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
    market_sentiment: analysis.market_sentiment as 'bullish' | 'bearish' | 'neutral' | 'volatile',
    korean_news: processedKoreanNews,
    global_news: processedGlobalNews,
    key_issues: analysis.key_issues,
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
export function getAvailableAIService(): 'openai' | 'gemini' | 'none' {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'none';
}

/**
 * 분석 방식 설명 반환
 */
export function getAnalysisModeDescription(): string {
  const service = getAvailableAIService();
  if (service === 'openai') return 'OpenAI GPT-4o-mini로 분석됩니다';
  if (service === 'gemini') return 'Google Gemini로 분석됩니다 (무료)';
  return '키워드 기반 규칙으로 분석됩니다 (AI 미사용)';
}
