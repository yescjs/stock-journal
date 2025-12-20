import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

        // Yahoo Finance Search API 호출
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            console.error('Yahoo Finance Search API error:', response.status);
            return NextResponse.json(
                { results: [] },
                { status: 200 } // Return empty results instead of error
            );
        }

        const data = await response.json();

        // Parse Yahoo Finance response
        const quotes = data.quotes || [];

        // Filter and format results
        const results = quotes
            .filter((quote: any) =>
                quote.symbol &&
                quote.shortname &&
                quote.quoteType === 'EQUITY' // Only stocks
            )
            .map((quote: any) => ({
                symbol: quote.symbol,
                name: quote.shortname || quote.longname || quote.symbol,
                exchange: quote.exchange || 'N/A',
            }))
            .slice(0, 10); // Limit to 10 results

        return NextResponse.json({
            results,
        });

    } catch (error: any) {
        console.error('Stock search API error:', error);
        return NextResponse.json(
            { results: [] },
            { status: 200 } // Return empty results on error
        );
    }
}
