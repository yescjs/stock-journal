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
  toss_payment_key: string | null
  created_at: string
}

export const COIN_COSTS = {
  weekly_report: 5,
  trade_review: 1,
} as const

export const COIN_PACKAGES = [
  { coins: 30, price: 3000, label: '30코인', description: '3,000원' },
] as const
