import { RawNewsItem } from '@/app/types/economicReports';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// RSS 피드 소스 설정
export const ECONOMIC_NEWS_SOURCES = {
  // 한국 뉴스 - 연합뉴스
  yonhapEconomy: {
    name: '연합뉴스 경제',
    url: 'https://www.yna.co.kr/rss/economy.xml',
    category: 'korean' as const,
  },
  // 한국 뉴스 - 한국경제
  hankyungEconomy: {
    name: '한국경제 경제',
    url: 'https://www.hankyung.com/feed/economy',
    category: 'korean' as const,
  },
  hankyungFinance: {
    name: '한국경제 증권',
    url: 'https://www.hankyung.com/feed/finance',
    category: 'korean' as const,
  },
  hankyungInternational: {
    name: '한국경제 국제',
    url: 'https://www.hankyung.com/feed/international',
    category: 'korean' as const,
  },
  hankyungRealEstate: {
    name: '한국경제 부동산',
    url: 'https://www.hankyung.com/feed/realestate',
    category: 'korean' as const,
  },
  // 한국 뉴스 - 연합뉴스TV 경제
  yonhapNewsTvEconomy: {
    name: '연합뉴스TV 경제',
    url: 'http://www.yonhapnewstv.co.kr/category/news/economy/feed/',
    category: 'korean' as const,
  },
  // 글로벌 뉴스 - Yahoo Finance
  yahooFinance: {
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/news/rssindex',
    category: 'global' as const,
  },
  // 글로벌 뉴스 - MarketWatch
  marketWatch: {
    name: 'MarketWatch',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    category: 'global' as const,
  },
};

export type NewsSourceKey = keyof typeof ECONOMIC_NEWS_SOURCES;

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

/**
 * XML 파싱 헬퍼 (간단한 RSS 파싱)
 */
function parseRSSItems(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item[^>]*>[\s\S]*?<\/item>/g;
  const itemsMatch = xmlText.match(itemRegex);

  if (!itemsMatch) return items;

  for (const itemXml of itemsMatch.slice(0, 20)) { // 최대 20개만
    const titleMatch = itemXml.match(/<title[^>]*>([^<]*)<\/title>/);
    const linkMatch = itemXml.match(/<link[^>]*>([^<]*)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/);
    const descMatch = itemXml.match(/<description[^>]*>([^<]*)<\/description>/);

    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        link: linkMatch[1].trim(),
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : undefined,
        description: descMatch 
          ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() 
          : undefined,
      });
    }
  }

  return items;
}

/**
 * 단일 RSS 피드에서 뉴스 수집
 */
export async function fetchRSSFeed(
  source: NewsSourceKey
): Promise<RawNewsItem[]> {
  const config = ECONOMIC_NEWS_SOURCES[source];
  
  try {
    const response = await fetch(config.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockJournal/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 300 }, // 5분 캐싱
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    const items = parseRSSItems(xmlText);
    
    return items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.description,
      source: config.name,
    }));
  } catch (error) {
    console.error(`RSS 피드 파싱 실패 [${config.name}]:`, error);
    return [];
  }
}

/**
 * 모든 소스에서 뉴스 수집 (병렬)
 */
export async function fetchAllNews(
  sources: NewsSourceKey[] = Object.keys(
    ECONOMIC_NEWS_SOURCES
  ) as NewsSourceKey[]
): Promise<{ korean: RawNewsItem[]; global: RawNewsItem[] }> {
  const korean: RawNewsItem[] = [];
  const global: RawNewsItem[] = [];

  // 병렬로 모든 피드 수집
  const results = await Promise.allSettled(
    sources.map((source) => fetchRSSFeed(source))
  );

  results.forEach((result, index) => {
    const sourceKey = sources[index];
    const config = ECONOMIC_NEWS_SOURCES[sourceKey];

    if (result.status === 'fulfilled' && result.value.length > 0) {
      if (config.category === 'korean') {
        korean.push(...result.value);
      } else {
        global.push(...result.value);
      }
    }
  });

  // 중복 제거 및 정렬
  const deduplicateAndSort = (items: RawNewsItem[]): RawNewsItem[] => {
    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      })
      .sort((a, b) => {
        const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return dateB - dateA;
      });
  };

  return {
    korean: deduplicateAndSort(korean),
    global: deduplicateAndSort(global),
  };
}

/**
 * 특정 날짜의 뉴스 필터링
 */
export function filterNewsByDate(
  news: RawNewsItem[],
  targetDate: Date
): RawNewsItem[] {
  const targetDateStr = getKstDateString(targetDate);

  return news.filter((item) => {
    if (!item.pubDate) return false;
    const itemDate = getKstDateString(new Date(item.pubDate));
    return itemDate === targetDateStr;
  });
}

/**
 * 어제 날짜의 뉴스 필터링
 */
export function filterYesterdayNews(
  news: RawNewsItem[]
): { date: Date; items: RawNewsItem[] } {
  const now = new Date();
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const kstTodayUtc = new Date(Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate()
  ));
  const kstYesterdayUtc = new Date(kstTodayUtc.getTime() - 24 * 60 * 60 * 1000);

  const filtered = filterNewsByDate(news, kstYesterdayUtc);

  return {
    date: kstYesterdayUtc,
    items: filtered,
  };
}

export function getKstDateString(date: Date): string {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 뉴스 텍스트를 AI 분석용으로 정제
 */
export function sanitizeNewsForAI(
  news: RawNewsItem[],
  maxLength: number = 5000
): string {
  const formatted = news.map((item) => 
    `[${item.source}] ${item.title}${item.content ? ` - ${item.content}` : ''}`
  ).join('\n\n');

  if (formatted.length > maxLength) {
    return formatted.substring(0, maxLength) + '...';
  }
  return formatted;
}
