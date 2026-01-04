export interface MarketDiary {
    id: string;
    user_id?: string;
    date: string; // YYYY-MM-DD
    
    // Market Conditions
    market_sentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
    market_issue?: string; // Major news or theme of the day
    
    // Personal Status
    my_condition: number; // 1-5 score
    my_emotion: string; // Free text or tags
    
    // Review
    good_points?: string; // What I did well
    bad_points?: string; // What I did wrong
    improvement?: string; // Plan for tomorrow
    
    created_at?: string;
}
