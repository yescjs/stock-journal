// GET /api/stock-news-sentiment?symbol=AAPL&date=2024-01-15
// Fetches news sentiment from Alpha Vantage NEWS_SENTIMENT API
// Only supports US stocks (not KRW/Korean codes)
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type SentimentLabel = 'Bullish' | 'Slightly Bullish' | 'Neutral' | 'Slightly Bearish' | 'Bearish';

function scoreToLabel(score: number): SentimentLabel {
  if (score >= 0.35) return 'Bullish';
  if (score >= 0.15) return 'Slightly Bullish';
  if (score > -0.15) return 'Neutral';
  if (score > -0.35) return 'Slightly Bearish';
  return 'Bearish';
}

function isKRWSymbol(symbol: string): boolean {
  return /^\d{6}$/.test(symbol) || symbol.endsWith('.KS') || symbol.endsWith('.KQ');
}

// Format date as AlphaVantage time_from/time_to: YYYYMMDDTHHMM
function formatAVDate(dateStr: string, isEnd = false): string {
  const d = new Date(dateStr);
  if (isEnd) d.setDate(d.getDate() + 3);
  else d.setDate(d.getDate() - 3);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T0000`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');

  if (!symbol || !date) {
    return NextResponse.json({ error: 'Missing symbol or date' }, { status: 400 });
  }

  if (isKRWSymbol(symbol)) {
    return NextResponse.json({ error: 'KRW stocks not supported', sentimentScore: null }, { status: 200 });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ALPHA_VANTAGE_API_KEY not configured', sentimentScore: null }, { status: 200 });
  }

  try {
    const timeFrom = formatAVDate(date, false);
    const timeTo = formatAVDate(date, true);
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(symbol)}&time_from=${timeFrom}&time_to=${timeTo}&limit=20&apikey=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return NextResponse.json({ error: 'Alpha Vantage API error', sentimentScore: null }, { status: 200 });
    }

    const data = await res.json();

    // Alpha Vantage rate limit response
    if (data['Information'] || data['Note']) {
      return NextResponse.json({ error: 'API rate limit', sentimentScore: null }, { status: 200 });
    }

    const feed: Record<string, unknown>[] = data?.feed ?? [];
    if (feed.length === 0) {
      return NextResponse.json({ sentimentScore: null, sentimentLabel: 'Neutral', topHeadlines: [] }, { status: 200 });
    }

    // Extract ticker-specific sentiment scores and headlines
    let totalScore = 0;
    let count = 0;
    const headlines: string[] = [];

    for (const article of feed) {
      const tickerSentiments = (article['ticker_sentiment'] as Record<string, unknown>[] | undefined) ?? [];
      const tickerData = tickerSentiments.find(
        ts => (ts['ticker'] as string)?.toUpperCase() === symbol.toUpperCase()
      );
      if (tickerData) {
        const score = parseFloat(tickerData['ticker_sentiment_score'] as string);
        if (!isNaN(score)) {
          totalScore += score;
          count++;
        }
      }
      if (headlines.length < 3 && typeof article['title'] === 'string') {
        headlines.push(article['title'] as string);
      }
    }

    if (count === 0) {
      return NextResponse.json({ sentimentScore: null, sentimentLabel: 'Neutral', topHeadlines: headlines }, { status: 200 });
    }

    const avgScore = totalScore / count;
    const sentimentLabel = scoreToLabel(avgScore);

    return NextResponse.json({
      sentimentScore: parseFloat(avgScore.toFixed(3)),
      sentimentLabel,
      topHeadlines: headlines,
    });
  } catch (err) {
    console.error('News sentiment fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch news sentiment', sentimentScore: null }, { status: 200 });
  }
}
