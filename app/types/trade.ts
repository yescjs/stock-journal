export type TradeLog = {
  id: string;
  date: string;   // 'YYYY-MM-DD'
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  memo?: string;
  image_url?: string | null;
  created_at?: string;
  tags?: string;
};
