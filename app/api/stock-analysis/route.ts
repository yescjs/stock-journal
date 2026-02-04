import { NextRequest, NextResponse } from 'next/server';
import { StockAnalysisResponse, RSIIndicator, BBANDSIndicator } from '@/app/types/stock';

export const dynamic = 'force-dynamic';

const API_BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

type CacheEntry = {
    updatedAt: number;
    data: StockAnalysisResponse;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<StockAnalysisResponse>>();
let rateLimitUntil = 0;

function getCache(key: string): CacheEntry | null {
    const entry = cache.get(key);
    if (!entry) return null;
    return entry;
}

function setCache(key: string, data: StockAnalysisResponse) {
    cache.set(key, { data, updatedAt: Date.now() });
    if (cache.size > 200) {
        const oldestKey = cache.keys().next().value as string | undefined;
        if (oldestKey) cache.delete(oldestKey);
    }
}

function mapPeriodToInterval(period: string): string {
    if (period === '1d' || period === '5d') return '60min';
    return 'daily';
}

function parseLatestValue<T extends Record<string, string>>(
    payload: Record<string, T> | undefined
): { timestamp: number; data: T } | null {
    if (!payload) return null;
    const keys = Object.keys(payload);
    if (keys.length === 0) return null;
    const latestKey = keys.sort().pop();
    if (!latestKey) return null;
    const timestamp = new Date(latestKey).getTime();
    if (Number.isNaN(timestamp)) return null;
    return { timestamp, data: payload[latestKey] };
}

function getRSIStatus(value: number): RSIIndicator['status'] {
    if (value >= 70) return 'overbought';
    if (value <= 30) return 'oversold';
    return 'neutral';
}


async function fetchIndicator(url: string) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data['Information']) {
        throw new Error(String(data['Information']));
    }
    if (data['Error Message']) {
        throw new Error(data['Error Message']);
    }
    if (data['Note']) {
        const note = String(data['Note']);
        const error = new Error(note);
        (error as Error & { code?: string }).code = 'RATE_LIMIT';
        throw error;
    }

    return data as Record<string, unknown>;
}

async function fetchAnalysis(
    symbol: string,
    interval: string,
    apiKey: string,
    debugEnabled: boolean
): Promise<StockAnalysisResponse> {
    const baseParams = `symbol=${encodeURIComponent(symbol)}&interval=${interval}&apikey=${apiKey}`;
    const seriesParams = `${baseParams}&series_type=close`;
    const rsiUrl = `${API_BASE_URL}?function=RSI&time_period=14&${seriesParams}`;
    const bbandsUrl = `${API_BASE_URL}?function=BBANDS&time_period=20&nbdevup=2&nbdevdn=2&${seriesParams}`;

    const errors: StockAnalysisResponse['errors'] = {};

    let rsi: RSIIndicator | null = null;
    let bbands: BBANDSIndicator | null = null;
    let asOf: number | null = null;

    const debug: Record<string, unknown> = {};

    let rateLimited = false;

    const rsiResult = await fetchIndicator(rsiUrl).then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason) => ({ status: 'rejected' as const, reason })
    );

    if (rsiResult.status === 'fulfilled') {
        const payload = rsiResult.value['Technical Analysis: RSI'] as Record<string, Record<string, string>> | undefined;
        const latest = parseLatestValue(payload);
        if (latest) {
            const value = parseFloat(latest.data['RSI']);
            if (!Number.isNaN(value)) {
                rsi = {
                    value,
                    status: getRSIStatus(value),
                    asOf: latest.timestamp,
                };
                asOf = Math.max(asOf ?? 0, latest.timestamp);
            }
        } else {
            errors.rsi = 'RSI 데이터가 없습니다';
        }
    } else {
        const reason = rsiResult.reason as Error;
        errors.rsi = reason.message || 'RSI 조회 실패';
        if ((reason as Error & { code?: string }).code === 'RATE_LIMIT') {
            rateLimited = true;
        }
    }

    if (rateLimited) {
        rateLimitUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    }
    if (rateLimited) {
        const error = new Error('RATE_LIMIT');
        (error as Error & { code?: string }).code = 'RATE_LIMIT';
        throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const bbandsResult = await fetchIndicator(bbandsUrl).then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason) => ({ status: 'rejected' as const, reason })
    );

    if (bbandsResult.status === 'fulfilled') {
        const payload = bbandsResult.value['Technical Analysis: BBANDS'] as Record<string, Record<string, string>> | undefined;
        const latest = parseLatestValue(payload);
        if (latest) {
            const upper = parseFloat(latest.data['Real Upper Band']);
            const middle = parseFloat(latest.data['Real Middle Band']);
            const lower = parseFloat(latest.data['Real Lower Band']);
            if (![upper, middle, lower].some(Number.isNaN)) {
                bbands = {
                    upper,
                    middle,
                    lower,
                    asOf: latest.timestamp,
                };
                asOf = Math.max(asOf ?? 0, latest.timestamp);
            }
        } else {
            errors.bbands = 'BBANDS 데이터가 없습니다';
        }
    } else {
        const reason = bbandsResult.reason as Error;
        errors.bbands = reason.message || 'BBANDS 조회 실패';
        if ((reason as Error & { code?: string }).code === 'RATE_LIMIT') {
            rateLimited = true;
        }
    }

    if (rateLimited) {
        rateLimitUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        const error = new Error('RATE_LIMIT');
        (error as Error & { code?: string }).code = 'RATE_LIMIT';
        throw error;
    }

    if (debugEnabled) {
        if (rsiResult.status === 'fulfilled') {
            debug.rsi = { keys: Object.keys(rsiResult.value) };
        } else {
            debug.rsi = { error: (rsiResult.reason as Error).message };
        }
        if (bbandsResult.status === 'fulfilled') {
            debug.bbands = { keys: Object.keys(bbandsResult.value) };
        } else {
            debug.bbands = { error: (bbandsResult.reason as Error).message };
        }
    }

    const partial = !rsi || !bbands;

    if (!rsi && !bbands) {
        return {
            symbol,
            interval,
            asOf,
            rsi,
            macd: null,
            bbands,
            adx: null,
            stoch: null,
            partial: true,
            errors: Object.keys(errors).length ? errors : undefined,
            noData: true,
            debug: debugEnabled ? debug : undefined,
        };
    }

    const response: StockAnalysisResponse = {
        symbol,
        interval,
        asOf,
        rsi,
        macd: null,
        bbands,
        adx: null,
        stoch: null,
        partial,
        errors: Object.keys(errors).length ? errors : undefined,
        debug: debugEnabled ? debug : undefined,
    };
    return response;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const period = searchParams.get('period') || '1mo';
        const debugEnabled = searchParams.get('debug') === '1';

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Alpha Vantage API key' }, { status: 500 });
        }

        const interval = mapPeriodToInterval(period);
        const cacheKey = `${symbol}|${interval}`;
        const cached = getCache(cacheKey);
        if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
            return NextResponse.json(cached.data);
        }

        if (Date.now() < rateLimitUntil) {
            if (cached) {
                return NextResponse.json({ ...cached.data, stale: true });
            }
            return NextResponse.json({ error: 'Alpha Vantage rate limit' }, { status: 429 });
        }

        if (cached) {
            const inflightKey = `refresh:${cacheKey}`;
            if (!inflight.has(inflightKey)) {
                const refreshPromise = fetchAnalysis(symbol, interval, apiKey, debugEnabled)
                    .then((fresh) => {
                        setCache(cacheKey, fresh);
                        return fresh;
                    })
                    .catch(() => cached.data)
                    .finally(() => {
                        inflight.delete(inflightKey);
                    });
                inflight.set(inflightKey, refreshPromise);
            }

            return NextResponse.json({ ...cached.data, stale: true });
        }

        if (inflight.has(cacheKey)) {
            const response = await inflight.get(cacheKey)!;
            return NextResponse.json(response);
        }

        const requestPromise = fetchAnalysis(symbol, interval, apiKey, debugEnabled)
            .then((fresh) => {
                setCache(cacheKey, fresh);
                return fresh;
            })
            .finally(() => {
                inflight.delete(cacheKey);
            });

        inflight.set(cacheKey, requestPromise);

        const response = await requestPromise;
        return NextResponse.json(response);
    } catch (error: unknown) {
        const err = error as Error & { code?: string };
        const message = err.message || 'Unknown error';
        if (err.code === 'RATE_LIMIT') {
            return NextResponse.json({ error: 'Alpha Vantage rate limit' }, { status: 429 });
        }
        return NextResponse.json({ error: '서버 오류가 발생했습니다', message }, { status: 500 });
    }
}
