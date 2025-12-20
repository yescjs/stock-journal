import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 가격 데이터 타입
interface PriceData {
    date: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// 한국 주식 심볼인지 확인
function isKoreanStock(symbol: string): boolean {
    return /^\d{6}$/.test(symbol) || symbol.endsWith('.KS') || symbol.endsWith('.KQ');
}

// 심볼에서 순수 종목코드 추출
function extractStockCode(symbol: string): string {
    return symbol.replace(/\.(KS|KQ)$/i, '');
}

// Yahoo Finance API를 통한 주식 차트 데이터 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const period = searchParams.get('period') || '1mo';

        if (!symbol) {
            return NextResponse.json(
                { error: 'Symbol is required' },
                { status: 400 }
            );
        }

        // 기간별 interval 설정
        const { range, interval } = getPeriodConfig(period);

        // 1단계: Yahoo Finance 시도
        const yahooResult = await tryYahooFinance(symbol, range, interval);
        if (yahooResult) {
            return NextResponse.json({
                symbol: yahooResult.symbol,
                originalSymbol: symbol,
                prices: yahooResult.prices,
                source: 'yahoo',
            });
        }

        // 2단계: 한국 주식이면 네이버 금융 시도
        if (isKoreanStock(symbol)) {
            console.log(`Yahoo Finance failed for ${symbol}, trying Naver Finance...`);
            const naverResult = await tryNaverFinance(symbol, period);
            if (naverResult) {
                return NextResponse.json({
                    symbol: symbol,
                    originalSymbol: symbol,
                    prices: naverResult.prices,
                    source: 'naver',
                });
            }
        }

        // 모든 시도가 실패한 경우
        console.error('All data sources failed:', { symbol });
        return NextResponse.json(
            {
                error: '차트 데이터를 불러올 수 없습니다',
                detail: `종목 코드 '${symbol}'에 대한 데이터를 찾을 수 없습니다. 올바른 종목 코드인지 확인해주세요.`,
            },
            { status: 404 }
        );

    } catch (error: any) {
        console.error('Stock chart API error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다', message: error.message },
            { status: 500 }
        );
    }
}

// Yahoo Finance에서 데이터 가져오기 시도
async function tryYahooFinance(
    symbol: string,
    range: string,
    interval: string
): Promise<{ symbol: string; prices: PriceData[] } | null> {
    const yahooSymbols = convertToYahooSymbol(symbol);

    for (const yahooSymbol of yahooSymbols) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            if (!response.ok) continue;

            const data = await response.json();
            const result = data.chart?.result?.[0];
            if (!result) continue;

            const timestamps = result.timestamp || [];
            const quote = result.indicators?.quote?.[0];

            if (!quote || timestamps.length === 0) continue;

            const prices = timestamps.map((timestamp: number, index: number) => ({
                date: timestamp * 1000,
                open: quote.open?.[index] ?? 0,
                high: quote.high?.[index] ?? 0,
                low: quote.low?.[index] ?? 0,
                close: quote.close?.[index] ?? 0,
                volume: quote.volume?.[index] ?? 0,
            })).filter((item: PriceData) =>
                item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0
            );

            if (prices.length > 0) {
                return { symbol: yahooSymbol, prices };
            }
        } catch (err) {
            console.error(`Yahoo Finance error for ${yahooSymbol}:`, err);
            continue;
        }
    }

    return null;
}

// 네이버 금융에서 데이터 가져오기 시도
async function tryNaverFinance(
    symbol: string,
    period: string
): Promise<{ prices: PriceData[] } | null> {
    try {
        const stockCode = extractStockCode(symbol);

        // 기간에 따른 데이터 개수 설정
        const countMap: Record<string, number> = {
            '1d': 1,
            '5d': 5,
            '1mo': 30,
            '3mo': 90,
            '1y': 365,
        };
        const count = countMap[period] || 30;

        // 네이버 금융 일별 시세 API
        const url = `https://fchart.stock.naver.com/siseJson.naver?symbol=${stockCode}&requestType=1&startTime=20200101&endTime=20991231&timeframe=day&count=${count}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://finance.naver.com/',
            },
        });

        if (!response.ok) {
            console.error(`Naver Finance HTTP error: ${response.status}`);
            return null;
        }

        const text = await response.text();

        // 네이버 응답은 JavaScript 배열 형태 (JSON이 아님)
        // [["날짜", "시가", "고가", "저가", "종가", "거래량"], [...], ...]
        // 첫 줄은 헤더, 나머지가 데이터
        const cleanedText = text
            .replace(/'/g, '"')  // 작은따옴표를 큰따옴표로
            .replace(/\s/g, '')   // 공백 제거
            .trim();

        // eslint-disable-next-line no-eval
        const parsed = eval(cleanedText) as string[][];

        if (!Array.isArray(parsed) || parsed.length < 2) {
            console.error('Naver Finance: No data in response');
            return null;
        }

        // 첫 번째 행은 헤더, 나머지가 데이터
        const dataRows = parsed.slice(1);

        const prices: PriceData[] = dataRows
            .map((row: string[]) => {
                // [날짜, 시가, 고가, 저가, 종가, 거래량]
                const dateStr = String(row[0]);
                const year = parseInt(dateStr.substring(0, 4));
                const month = parseInt(dateStr.substring(4, 6)) - 1;
                const day = parseInt(dateStr.substring(6, 8));

                return {
                    date: new Date(year, month, day).getTime(),
                    open: parseFloat(row[1]) || 0,
                    high: parseFloat(row[2]) || 0,
                    low: parseFloat(row[3]) || 0,
                    close: parseFloat(row[4]) || 0,
                    volume: parseFloat(row[5]) || 0,
                };
            })
            .filter((item: PriceData) =>
                item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0
            )
            .sort((a: PriceData, b: PriceData) => a.date - b.date); // 날짜 오름차순 정렬

        if (prices.length > 0) {
            console.log(`Naver Finance success: ${prices.length} data points for ${stockCode}`);
            return { prices };
        }

        return null;
    } catch (err) {
        console.error('Naver Finance error:', err);
        return null;
    }
}

// 한국 주식 심볼을 Yahoo Finance 형식으로 변환
function convertToYahooSymbol(symbol: string): string[] {
    if (symbol.endsWith('.KS') || symbol.endsWith('.KQ')) {
        return [symbol];
    }

    if (/^\d{6}$/.test(symbol)) {
        return [`${symbol}.KS`, `${symbol}.KQ`];
    }

    return [symbol.toUpperCase()];
}

// 기간별 range와 interval 설정
function getPeriodConfig(period: string): { range: string; interval: string } {
    const configs: Record<string, { range: string; interval: string }> = {
        '1d': { range: '1d', interval: '5m' },
        '5d': { range: '5d', interval: '1h' },
        '1mo': { range: '1mo', interval: '1d' },
        '3mo': { range: '3mo', interval: '1d' },
        '1y': { range: '1y', interval: '1d' },
    };

    return configs[period] || configs['1mo'];
}
