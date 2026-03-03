'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import type { CoinTransaction } from '@/app/types/coins'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { supabase } from '@/app/lib/supabaseClient'

interface UseCoinsReturn {
  balance: number
  transactions: CoinTransaction[]
  loading: boolean
  error: string | null
  purchaseCoins: (packageIndex?: number) => Promise<void>
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
    try {
      const token = await getAuthToken()
      if (!token) return
      const res = await fetch('/api/coins/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setTransactions(data.transactions ?? [])
    } catch {
      // 조용히 실패
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

  const purchaseCoins = useCallback(async (packageIndex = 0) => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('로그인이 필요합니다.')

      // 1. 결제 준비
      const prepRes = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageIndex }),
      })
      if (!prepRes.ok) {
        const errData = await prepRes.json().catch(() => ({}))
        throw new Error(errData.error || '결제 준비 실패')
      }
      const { orderId, amount, coins, orderName } = await prepRes.json()

      // 2. Toss 결제창 열기
      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      if (!tossClientKey) throw new Error('Toss 클라이언트 키가 설정되지 않았습니다. .env.local을 확인하세요.')

      const toss = await loadTossPayments(tossClientKey)
      const payment = toss.payment({ customerKey: user.id })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName,
        successUrl: `${window.location.origin}/trade?payment=success&orderId=${orderId}`,
        failUrl: `${window.location.origin}/trade?payment=fail`,
      })
      // requestPayment는 리다이렉트를 트리거하므로 이후 코드는 실행되지 않음
      void coins // suppress unused warning
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 오류')
    } finally {
      setLoading(false)
    }
  }, [user])

  return { balance, transactions, loading, error, purchaseCoins, refreshBalance }
}
