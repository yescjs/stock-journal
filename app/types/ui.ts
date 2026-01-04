export type ActiveTab = 'journal' | 'stats' | 'diary' | 'settings';
export type SortKey = 'date' | 'symbol' | 'amount';

export type SymbolSortKey =
    | 'symbol'
    | 'positionQty'
    | 'avgCost'
    | 'totalBuyAmount'
    | 'totalSellAmount'
    | 'realizedPnL'
    | 'currentPrice'
    | 'positionValue'
    | 'unrealizedPnL'
    | 'winRate';

export type TagSortKey =
    | 'tag'
    | 'tradeCount'
    | 'winRate'
    | 'realizedPnL'
    | 'avgPnLPerTrade';

export type SortState = {
    key: SortKey;
    dir: 'asc' | 'desc';
};

export type TagFilterMode = 'AND' | 'OR';

export type NotifyType = 'success' | 'error' | 'info';
