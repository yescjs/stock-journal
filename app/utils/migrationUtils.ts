import { Trade } from '@/app/types/trade';

export const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';

/**
 * Reads and parses guest trades from localStorage.
 * Returns empty array if none exist or parsing fails.
 */
export function readGuestTrades(): Trade[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(GUEST_TRADES_KEY);
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Filters incoming guest trades against existing trades to remove duplicates.
 * Duplicate key: date + symbol + side + price
 */
export function deduplicateGuestTrades(
    incoming: Trade[],
    existing: Trade[]
): Omit<Trade, 'id' | 'user_id' | 'created_at'>[] {
    const existingSet = new Set(
        existing.map(t => `${t.date}|${t.symbol}|${t.side}|${t.price}`)
    );
    return incoming
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ id, user_id, created_at, ...rest }) => rest)
        .filter(t => !existingSet.has(`${t.date}|${t.symbol}|${t.side}|${t.price}`));
}
