export type CoinTransactionType = 'signup_bonus' | 'daily_bonus' | 'attendance_bonus' | 'spend' | 'refund'

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

export const COIN_COSTS = {
  weekly_report: 5,
  trade_review: 1,
  pre_trade_coach: 1,
  chat_qa: 1,
  report_trend: 1,
} as const

/** Number of free chat_qa questions per day before coins are charged */
export const CHAT_QA_FREE_DAILY = 5
