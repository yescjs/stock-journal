import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Check if a symbol is a Korean stock
function isKoreanStock(symbol: string): boolean {
    return /^\d{6}$/.test(symbol) || symbol.endsWith('.KS') || symbol.endsWith('.KQ');
}

// Extract pure stock code from symbol
function extractStockCode(symbol: string): string {
    return symbol.replace(/\.(KS|KQ)$/i, '');
}

// Convert symbol to Yahoo Finance format
function convertToYahooSymbol(symbol: string): string[] {
    if (symbol.endsWith('.KS') || symbol.endsWith('.KQ')) return [symbol];
    if (/^\d{6}$/.test(symbol)) return [`${symbol}.KS`, `${symbol}.KQ`];
    return [symbol.toUpperCase()];
}

// Fetch current price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<number | null> {
    const yahooSymbols = convertToYahooSymbol(symbol);

    for (const yahooSymbol of yahooSymbols) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            if (!response.ok) continue;

            const data = await response.json();
            const result = data.chart?.result?.[0];
            if (!result) continue;

            // Get the most recent close price
            const meta = result.meta;
            const regularMarketPrice = meta?.regularMarketPrice;
            if (regularMarketPrice && regularMarketPrice > 0) {
                return regularMarketPrice;
            }

            // Fallback: last close from quote data
            const quote = result.indicators?.quote?.[0];
            const closes = quote?.close?.filter((c: number | null) => c !== null && c > 0);
            if (closes && closes.length > 0) {
                return closes[closes.length - 1];
            }
        } catch (err) {
            console.error(`Yahoo price error for ${yahooSymbol}:`, err);
            continue;
        }
    }
    return null;
}

// Fetch current price from Naver Finance (Korean stocks)
async function fetchNaverPrice(symbol: string): Promise<number | null> {
    try {
        const stockCode = extractStockCode(symbol);
        const url = `https://fchart.stock.naver.com/siseJson.naver?symbol=${stockCode}&requestType=1&startTime=20200101&endTime=20991231&timeframe=day&count=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://finance.naver.com/',
            },
        });

        if (!response.ok) return null;

        const text = await response.text();
        const cleanedText = text.replace(/'/g, '"').replace(/\s/g, '').trim();
        const parsed = JSON.parse(cleanedText) as string[][];

        if (!Array.isArray(parsed) || parsed.length < 2) return null;

        // Last row's close price (index 4)
        const lastRow = parsed[parsed.length - 1];
        const closePrice = parseFloat(lastRow[4]);
        return closePrice > 0 ? closePrice : null;
    } catch (err) {
        console.error('Naver price error:', err);
        return null;
    }
}

// GET /api/stock-price?symbols=AAPL,005930,TSLA
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbolsParam = searchParams.get('symbols');

        if (!symbolsParam) {
            return NextResponse.json(
                { error: 'symbols parameter is required' },
                { status: 400 }
            );
        }

        const SYMBOL_PATTERN = /^[A-Za-z0-9.\-^]{1,20}$/;
        const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean)
            .slice(0, 20)
            .filter(s => SYMBOL_PATTERN.test(s));
        if (symbols.length === 0) {
            return NextResponse.json(
                { error: 'At least one symbol is required' },
                { status: 400 }
            );
        }

        // Fetch prices in parallel (limit concurrency to 5)
        const BATCH_SIZE = 5;
        const prices: Record<string, number> = {};

        for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
            const batch = symbols.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map(async (symbol) => {
                    // Try Yahoo Finance first
                    let price = await fetchYahooPrice(symbol);

                    // Fallback to Naver for Korean stocks
                    if (price === null && isKoreanStock(symbol)) {
                        price = await fetchNaverPrice(symbol);
                    }

                    return { symbol, price };
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.price !== null) {
                    prices[result.value.symbol] = result.value.price;
                }
            }
        }

        return NextResponse.json({ prices });
    } catch (error: unknown) {
        console.error('Stock price API error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Server error', message },
            { status: 500 }
        );
    }
}
