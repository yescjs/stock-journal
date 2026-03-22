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

  const fetchWithAuth = useCallback(async (url: string): Promise<Response | null> => {
    let token = await getAuthToken()
    if (!token) return null

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

    if (res.status === 401) {
      const { data } = await supabase.auth.refreshSession()
      token = data.session?.access_token ?? null
      if (!token) return null
      return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    }

    return res
  }, [])

  const refreshBalance = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetchWithAuth('/api/coins/balance')
      if (!res) return
      const data = await res.json()
      setBalance(data.balance ?? 0)
    } catch {
      // 조용히 실패
    }
  }, [user, fetchWithAuth])

  const loadTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/coins/transactions')
      if (!res) return
      const data = await res.json()
      setTransactions(data.transactions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [user, fetchWithAuth])

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
