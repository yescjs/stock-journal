# Daily Coins Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stripe 결제 기능을 완전히 제거하고, Supabase pg_cron으로 매일 자정(UTC 15:00) 모든 사용자 코인 잔액을 10으로 리셋한다.

**Architecture:** pg_cron이 `reset_daily_coins()` DB 함수를 매일 실행해 `user_coins` 잔액을 10으로 UPSERT하고 `coin_transactions`에 기록한다. 프론트엔드는 결제 관련 코드를 삭제하고, `CoinShopModal`을 잔액/내역 안내 모달로 개편한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (PostgreSQL + pg_cron), Tailwind CSS, Framer Motion, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-16-daily-coins-design.md`

---

## Chunk 1: DB 마이그레이션

### Task 1: Supabase 마이그레이션 파일 작성

**Files:**
- Create: `supabase/migrations/20260316_daily_coin_reset.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

`supabase/migrations/20260316_daily_coin_reset.sql`을 생성한다:

```sql
-- 1. coin_transactions.type CHECK 제약 조건 업데이트
--    purchase 제거, daily_bonus 추가, refund 유지 (AI 분석 오류 환불에 사용)
ALTER TABLE public.coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_type_check
    CHECK (type IN ('signup_bonus', 'daily_bonus', 'spend', 'refund'));

-- 2. payment_orders 테이블 삭제
DROP TABLE IF EXISTS public.payment_orders;

-- 3. 일일 코인 리셋 함수
--    auth.users 기준 UPSERT → user_coins 행이 없는 신규 유저도 포함
CREATE OR REPLACE FUNCTION public.reset_daily_coins()
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance)
  SELECT id, 10 FROM auth.users
  ON CONFLICT (user_id) DO UPDATE SET balance = 10, updated_at = now();

  -- amount=10은 실제 증감분이 아닌 "리셋 후 잔액"을 의미한다 (의도적).
  -- 이전 잔액에 관계없이 매일 10코인으로 갱신되는 리셋 방식이므로 항상 10을 기록한다.
  INSERT INTO public.coin_transactions (user_id, type, amount, balance_after)
  SELECT user_id, 'daily_bonus', 10, 10 FROM public.user_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. pg_cron 스케줄 등록 (KST 자정 = UTC 15:00)
--    사전 조건: Supabase 대시보드 → Database → Extensions → pg_cron 활성화 필요
--    idempotent: 이미 등록된 경우 먼저 제거 후 재등록
SELECT cron.unschedule('daily-coin-reset')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-coin-reset');
SELECT cron.schedule('daily-coin-reset', '0 15 * * *', 'SELECT public.reset_daily_coins()');
```

- [ ] **Step 2: Supabase MCP로 마이그레이션 적용**

Supabase MCP `apply_migration` 도구로 마이그레이션을 실행한다. 실행 전 `list_migrations`로 기존 마이그레이션 목록을 확인해 충돌이 없는지 검증한다.

- [ ] **Step 3: 마이그레이션 결과 검증**

Supabase MCP `execute_sql`로 다음을 확인한다:

```sql
-- coin_transactions type 제약 확인
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.coin_transactions'::regclass
  AND conname = 'coin_transactions_type_check';

-- payment_orders 테이블 삭제 확인
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'payment_orders';
-- 결과: 0 rows

-- reset_daily_coins 함수 존재 확인
SELECT proname FROM pg_proc WHERE proname = 'reset_daily_coins';
-- 결과: reset_daily_coins

-- cron job 등록 확인 (결과: daily-coin-reset 행 1개)
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'daily-coin-reset';
```

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260316_daily_coin_reset.sql
git commit -m "feat: add daily coin reset migration (pg_cron + reset_daily_coins)"
```

---

## Chunk 2: 결제 파일 삭제

### Task 2: Stripe 관련 파일 및 패키지 제거

**Files:**
- Delete: `app/api/payment/prepare/route.ts`
- Delete: `app/api/payment/confirm/route.ts`
- Delete: `app/payment/success/page.tsx`
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: 결제 API 라우트 삭제**

```bash
rm -rf app/api/payment
rm -rf app/payment
```

- [ ] **Step 2: stripe 패키지 제거**

```bash
npm uninstall stripe
```

- [ ] **Step 3: 빌드 오류 확인**

```bash
npm run build 2>&1 | head -50
```

stripe import가 남아있으면 오류 발생. 없어야 정상.

- [ ] **Step 4: 커밋**

```bash
git add app/api/payment app/payment package.json package-lock.json
git commit -m "feat: remove stripe payment files and dependency"
```

---

## Chunk 3: 타입 및 훅 수정

### Task 3: `app/types/coins.ts` 업데이트

**Files:**
- Modify: `app/types/coins.ts`

- [ ] **Step 1: 파일 수정**

`app/types/coins.ts`를 다음으로 교체한다:

```ts
export type CoinTransactionType = 'signup_bonus' | 'daily_bonus' | 'spend' | 'refund'

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
} as const
```

삭제: `PaymentOrder` 인터페이스, `COIN_PACKAGES` 상수, `purchase`/`refund` 타입 → `'refund'`는 유지.

- [ ] **Step 2: 타입 오류 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

`COIN_PACKAGES`, `PaymentOrder`를 참조하던 코드가 있으면 오류 발생. 다음 태스크에서 수정한다.

---

### Task 4: `app/hooks/useCoins.ts` 단순화

**Files:**
- Modify: `app/hooks/useCoins.ts`

- [ ] **Step 1: 파일 수정**

`app/hooks/useCoins.ts`를 다음으로 교체한다:

```ts
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
```

- [ ] **Step 2: 타입 오류 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: 커밋**

```bash
git add app/types/coins.ts app/hooks/useCoins.ts
git commit -m "feat: simplify coins types and hook - remove purchase logic"
```

---

## Chunk 4: UI 수정

### Task 5: `CoinShopModal` 개편

**Files:**
- Modify: `app/components/CoinShopModal.tsx`

- [ ] **Step 1: 파일 수정**

`app/components/CoinShopModal.tsx`를 다음으로 교체한다:

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X, Coins, CalendarClock, Zap } from 'lucide-react'
import type { CoinTransaction } from '@/app/types/coins'
import { COIN_COSTS } from '@/app/types/coins'

const TRANSACTION_LABELS: Record<string, string> = {
  daily_bonus: '일일 코인 지급',
  signup_bonus: '가입 보너스',
  spend: '코인 사용',
  refund: '환불',
}

interface CoinShopModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  transactions: CoinTransaction[]
}

export function CoinShopModal({ isOpen, onClose, balance, transactions }: CoinShopModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl p-6 max-w-lg mx-auto max-h-[90vh] overflow-y-auto"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">코인</h2>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 현재 잔액 */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">현재 잔액: {balance}코인</span>
            </div>

            {/* 일일 지급 안내 */}
            <div className="flex items-start gap-3 mb-6 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <CalendarClock className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-blue-300 font-semibold text-sm">매일 자정 10코인 자동 지급</p>
                <p className="text-blue-400/70 text-xs mt-0.5">코인은 매일 자정에 10코인으로 갱신됩니다. 누적되지 않습니다.</p>
              </div>
            </div>

            {/* 코인 사용 안내 */}
            <div className="mb-6 p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-2 font-medium">코인 사용 안내</p>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">주간 AI 리포트</span>
                <span className="text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />{COIN_COSTS.weekly_report}코인
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">거래 AI 리뷰</span>
                <span className="text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />{COIN_COSTS.trade_review}코인
                </span>
              </div>
            </div>

            {/* 거래 내역 */}
            <div>
              <p className="text-xs text-gray-400 mb-3 font-medium">최근 거래 내역</p>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">거래 내역이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-300">{TRANSACTION_LABELS[tx.type] ?? tx.type}</span>
                        <span className="text-gray-500 text-xs ml-2">
                          {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                        <span className="text-gray-500 text-xs ml-2">잔액 {tx.balance_after}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: 타입 오류 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

### Task 6: `app/trade/page.tsx` Props 정리

**Files:**
- Modify: `app/trade/page.tsx`

- [ ] **Step 1: Coins 훅 destructure 수정**

`app/trade/page.tsx` 51번째 줄 근처를 수정한다:

```ts
// 변경 전
const { balance: coinBalance, purchaseCoins, refreshBalance, loading: coinsLoading, error: coinsError } = useCoins(currentUser);

// 변경 후 (loading은 CoinBalance 로딩 인디케이터에 사용하므로 유지)
const { balance: coinBalance, transactions: coinTransactions, loading: coinsLoading, refreshBalance } = useCoins(currentUser);
```

- [ ] **Step 2: CoinShopModal JSX 수정**

332번째 줄 근처 `CoinShopModal` 사용 부분을 수정한다:

```tsx
// 변경 전
<CoinShopModal
    isOpen={showCoinShop}
    onClose={() => setShowCoinShop(false)}
    balance={coinBalance}
    user={currentUser}
    onPurchase={async (idx) => {
        if (!currentUser) {
            setShowCoinShop(false);
            setShowLoginModal(true);
            return;
        }
        const result = await purchaseCoins(idx);
        if (result.success) {
            showNotify('success', result.message);
            setShowCoinShop(false);
        } else {
            showNotify('error', result.message);
        }
    }}
    purchasing={coinsLoading}
    error={coinsError}
/>

// 변경 후
<CoinShopModal
    isOpen={showCoinShop}
    onClose={() => setShowCoinShop(false)}
    balance={coinBalance}
    transactions={coinTransactions}
/>
```

- [ ] **Step 3: 타입 오류 및 빌드 확인**

```bash
npx tsc --noEmit 2>&1
npm run build 2>&1 | tail -20
```

빌드가 성공해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add app/components/CoinShopModal.tsx app/trade/page.tsx
git commit -m "feat: redesign CoinShopModal as daily info modal, remove purchase props"
```

---

## Chunk 5: 환불 페이지 교체 및 최종 정리

### Task 7: `app/refund/page.tsx` 내용 교체

**Files:**
- Modify: `app/refund/page.tsx`

- [ ] **Step 1: 파일 수정**

`app/refund/page.tsx`를 다음으로 교체한다:

```tsx
import { Footer } from '@/app/components/Footer'

export const metadata = {
  title: '코인 안내 - StockJournal',
}

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">코인 안내</h1>
        <div className="space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">코인 지급 방식</h2>
            <p>
              StockJournal의 코인은 매일 자정 자동으로 10코인이 지급됩니다.
              코인은 누적되지 않으며 매일 잔액이 10코인으로 갱신됩니다.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">코인 구매 및 환불</h2>
            <p>
              현재 코인은 무료로 제공되며 별도 구매 또는 환불은 지원하지 않습니다.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: 최종 빌드 확인**

```bash
npm run build 2>&1 | tail -30
```

오류 없이 빌드 성공해야 한다.

- [ ] **Step 3: 개발 서버로 UI 동작 확인**

```bash
npm run dev
```

브라우저에서 `/trade` 접속 → 코인 아이콘 클릭 → 모달에 잔액, 일일 지급 안내, 코인 사용 안내, 거래 내역이 표시되는지 확인. 결제 버튼이 없어야 한다.

- [ ] **Step 4: 최종 커밋**

```bash
git add app/refund/page.tsx
git commit -m "feat: replace refund page with free coin info page"
```

---

## 환경 변수 정리 (수동)

`.env.local`에서 다음 키를 삭제한다 (있는 경우):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

> ⚠️ 배포 환경(Vercel 등)의 환경 변수 설정에서도 동일하게 제거한다.

---

## 완료 체크리스트

- [ ] `supabase/migrations/20260316_daily_coin_reset.sql` 마이그레이션 적용 확인
- [ ] `stripe` 패키지 제거 완료
- [ ] `app/api/payment/` 폴더 삭제 완료
- [ ] `app/payment/` 폴더 삭제 완료
- [ ] `app/types/coins.ts` — `purchase` 타입 제거, `daily_bonus` 추가, `COIN_PACKAGES`/`PaymentOrder` 삭제
- [ ] `app/hooks/useCoins.ts` — `purchaseCoins` 제거
- [ ] `app/components/CoinShopModal.tsx` — 정보 모달로 개편
- [ ] `app/trade/page.tsx` — 결제 관련 props 제거
- [ ] `app/refund/page.tsx` — 무료 코인 안내 페이지로 교체
- [ ] `npm run build` 성공
- [ ] 환경 변수 정리 완료
