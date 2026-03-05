export type CoinTransactionType = 'signup_bonus' | 'purchase' | 'spend' | 'refund'

export interface CoinTransaction {
  id: string
  user_id: string
  type: CoinTransactionType
  amount: number
  balance_after: number
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

export interface PaymentOrder {
  id: string
  user_id: string
  order_id: string
  amount: number
  coins: number
  status: 'pending' | 'completed' | 'failed'
  portone_payment_id: string | null
  created_at: string
}

export const COIN_COSTS = {
  weekly_report: 5,
  trade_review: 1,
} as const

export const COIN_PACKAGES = [
  { coins: 10, price: 1000, label: '10코인', description: '1,000원', badge: null },
  { coins: 30, price: 3000, label: '30코인', description: '3,000원', badge: '인기' },
  { coins: 100, price: 9000, label: '100코인', description: '9,000원 (10% 할인)', badge: '할인' },
] as const
