'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import type { CoinTransaction } from '@/app/types/coins'
import * as PortOne from '@portone/browser-sdk/v2'
import { supabase } from '@/app/lib/supabaseClient'

export interface CustomerInfo {
  fullName: string
  phoneNumber: string
}

interface PurchaseResult {
  success: boolean
  message: string
}

interface UseCoinsReturn {
  balance: number
  transactions: CoinTransaction[]
  loading: boolean
  error: string | null
  purchaseCoins: (packageIndex: number, customer: CustomerInfo) => Promise<PurchaseResult>
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

  const purchaseCoins = useCallback(async (packageIndex: number, customer: CustomerInfo): Promise<PurchaseResult> => {
    if (!user) return { success: false, message: '로그인이 필요합니다.' }
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
      const { orderId, amount, orderName } = await prepRes.json()

      // 2. 포트원 결제창 열기 (Promise 방식, 리다이렉트 없음)
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
      if (!storeId || !channelKey) {
        throw new Error('포트원 설정이 누락되었습니다. 환경 변수를 확인하세요.')
      }

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId: orderId,
        orderName,
        totalAmount: amount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customer: {
          fullName: customer.fullName,
          phoneNumber: customer.phoneNumber,
          email: user.email,
        },
      })

      if (!response || response.code != null) {
        // 사용자가 결제를 취소했거나 에러 발생
        const msg = response?.message ?? '결제가 취소되었습니다.'
        throw new Error(msg)
      }

      // 3. 서버에서 결제 검증
      const confirmRes = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId: response.paymentId,
          orderId,
        }),
      })

      if (!confirmRes.ok) {
        const errData = await confirmRes.json().catch(() => ({}))
        throw new Error(errData.error || '결제 확인 실패')
      }

      await refreshBalance()
      setLoading(false)
      return { success: true, message: '코인 충전이 완료되었습니다!' }
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 오류'
      setError(message)
      setLoading(false)
      return { success: false, message }
    }
  }, [user, refreshBalance])

  return { balance, transactions, loading, error, purchaseCoins, refreshBalance }
}
