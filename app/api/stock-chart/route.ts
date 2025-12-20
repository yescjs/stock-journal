import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

        // 한국 주식 심볼 감지 및 변환
        const yahooSymbols = convertToYahooSymbol(symbol);

        // 기간별 interval 설정
        const { range, interval } = getPeriodConfig(period);

        // 여러 심볼 시도 (한국 주식의 경우 .KS와 .KQ 모두 시도)
        let lastError: any = null;

        for (const yahooSymbol of yahooSymbols) {
            try {
                // Yahoo Finance API 호출
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                });

                if (!response.ok) {
                    lastError = { status: response.status, symbol: yahooSymbol };
                    continue; // 다음 심볼 시도
                }

                const data = await response.json();

                // Yahoo Finance 응답 파싱
                const result = data.chart?.result?.[0];
                if (!result) {
                    lastError = { error: 'No data', symbol: yahooSymbol };
                    continue; // 다음 심볼 시도
                }

                const timestamps = result.timestamp || [];
                const quote = result.indicators?.quote?.[0];

                if (!quote || timestamps.length === 0) {
                    lastError = { error: 'Invalid data', symbol: yahooSymbol };
                    continue; // 다음 심볼 시도
                }

                // OHLCV 데이터 변환
                const prices = timestamps.map((timestamp: number, index: number) => ({
                    date: timestamp * 1000, // Convert to milliseconds
                    open: quote.open?.[index] ?? 0,
                    high: quote.high?.[index] ?? 0,
                    low: quote.low?.[index] ?? 0,
                    close: quote.close?.[index] ?? 0,
                    volume: quote.volume?.[index] ?? 0,
                })).filter((item: any) =>
                    // Filter out invalid data points
                    item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0
                );

                // 성공! 데이터 반환
                if (prices.length > 0) {
                    return NextResponse.json({
                        symbol: yahooSymbol,
                        originalSymbol: symbol,
                        prices,
                    });
                }

                lastError = { error: 'No valid data', symbol: yahooSymbol };
            } catch (err: any) {
                lastError = err;
                continue; // 다음 심볼 시도
            }
        }

        // 모든 시도가 실패한 경우
        console.error('All symbol attempts failed:', { symbol, yahooSymbols, lastError });
        return NextResponse.json(
            {
                error: '차트 데이터를 불러올 수 없습니다',
                detail: `종목 코드 '${symbol}'에 대한 데이터를 찾을 수 없습니다. 올바른 종목 코드인지 확인해주세요.`,
                triedSymbols: yahooSymbols,
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

// 한국 주식 심볼을 Yahoo Finance 형식으로 변환
// 여러 가능성을 배열로 반환하여 fallback 지원
function convertToYahooSymbol(symbol: string): string[] {
    // 이미 .KS 또는 .KQ가 붙어있으면 그대로 반환
    if (symbol.endsWith('.KS') || symbol.endsWith('.KQ')) {
        return [symbol];
    }

    // 순수 숫자 6자리면 한국 주식으로 간주
    if (/^\d{6}$/.test(symbol)) {
        // KOSPI(.KS)와 KOSDAQ(.KQ) 둘 다 시도
        return [`${symbol}.KS`, `${symbol}.KQ`];
    }

    // 미국 주식 또는 기타 (대문자 변환)
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

