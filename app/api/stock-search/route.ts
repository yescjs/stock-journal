import { NextRequest, NextResponse } from 'next/server';
import { searchKoreanStocks } from '@/app/utils/koreanStocks';

export const dynamic = 'force-dynamic';

// Popular US ETFs for local fallback
const US_ETFS = [
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', exchange: 'NYSE' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE' },
    { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', exchange: 'NYSE' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE' },
    { symbol: 'VGT', name: 'Vanguard Information Technology ETF', exchange: 'NYSE' },
    { symbol: 'ARKK', name: 'ARK Innovation ETF', exchange: 'NYSE' },
    { symbol: 'SOXX', name: 'iShares Semiconductor ETF', exchange: 'NASDAQ' },
    { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', exchange: 'NYSE' },
    { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', exchange: 'NYSE' },
    { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', exchange: 'NYSE' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE' },
    { symbol: 'SLV', name: 'iShares Silver Trust', exchange: 'NYSE' },
    { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ', exchange: 'NASDAQ' },
    { symbol: 'SQQQ', name: 'ProShares UltraPro Short QQQ', exchange: 'NASDAQ' },
    { symbol: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X', exchange: 'NYSE' },
    { symbol: 'SOXS', name: 'Direxion Daily Semiconductor Bear 3X', exchange: 'NYSE' },
];

// KRX 종목 캐시 (메모리)
interface KRXStock {
    symbol: string;
    name: string;
    market: string;
}
let krxStocksCache: KRXStock[] = [];
let krxCacheTimestamp = 0;
const KRX_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

// KRX에서 종목 목록 가져오기
async function fetchKRXStocks(market: 'KOSPI' | 'KOSDAQ'): Promise<KRXStock[]> {
    try {
        const mktId = market === 'KOSPI' ? 'STK' : 'KSQ';
        const url = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';

        const formData = new URLSearchParams({
            bld: 'dbms/MDC/STAT/standard/MDCSTAT01901',
            locale: 'ko_KR',
            mktId: mktId,
            share: '1',
            csvxls_is498: '49',
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101',
            },
            body: formData.toString(),
        });

        if (!response.ok) return [];

        const data = await response.json();
        const items = data.OutBlock_1 || [];

        return items.map((item: any) => ({
            symbol: `${item.ISU_SRT_CD}.${market === 'KOSPI' ? 'KS' : 'KQ'}`,
            name: item.ISU_ABBRV || item.ISU_NM || '',
            market: market,
        }));
    } catch {
        return [];
    }
}

// KRX 종목 캐시 갱신
async function getKRXStocks(): Promise<KRXStock[]> {
    const now = Date.now();

    if (krxStocksCache.length > 0 && (now - krxCacheTimestamp) < KRX_CACHE_DURATION) {
        return krxStocksCache;
    }

    try {
        const [kospi, kosdaq] = await Promise.all([
            fetchKRXStocks('KOSPI'),
            fetchKRXStocks('KOSDAQ'),
        ]);

        if (kospi.length > 0 || kosdaq.length > 0) {
            krxStocksCache = [...kospi, ...kosdaq];
            krxCacheTimestamp = now;
            console.log(`KRX stocks cached: ${krxStocksCache.length} stocks`);
        }
    } catch (error) {
        console.error('Failed to fetch KRX stocks:', error);
    }

    return krxStocksCache;
}

// Yahoo Finance Search API를 통한 종목 검색
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { results: [] },
                { status: 200 }
            );
        }

        const trimmedQuery = query.trim();
        const lowerQuery = trimmedQuery.toLowerCase();
        const results: { symbol: string; name: string; exchange: string }[] = [];

        // 1. Yahoo Finance Search API 호출 (병렬)
        const yahooPromise = (async () => {
            try {
                const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(trimmedQuery)}&quotesCount=10&newsCount=0`;
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    return (data.quotes || [])
                        .filter((quote: any) =>
                            quote.symbol &&
                            quote.shortname &&
                            (quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF')
                        )
                        .map((quote: any) => ({
                            symbol: quote.symbol,
                            name: quote.shortname || quote.longname || quote.symbol,
                            exchange: quote.exchange || 'N/A',
                        }));
                }
            } catch {
                // Ignore errors
            }
            return [];
        })();

        // 2. KRX 종목 검색 (병렬) - 전체 한국 주식
        const krxPromise = (async () => {
            const krxStocks = await getKRXStocks();
            return krxStocks.filter(stock =>
                stock.name.toLowerCase().includes(lowerQuery) ||
                stock.symbol.toLowerCase().includes(lowerQuery) ||
                stock.symbol.replace(/\.(KS|KQ)$/, '').includes(trimmedQuery)
            ).slice(0, 15);
        })();

        // 병렬 실행
        const [yahooResults, krxResults] = await Promise.all([yahooPromise, krxPromise]);

        // Yahoo 결과 추가
        results.push(...yahooResults);

        // KRX 결과 추가 (중복 제거)
        for (const stock of krxResults) {
            if (!results.find(r => r.symbol === stock.symbol)) {
                results.push({
                    symbol: stock.symbol,
                    name: stock.name,
                    exchange: stock.market,
                });
            }
        }

        // 3. 로컬 한국 주식 검색 (fallback)
        const koreanResults = searchKoreanStocks(trimmedQuery, 10);
        for (const stock of koreanResults) {
            if (!results.find(r => r.symbol === stock.symbol)) {
                results.push({
                    symbol: stock.symbol,
                    name: stock.name,
                    exchange: stock.exchange,
                });
            }
        }

        // 4. US ETF 로컬 검색
        const etfResults = US_ETFS.filter(etf =>
            etf.symbol.toLowerCase().includes(lowerQuery) ||
            etf.name.toLowerCase().includes(lowerQuery)
        );
        for (const etf of etfResults) {
            if (!results.find(r => r.symbol === etf.symbol)) {
                results.push(etf);
            }
        }

        // 최대 20개 결과 반환
        return NextResponse.json({
            results: results.slice(0, 20),
        });

    } catch (error: any) {
        console.error('Stock search API error:', error);
        return NextResponse.json(
            { results: [] },
            { status: 200 }
        );
    }
}
