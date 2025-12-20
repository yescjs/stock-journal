export type TradeSide = 'BUY' | 'SELL';

export interface Trade {
  id: string;            // Supabase uuid or guest-... string
  date: string;          // YYYY-MM-DD
  symbol: string;
  symbol_name?: string;  // Display name (e.g., "Samsung Electronics Co., Ltd.")
  side: TradeSide;
  price: number;
  quantity: number;
  memo: string;
  tags?: string[];
  image?: string;        // URL or data URL
  user_id?: string;      // Optional, for DB compatibility
  created_at?: string;
}
