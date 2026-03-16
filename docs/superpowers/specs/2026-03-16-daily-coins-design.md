# 결제 제거 및 일일 코인 자동 지급 설계

**날짜**: 2026-03-16
**상태**: 승인됨

## 배경

결제 서비스 심사 미통과로 Stripe 기반 코인 구매 기능을 제거한다. 대신 매일 자정(KST)에 모든 사용자에게 10코인을 자동으로 지급한다. 코인은 누적되지 않으며 매일 잔액이 10으로 리셋된다.

## 요구사항

- 매일 자정(KST 00:00 = UTC 15:00)에 모든 사용자 코인 잔액을 10으로 리셋
- 코인은 누적 지급이 아닌 매일 갱신(리셋) 방식
- 결제 관련 코드 및 파일 완전 삭제
- `CoinShopModal`은 구매 UI → 일일 지급 안내 + 잔액/거래 내역으로 개편

### 신규 가입자 동일일 리셋 동작

당일 가입한 사용자도 자정 리셋 대상에 포함된다. 가입 시 `signup_bonus`로 받은 잔액이 있더라도, 자정 리셋 후 잔액은 10이 된다. 가입 보너스가 10 이하이므로 사용자에게 불이익은 없으며, 이 동작을 의도적으로 허용한다.

## 구현 방식

**Supabase pg_cron** 사용. 프로젝트가 이미 Supabase를 사용하고 있고 `add_coins` RPC가 존재하므로, DB 내부 크론으로 처리하는 것이 가장 단순하다.

---

## 섹션 1: DB 변경

### 마이그레이션 파일

`supabase/migrations/20260316_daily_coin_reset.sql`

### 1-1. `coin_transactions.type` CHECK 제약 조건 업데이트

`'purchase'` 제거, `'daily_bonus'` 추가. `'refund'`는 AI 분석 실패 시 `/api/ai-analysis/route.ts`에서 사용하므로 **반드시 유지**.

```sql
ALTER TABLE public.coin_transactions
  DROP CONSTRAINT coin_transactions_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_type_check
    CHECK (type IN ('signup_bonus', 'daily_bonus', 'spend', 'refund'));
```

### 1-2. 새 DB 함수 `reset_daily_coins()`

`user_coins` 행이 없는 유저(가입 트리거 실패 등)도 포함하기 위해 `auth.users` 기준 UPSERT 사용:

```sql
CREATE OR REPLACE FUNCTION reset_daily_coins()
RETURNS void AS $$
BEGIN
  -- 모든 유저 잔액을 10으로 리셋 (행이 없는 유저는 INSERT)
  INSERT INTO user_coins (user_id, balance)
  SELECT id, 10 FROM auth.users
  ON CONFLICT (user_id) DO UPDATE SET balance = 10, updated_at = now();

  -- 거래 내역 기록
  INSERT INTO coin_transactions (user_id, type, amount, balance_after)
  SELECT user_id, 'daily_bonus', 10, 10 FROM user_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1-3. pg_cron 스케줄 등록

> **사전 조건**: Supabase 대시보드 → Database → Extensions에서 `pg_cron`이 활성화되어 있어야 한다.

```sql
-- KST 자정 = UTC 15:00
SELECT cron.schedule('daily-coin-reset', '0 15 * * *', 'SELECT reset_daily_coins()');
```

### 1-4. `payment_orders` 테이블 삭제

```sql
DROP TABLE IF EXISTS payment_orders;
```

---

## 섹션 2: 삭제할 파일

| 파일/폴더 | 처리 |
|-----------|------|
| `app/api/payment/prepare/route.ts` | 삭제 |
| `app/api/payment/confirm/route.ts` | 삭제 |
| `app/api/payment/` 폴더 | 삭제 |
| `app/payment/success/page.tsx` | 삭제 |
| `app/payment/` 폴더 | 삭제 |
| `app/refund/page.tsx` | 내용 교체: "코인은 매일 무료로 지급되며 별도 구매 또는 환불은 지원하지 않습니다" 안내 페이지로 대체 |
| `stripe` npm 패키지 | `npm uninstall stripe` |

---

## 섹션 3: 프론트엔드 변경

### 3-1. `app/types/coins.ts`

- `CoinTransactionType`에서 `'purchase'` 제거, `'daily_bonus'` 추가
- `'refund'`는 AI 분석 오류 처리에서 사용하므로 유지
- `PaymentOrder` 인터페이스 삭제
- `COIN_PACKAGES` 상수 삭제
- `COIN_COSTS` 상수는 유지 (코인 사용 비용 안내에 사용)

**변경 후:**
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

### 3-2. `app/hooks/useCoins.ts`

- `purchaseCoins` 함수 및 `PurchaseResult` 인터페이스 제거
- `loading`, `error` 상태는 잔액/내역 로딩용으로 단순화
- 반환값: `{ balance, transactions, loading, error, refreshBalance }`

### 3-3. `app/components/CoinShopModal.tsx`

구매 UI를 제거하고 정보 제공 모달로 개편:

- **상단**: 현재 코인 잔액 표시
- **중단**: "매일 자정 10코인 자동 지급" 안내 배너
- **하단 1**: 코인 사용 비용 안내 (`COIN_COSTS`)
- **하단 2**: 최근 거래 내역 목록 (타입별 한국어 라벨)

**거래 타입 한국어 라벨 맵:**
| 타입 | 라벨 |
|------|------|
| `daily_bonus` | 일일 코인 지급 |
| `signup_bonus` | 가입 보너스 |
| `spend` | 코인 사용 |
| `refund` | 환불 |

삭제: 패키지 카드, 약관 동의 체크박스, 결제 버튼

**Props 변경:**
```ts
interface CoinShopModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  transactions: CoinTransaction[]
}
// 제거: user, onPurchase, purchasing, error
```

### 3-4. `app/trade/page.tsx`

- `purchaseCoins`, `coinsLoading`, `coinsError` 사용 코드 제거
- `useCoins` 훅 destructure에 `transactions` 추가:
  ```ts
  const { balance: coinBalance, transactions: coinTransactions, refreshBalance } = useCoins(currentUser)
  ```
- `CoinShopModal` JSX에서 `user={currentUser}` 제거
- `CoinShopModal`에 `transactions={coinTransactions}` prop 추가

---

## 데이터 흐름

```
pg_cron (매일 UTC 15:00)
  → reset_daily_coins() 실행
    → user_coins.balance = 10 (전체 유저)
    → coin_transactions INSERT (type='daily_bonus')
  → 다음 날 앱 접속 시
    → /api/coins/balance 조회 → balance: 10
    → /api/coins/transactions 조회 → 내역 표시
```

---

## 에러 처리

- pg_cron 실패 시: Supabase 대시보드 로그로 확인. 사용자에게는 별도 알림 없음 (다음 자정에 자동 재실행).
- 새 사용자 가입 시: 기존 `signup_bonus` 로직 유지 (변경 없음).
- AI 분석 실패 시: 기존 `refund` 타입 유지로 정상 동작.

---

## 환경 변수 정리

삭제:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (있는 경우)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (있는 경우)
