import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface KRXStock {
    symbol: string;
    name: string;
    market: 'KOSPI' | 'KOSDAQ';
}

// KRX에서 전체 종목 목록 가져오기
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

        if (!response.ok) {
            console.error(`KRX API error for ${market}:`, response.status);
            return [];
        }

        const data = await response.json();
        const items = data.OutBlock_1 || [];

        return items.map((item: any) => ({
            symbol: `${item.ISU_SRT_CD}.${market === 'KOSPI' ? 'KS' : 'KQ'}`,
            name: item.ISU_ABBRV || item.ISU_NM || '',
            market: market,
        }));
    } catch (error) {
        console.error(`Error fetching ${market} stocks:`, error);
        return [];
    }
}

// 캐시된 종목 목록 (메모리 캐시)
let cachedStocks: KRXStock[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const refresh = searchParams.get('refresh') === 'true';

        const now = Date.now();

        // 캐시가 유효하고 새로고침 요청이 아니면 캐시 반환
        if (!refresh && cachedStocks.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
            return NextResponse.json({
                stocks: cachedStocks,
                count: cachedStocks.length,
                cached: true,
                cacheAge: Math.round((now - cacheTimestamp) / 1000 / 60), // 분 단위
            });
        }

        // KRX에서 새로운 데이터 가져오기
        console.log('Fetching fresh stock list from KRX...');

        const [kospiStocks, kosdaqStocks] = await Promise.all([
            fetchKRXStocks('KOSPI'),
            fetchKRXStocks('KOSDAQ'),
        ]);

        const allStocks = [...kospiStocks, ...kosdaqStocks];

        if (allStocks.length > 0) {
            cachedStocks = allStocks;
            cacheTimestamp = now;
        }

        return NextResponse.json({
            stocks: allStocks,
            count: allStocks.length,
            kospiCount: kospiStocks.length,
            kosdaqCount: kosdaqStocks.length,
            cached: false,
        });

    } catch (error: any) {
        console.error('Stock list API error:', error);

        // 에러 시 캐시된 데이터라도 반환
        if (cachedStocks.length > 0) {
            return NextResponse.json({
                stocks: cachedStocks,
                count: cachedStocks.length,
                cached: true,
                error: 'Using cached data due to API error',
            });
        }

        return NextResponse.json(
            { error: 'Failed to fetch stock list', message: error.message },
            { status: 500 }
        );
    }
}
