'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import type { CoinTransaction } from '@/app/types/coins'
import { supabase } from '@/app/lib/supabaseClient'

interface UseCoinsReturn {
  balance: number
  transactions: CoinTransaction[]
  loading: boolean
  error: string | null
  refreshBalance: () => Promise<void>
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function useCoins(user: User | null): UseCoinsReturn {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<CoinTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshBalance = useCallback(async () => {
    if (!user) return
    try {
      const token = await getAuthToken()
      if (!token) return
      const res = await fetch('/api/coins/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setBalance(data.balance ?? 0)
    } catch {
      // 조용히 실패
    }
  }, [user])

  const loadTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await getAuthToken()
      if (!token) return
      const res = await fetch('/api/coins/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setTransactions(data.transactions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '내역 로딩 실패')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      refreshBalance()
      loadTransactions()
    } else {
      setBalance(0)
      setTransactions([])
    }
  }, [user, refreshBalance, loadTransactions])

  return { balance, transactions, loading, error, refreshBalance }
}
