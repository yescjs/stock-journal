export type TradeSide = 'BUY' | 'SELL';

export interface Trade {
  id: string;            // Supabase uuid or guest-... string
  date: string;          // YYYY-MM-DD
  symbol: string;
  symbol_name?: string;  // Display name (e.g., "Samsung Electronics Co., Ltd.")
  side: TradeSide;
  price: number;
  quantity: number;
  user_id?: string;      // Optional, for DB compatibility
  created_at?: string;

  // 전략 관련 필드
  strategy_id?: string;      // 사용된 전략 ID
  strategy_name?: string;    // 전략 이름 (조인용/게스트용)
  emotion_tag?: string;      // 심리 상태 (PLANNED, FOMO, FEAR 등)

  // Deprecated: kept for DB compatibility, not used in UI
  memo?: string;
  tags?: string[];
  image?: string;
  entry_reason?: string;
  exit_reason?: string;
}

