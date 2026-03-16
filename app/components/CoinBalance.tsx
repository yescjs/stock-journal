'use client'

import { Gem } from 'lucide-react'

interface CoinBalanceProps {
  balance: number
  onChargeClick: () => void
  loading?: boolean
}

export function CoinBalance({ balance, onChargeClick, loading }: CoinBalanceProps) {
  return (
    <button
      onClick={onChargeClick}
      title="코인 현황 보기"
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/35 transition-all cursor-pointer"
    >
      <Gem className="w-3.5 h-3.5 text-yellow-400" />
      <span className="text-sm font-semibold text-yellow-400">
        {loading ? '...' : balance}
      </span>
    </button>
  )
}
