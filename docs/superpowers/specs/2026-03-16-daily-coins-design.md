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

## 구현 방식

**Supabase pg_cron** 사용. 프로젝트가 이미 Supabase를 사용하고 있고 `add_coins` RPC가 존재하므로, DB 내부 크론으로 처리하는 것이 가장 단순하다.

---

## 섹션 1: DB 변경

### 1-1. 새 DB 함수 `reset_daily_coins()`

```sql
CREATE OR REPLACE FUNCTION reset_daily_coins()
RETURNS void AS $$
BEGIN
  -- 모든 유저 잔액을 10으로 리셋
  UPDATE user_coins SET balance = 10;
  -- 거래 내역 기록
  INSERT INTO coin_transactions (user_id, type, amount, balance_after)
  SELECT user_id, 'daily_bonus', 10, 10 FROM user_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1-2. pg_cron 스케줄 등록

```sql
-- KST 자정 = UTC 15:00
SELECT cron.schedule('daily-coin-reset', '0 15 * * *', 'SELECT reset_daily_coins()');
```

### 1-3. payment_orders 테이블 삭제

```sql
DROP TABLE IF EXISTS payment_orders;
```

### 1-4. coin_transactions 타입 체크 업데이트

`coin_transactions.type` 컬럼의 허용 값에서 `'purchase'`, `'refund'` 제거, `'daily_bonus'` 추가.

---

## 섹션 2: 삭제할 파일

| 파일/폴더 | 처리 |
|-----------|------|
| `app/api/payment/prepare/route.ts` | 삭제 |
| `app/api/payment/confirm/route.ts` | 삭제 |
| `app/api/payment/` 폴더 | 삭제 |
| `app/payment/success/page.tsx` | 삭제 |
| `app/payment/` 폴더 | 삭제 |
| `stripe` npm 패키지 | `npm uninstall stripe` |

---

## 섹션 3: 프론트엔드 변경

### 3-1. `app/types/coins.ts`

- `CoinTransactionType`에서 `'purchase'`, `'refund'` 제거 → `'daily_bonus'` 추가
- `PaymentOrder` 인터페이스 삭제
- `COIN_PACKAGES` 상수 삭제
- `COIN_COSTS` 상수는 유지 (코인 사용 비용 안내에 사용)

**변경 후:**
```ts
export type CoinTransactionType = 'signup_bonus' | 'daily_bonus' | 'spend'

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
- **하단**: 코인 사용 비용 안내 (`COIN_COSTS`)
- **하단**: 최근 거래 내역 목록 (트랜잭션 타입별 한국어 라벨)
- 삭제: 패키지 카드, 약관 동의 체크박스, 결제 버튼

Props 변경:
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
- `CoinShopModal`에 `transactions` prop 추가 전달
- `useCoins` 훅 반환값 destructuring 업데이트

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

---

## 환경 변수 정리

삭제:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (있는 경우)
