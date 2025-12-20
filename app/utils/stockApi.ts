import { StockChartResponse, ChartPeriod } from '@/app/types/stock';

/**
 * 주식 차트 데이터를 가져옵니다
 */
export async function fetchStockChart(
    symbol: string,
    period: ChartPeriod = '1mo'
): Promise<StockChartResponse> {
    const url = `/api/stock-chart?symbol=${encodeURIComponent(symbol)}&period=${period}`;

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to fetch chart data: ${response.status}`);
    }

    return response.json();
}

/**
 * 한국 주식 심볼인지 확인
 */
export function isKoreanStock(symbol: string): boolean {
    // 6자리 숫자 또는 .KS/.KQ로 끝나는 경우
    return /^\d{6}$/.test(symbol) || symbol.endsWith('.KS') || symbol.endsWith('.KQ');
}

/**
 * 심볼을 표시용 형식으로 변환
 */
export function formatSymbolForDisplay(symbol: string): string {
    // .KS, .KQ 제거
    return symbol.replace(/\.(KS|KQ)$/i, '');
}
