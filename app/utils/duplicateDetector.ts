import { Trade } from '@/app/types/trade';

export interface DuplicateGroup {
  /** Unique key for this group: date|symbol|side|price|quantity */
  key: string;
  trades: Trade[];
}

/**
 * Find duplicate trade groups based on date + symbol + side + price + quantity.
 * Returns only groups with 2+ trades.
 */
export function findDuplicateGroups(trades: Trade[]): DuplicateGroup[] {
  const groupMap = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = `${trade.date}|${trade.symbol}|${trade.side}|${trade.price}|${trade.quantity}`;
    const group = groupMap.get(key);
    if (group) {
      group.push(trade);
    } else {
      groupMap.set(key, [trade]);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [key, group] of groupMap) {
    if (group.length >= 2) {
      duplicates.push({ key, trades: group });
    }
  }

  // Sort by date descending, then symbol
  duplicates.sort((a, b) => {
    const dateA = a.trades[0].date;
    const dateB = b.trades[0].date;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return a.trades[0].symbol.localeCompare(b.trades[0].symbol);
  });

  return duplicates;
}
