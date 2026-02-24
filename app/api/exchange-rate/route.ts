import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_RATE = 1350;

/**
 * Fetch USD/KRW exchange rate from Yahoo Finance.
 * GET /api/exchange-rate → { rate: number }
 */
export async function GET() {
    try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=1d';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            console.error(`Yahoo Finance exchange rate HTTP ${response.status}`);
            return NextResponse.json({ rate: DEFAULT_RATE, source: 'fallback' });
        }

        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;
        const rate = meta?.regularMarketPrice;

        if (rate && rate > 0) {
            return NextResponse.json({ rate, source: 'yahoo' });
        }

        // Fallback: try previous close
        const prevClose = meta?.previousClose;
        if (prevClose && prevClose > 0) {
            return NextResponse.json({ rate: prevClose, source: 'yahoo-prev' });
        }

        return NextResponse.json({ rate: DEFAULT_RATE, source: 'fallback' });
    } catch (error: unknown) {
        console.error('Exchange rate API error:', error);
        return NextResponse.json({ rate: DEFAULT_RATE, source: 'fallback' });
    }
}
