import { RawNewsItem, KeyIssue } from '@/app/types/economicReports';

// 경제 키워드 사전
const ECONOMIC_KEYWORDS = {
  // 긍정적 키워드
  positive: [
    '상승', '급등', '호재', '성장', '흑자', '개선', '증가', '확대', '강세', '반등',
    '상회', '돌파', '신고가', '최고', '호황', '우호적', '안정', '회복', '활성화',
    'rise', 'gain', 'profit', 'growth', 'surge', 'jump', 'rally', 'boom',
    'strong', 'bullish', 'recovery', 'expansion', 'improve', 'up', 'higher'
  ],
  
  // 부정적 키워드
  negative: [
    '하락', '급락', '악재', '침체', '적자', '악화', '감소', '축소', '약세', '폭락',
    '하회', '이탈', '최저', '불황', '악영향', '불안', '침체', '둔화', '위축',
    'fall', 'drop', 'loss', 'recession', 'slump', 'crash', 'decline', 'plunge',
    'weak', 'bearish', 'crisis', 'slowdown', 'down', 'lower', 'concern'
  ],
  
  // 시장/경제 주제
  markets: [
    '코스피', '코스닥', '나스닥', '다우', 'S&P', '주식', '증시', '증권',
    '환율', '원달러', '달러', '엔화', '유로',
    '금리', '기준금리', '금통위', '한은', '연준', 'Fed',
    '유가', '원유', '금', '구리', '철광석', '원자재',
    'GDP', '물가', '인플레이션', 'CPI', 'PPI', '실업률'
  ],
  
  // 산업/섹터
  sectors: [
    '반도체', '전기차', '바이오', '제약', 'IT', '게임', '엔터',
    '2차전지', '배터리', '태양광', '에너지', '전력',
    '은행', '보험', '카드', '금융',
    '부동산', '건설', '아파트',
    '유통', '백화점', '면세점', '항공', '여행'
  ],
  
  // 기업 관련
  companies: [
    '삼성', '현대', 'SK', 'LG', '네이버', '카카오', 'CJ',
    '애플', '구글', '아마존', '테슬라', '마이크로소프트', '엔비디아'
  ],
  
  // 이벤트/정책
  events: [
    '실적', '발표', '컨퍼런스', '콜', '행사', '총회',
    '정책', '법안', '규제', '입법', '개정', '발효',
    '회담', '정상회담', '협상', '합의', '분쟁', '제재',
    'IMF', 'WTO', 'OPEC', 'G7', 'G20'
  ]
};

// 키워드 카테고리 타입
type KeywordCategory = keyof typeof ECONOMIC_KEYWORDS;

/**
 * 텍스트에서 키워드 추출 및 카운트
 */
export function extractKeywords(text: string): { 
  category: KeywordCategory; 
  keyword: string; 
  count: number;
}[] {
  const results: { category: KeywordCategory; keyword: string; count: number }[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(ECONOMIC_KEYWORDS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        results.push({
          category: category as KeywordCategory,
          keyword,
          count: matches.length
        });
      }
    }
  }
  
  // 카운트 기준 내림차순 정렬
  return results.sort((a, b) => b.count - a.count);
}

/**
 * 뉴스 리스트에서 키워드 기반 핵심 이슈 추출
 */
export function extractKeyIssuesFromNews(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  minIssues: number = 3,
  maxIssues: number = 5
): KeyIssue[] {
  const allNews = [...koreanNews, ...globalNews];
  const allText = allNews.map(n => n.title + ' ' + (n.content || '')).join(' ');
  
  // 키워드 추출
  const keywords = extractKeywords(allText);
  
  // 주요 주제 식별
  const topicKeywords = keywords.filter(k => 
    ['markets', 'sectors', 'companies', 'events'].includes(k.category)
  );
  
  // 핵심 이슈 생성 (최대 maxIssues개)
  const keyIssues: KeyIssue[] = [];
  const usedTopics = new Set<string>();
  
  for (const topic of topicKeywords.slice(0, 10)) {
    if (keyIssues.length >= maxIssues) break;
    if (usedTopics.has(topic.keyword)) continue;
    
    usedTopics.add(topic.keyword);
    
    // 해당 주제가 언급된 뉴스 찾기
    const relatedNews = allNews.filter(n => 
      n.title.toLowerCase().includes(topic.keyword.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(topic.keyword.toLowerCase())
    );
    
    if (relatedNews.length === 0) continue;
    
    // 감성 판단
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    const topicText = relatedNews.map(n => n.title).join(' ').toLowerCase();
    const topicPositive = ECONOMIC_KEYWORDS.positive.filter(k => topicText.includes(k.toLowerCase())).length;
    const topicNegative = ECONOMIC_KEYWORDS.negative.filter(k => topicText.includes(k.toLowerCase())).length;
    
    if (topicPositive > topicNegative + 1) sentiment = 'positive';
    else if (topicNegative > topicPositive + 1) sentiment = 'negative';
    
    // 영향도 결정 (관련 뉴스 수 기반)
    let impact: 'high' | 'medium' | 'low' = 'medium';
    if (relatedNews.length >= 5) impact = 'high';
    else if (relatedNews.length <= 2) impact = 'low';
    
    // 설명 생성
    const sentimentText = sentiment === 'positive' ? '긍정적' : sentiment === 'negative' ? '부정적' : '중립적';
    const description = `${topic.keyword} 관련 ${relatedNews.length}건의 뉴스. 전반적으로 ${sentimentText}인 분위기입니다.`;
    
    keyIssues.push({
      topic: `${topic.keyword} 동향`,
      impact,
      description,
      stocks: extractRelatedStocks(relatedNews)
    });
  }

  if (keyIssues.length < minIssues) {
    const fallbackTopics = keywords.filter(k => !usedTopics.has(k.keyword)).slice(0, 10);
    for (const topic of fallbackTopics) {
      if (keyIssues.length >= minIssues) break;
      usedTopics.add(topic.keyword);
      keyIssues.push({
        topic: `${topic.keyword} 동향`,
        impact: topic.count >= 5 ? 'high' : topic.count <= 2 ? 'low' : 'medium',
        description: `${topic.keyword} 관련 키워드가 반복적으로 등장해 주요 이슈로 분류했습니다.`,
      });
    }
  }

  while (keyIssues.length < minIssues) {
    keyIssues.push({
      topic: `시장 전반 흐름 ${keyIssues.length + 1}`,
      impact: 'medium',
      description: '뉴스가 제한적이어서 시장 전반 흐름 중심으로 정리했습니다.',
    });
  }
  
  return keyIssues.slice(0, maxIssues);
}

/**
 * 뉴스에서 관련 종목 코드 추출 (간단한 패턴 매칭)
 */
function extractRelatedStocks(news: RawNewsItem[]): string[] {
  const stocks = new Set<string>();
  const stockPattern = /\b\d{6}\b/g; // 6자리 숫자 (한국 종목코드)
  const companyPatterns: Record<string, string[]> = {
    '삼성전자': ['005930'],
    'SK하이닉스': ['000660'],
    '현대차': ['005380'],
    '카카오': ['035720'],
    '네이버': ['035420'],
    'LG화학': ['051910'],
    '셀트리온': ['068270'],
  };
  
  for (const item of news) {
    const text = item.title + ' ' + (item.content || '');
    
    // 6자리 숫자 패턴 검색
    const matches = text.match(stockPattern);
    if (matches) {
      matches.forEach(m => stocks.add(m));
    }
    
    // 회사명 기반 종목코드 매핑
    for (const [company, codes] of Object.entries(companyPatterns)) {
      if (text.includes(company)) {
        codes.forEach(c => stocks.add(c));
      }
    }
  }
  
  return Array.from(stocks).slice(0, 5); // 최대 5개
}

/**
 * 키워드 기반 시장 심리 분석
 */
export function analyzeMarketSentiment(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[]
): 'bullish' | 'bearish' | 'neutral' | 'volatile' {
  const allText = [...koreanNews, ...globalNews]
    .map(n => n.title + ' ' + (n.content || ''))
    .join(' ')
    .toLowerCase();
  
  const positiveCount = ECONOMIC_KEYWORDS.positive
    .filter(k => allText.includes(k.toLowerCase()))
    .length;
  const negativeCount = ECONOMIC_KEYWORDS.negative
    .filter(k => allText.includes(k.toLowerCase()))
    .length;
  
  const totalNews = koreanNews.length + globalNews.length;
  
  if (positiveCount > negativeCount + 3) return 'bullish';
  if (negativeCount > positiveCount + 3) return 'bearish';
  if (Math.abs(positiveCount - negativeCount) <= 2 && totalNews > 15) return 'volatile';
  return 'neutral';
}

/**
 * 키워드 기반 보고서 제목 생성
 */
export function generateReportTitle(
  keywords: { category: string; keyword: string; count: number }[],
  reportDate: Date
): string {
  const dateStr = reportDate.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
  
  // 상위 2개 키워드 추출
  const topKeywords = keywords
    .filter(k => ['markets', 'sectors', 'companies'].includes(k.category))
    .slice(0, 2)
    .map(k => k.keyword);
  
  if (topKeywords.length >= 2) {
    return `${dateStr} ${topKeywords[0]}·${topKeywords[1]} 집중`;
  } else if (topKeywords.length === 1) {
    return `${dateStr} ${topKeywords[0]} 동향`;
  }
  
  return `${dateStr} 경제 일보`;
}

/**
 * 키워드 기반 요약 생성
 */
export function generateKeywordSummary(
  koreanNews: RawNewsItem[],
  globalNews: RawNewsItem[],
  keywords: { category: string; keyword: string; count: number }[]
): string {
  const totalNews = koreanNews.length + globalNews.length;
  const sentiment = analyzeMarketSentiment(koreanNews, globalNews);
  
  const sentimentText = {
    bullish: '긍정적인',
    bearish: '부정적인',
    neutral: '중립적인',
    volatile: '변동성이 큰'
  }[sentiment];
  
  // 상위 키워드 추출
  const topKeywords = keywords.slice(0, 3).map(k => k.keyword);
  const keywordText = topKeywords.length > 0 
    ? `주요 키워드는 ${topKeywords.join(', ')} 등입니다.` 
    : '';
  
  return `어제(${koreanNews.length}건 국내, ${globalNews.length}건 해외) 총 ${totalNews}건의 경제 뉴스를 분석한 결과, 전반적으로 ${sentimentText} 시장 분위기를 보였습니다. ${keywordText}`;
}
