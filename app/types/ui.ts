export type ActiveTab = 'journal';
export type SortKey = 'date' | 'symbol' | 'amount';

export type SortState = {
    key: SortKey;
    dir: 'asc' | 'desc';
};

export type TagFilterMode = 'AND' | 'OR';

export type NotifyType = 'success' | 'error' | 'info';
