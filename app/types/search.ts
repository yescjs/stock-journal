// Stock search types

export interface StockSearchResult {
    symbol: string;
    name: string;
    exchange: string;
}

export interface StockSearchResponse {
    results: StockSearchResult[];
}
