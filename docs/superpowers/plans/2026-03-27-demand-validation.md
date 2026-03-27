# 매매일지 수요 검증 실험 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GA4 트래킹 설치 + 전환 이벤트 + 랜딩 페이지 텍스트 개선을 통해 수요 검증 실험 인프라를 구축한다.

**Architecture:** `@next/third-parties`의 `GoogleAnalytics` 컴포넌트로 GA4를 삽입하고, `lib/gtag.ts` 유틸로 커스텀 이벤트를 전송한다. 기존 hook(`useSupabaseAuth`, `useTrades`)에 1~2줄씩 이벤트 전송 코드를 추가한다. 랜딩 페이지는 번역 파일 텍스트와 CTA 버튼 순서만 변경한다.

**Tech Stack:** Next.js 16, @next/third-parties, Google Analytics 4, next-intl

---

## File Structure

| 파일 | 역할 | 작업 |
|------|------|------|
| `app/lib/gtag.ts` | GA4 이벤트 전송 유틸 | 새로 생성 |
| `app/[locale]/layout.tsx` | GA4 스크립트 삽입 | 수정 |
| `app/hooks/useSupabaseAuth.ts` | `sign_up` 이벤트 전송 | 수정 (72~79번 줄) |
| `app/hooks/useTrades.ts` | `first_trade` 이벤트 전송 | 수정 (91번 줄 근처) |
| `app/components/LandingPage.tsx` | CTA 클릭 이벤트 + 버튼 순서 변경 | 수정 (144~152번 줄) |
| `messages/ko.json` | hero 섹션 텍스트 변경 | 수정 |
| `messages/en.json` | hero 섹션 텍스트 변경 | 수정 |

---

### Task 1: @next/third-parties 패키지 설치

**Files:**
- 수정 없음 (패키지 설치만)

- [ ] **Step 1: 패키지 설치**

```bash
npm install @next/third-parties
```

- [ ] **Step 2: 설치 확인**

```bash
npm ls @next/third-parties
```

Expected: `@next/third-parties@...` 버전 출력

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: @next/third-parties 패키지 설치"
```

---

### Task 2: GA4 이벤트 유틸 생성 (lib/gtag.ts)

**Files:**
- Create: `app/lib/gtag.ts`

- [ ] **Step 1: gtag 유틸 파일 생성**

```typescript
// app/lib/gtag.ts

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

// https://developers.google.com/analytics/devguides/collection/ga4/events
export function gtagEvent(action: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;
  window.gtag?.('event', action, params);
}
```

이 파일은 다음을 제공한다:
- `GA_MEASUREMENT_ID`: 환경변수에서 GA4 측정 ID를 읽음. 미설정 시 빈 문자열 → 이벤트 전송 안 됨 (안전)
- `gtagEvent()`: GA4 커스텀 이벤트 전송 함수. SSR 환경과 GA 미설정 환경에서 안전하게 no-op

- [ ] **Step 2: TypeScript 타입 선언 추가**

`window.gtag`는 `@next/third-parties`의 `GoogleAnalytics` 컴포넌트가 주입하는 글로벌 함수다. TypeScript에서 인식하려면 타입 선언이 필요하다. 프로젝트의 기존 타입 선언 파일을 확인하고, 없으면 `app/lib/gtag.ts` 파일 상단에 declare를 추가한다:

```typescript
// app/lib/gtag.ts 상단에 추가

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
```

최종 `app/lib/gtag.ts` 전체:

```typescript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export function gtagEvent(action: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;
  window.gtag?.('event', action, params);
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/lib/gtag.ts
git commit -m "feat: GA4 이벤트 전송 유틸 (lib/gtag.ts) 추가"
```

---

### Task 3: layout.tsx에 GoogleAnalytics 컴포넌트 삽입

**Files:**
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: GoogleAnalytics import 추가**

`app/[locale]/layout.tsx` 상단에 import 추가:

```typescript
import { GoogleAnalytics } from '@next/third-parties/google';
import { GA_MEASUREMENT_ID } from '@/app/lib/gtag';
```

- [ ] **Step 2: GoogleAnalytics 컴포넌트 삽입**

`<Analytics />` (Vercel Analytics) 바로 아래에 추가:

```tsx
<Analytics />
{GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
```

`GA_MEASUREMENT_ID`가 빈 문자열이면 렌더링하지 않는다 (개발 환경에서 GA 없이 동작).

최종 `app/[locale]/layout.tsx` body 부분:

```tsx
<body className="antialiased tracking-tight bg-background text-foreground min-h-screen" style={{ colorScheme: 'dark' }}>
  <NextIntlClientProvider messages={messages}>
    <SharedTopNav />
    {children}
    <AppBottomNav />
    <Analytics />
    {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
  </NextIntlClientProvider>
</body>
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/[locale]/layout.tsx
git commit -m "feat: GA4 스크립트 삽입 (GoogleAnalytics 컴포넌트)"
```

---

### Task 4: sign_up 이벤트 — useSupabaseAuth에 추가

**Files:**
- Modify: `app/hooks/useSupabaseAuth.ts:72-79`

- [ ] **Step 1: gtag import 추가**

`app/hooks/useSupabaseAuth.ts` 상단에 추가:

```typescript
import { gtagEvent } from '@/app/lib/gtag';
```

- [ ] **Step 2: onAuthStateChange에서 sign_up 이벤트 전송**

`onAuthStateChange` 콜백 (72번 줄)에서 `_event` 파라미터를 `event`로 변경하고, `SIGNED_IN` 이벤트 시 GA4 이벤트를 전송한다:

기존 코드 (72~79번 줄):
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
            setAuthError(null); // Clear errors on successful auth
        }
    }
});
```

변경 후:
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
            setAuthError(null);
            if (event === 'SIGNED_IN') {
                gtagEvent('sign_up', { method: session.user.app_metadata?.provider || 'email' });
            }
        }
    }
});
```

참고: Supabase의 `onAuthStateChange`는 로그인과 회원가입 모두 `SIGNED_IN` 이벤트를 발생시킨다. 엄밀한 회원가입/로그인 구분은 이 검증 단계에서는 불필요하다 — "서비스에 진입한 사용자 수"를 측정하는 것이 목적이므로.

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/hooks/useSupabaseAuth.ts
git commit -m "feat: GA4 sign_up 이벤트 전송 (onAuthStateChange)"
```

---

### Task 5: guest_start + first_trade 이벤트 추가

**Files:**
- Modify: `app/[locale]/page.tsx` (guest_start)
- Modify: `app/hooks/useTrades.ts` (first_trade)

- [ ] **Step 1: guest_start 이벤트 — page.tsx**

`app/[locale]/page.tsx`에서 `onStartAsGuest` 핸들러를 찾는다 (63번 줄):

기존:
```tsx
onStartAsGuest={() => router.replace('/trade')}
```

변경:
```tsx
onStartAsGuest={() => {
    gtagEvent('guest_start');
    router.replace('/trade');
}}
```

파일 상단에 import 추가:
```typescript
import { gtagEvent } from '@/app/lib/gtag';
```

- [ ] **Step 2: first_trade 이벤트 — useTrades.ts**

`app/hooks/useTrades.ts`에서 `addTrade` 함수 내부, 거래 저장 성공 후 `first_trade` 이벤트를 전송한다. `trades` 배열이 비어있을 때만 전송 (첫 거래만).

파일 상단에 import 추가:
```typescript
import { gtagEvent } from '@/app/lib/gtag';
```

`addTrade` 함수 내부, DB Insert 성공 후 (127번 줄 `setTrades` 호출 뒤):

기존:
```typescript
if (insertError) throw insertError;
setTrades((prev) => [newTrade as Trade, ...prev]);
```

변경:
```typescript
if (insertError) throw insertError;
if (trades.length === 0) gtagEvent('first_trade', { mode: 'user' });
setTrades((prev) => [newTrade as Trade, ...prev]);
```

Guest Local Insert 쪽에서도 동일하게 (게스트 저장 성공 후):

기존 Guest 블록의 `setTrades` 호출 전에:
```typescript
if (trades.length === 0) gtagEvent('first_trade', { mode: 'guest' });
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/[locale]/page.tsx app/hooks/useTrades.ts
git commit -m "feat: GA4 guest_start + first_trade 이벤트 전송"
```

---

### Task 6: landing_cta_click 이벤트 + CTA 버튼 순서 변경

**Files:**
- Modify: `app/components/LandingPage.tsx:144-152`

- [ ] **Step 1: gtag import 추가**

`app/components/LandingPage.tsx` 상단에 추가:

```typescript
import { gtagEvent } from '@/app/lib/gtag';
```

- [ ] **Step 2: CTA 버튼에 이벤트 추가 + 순서 반전**

현재 hero CTA 영역 (144~152번 줄):
```tsx
<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }}
    className="flex flex-col sm:flex-row items-center gap-3 mb-14">
    <button onClick={onStart} className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm md:text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
        {t('startFree')} <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
    <button onClick={onStartAsGuest} className="px-7 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-sm md:text-base transition-all active:scale-[0.97]">
        {t('browseWithoutLogin')}
    </button>
</motion.div>
```

변경 후 (게스트 버튼을 primary로, 로그인 버튼을 secondary로):
```tsx
<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }}
    className="flex flex-col sm:flex-row items-center gap-3 mb-14">
    <button onClick={() => { gtagEvent('landing_cta_click', { cta: 'guest_start' }); onStartAsGuest(); }} className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm md:text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
        {t('guestCTA')} <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
    <button onClick={() => { gtagEvent('landing_cta_click', { cta: 'login' }); onStart(); }} className="px-7 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-sm md:text-base transition-all active:scale-[0.97]">
        {t('startFree')}
    </button>
</motion.div>
```

핵심 변경:
- 게스트 버튼이 primary (파란색, 왼쪽), 로그인 버튼이 secondary
- 게스트 버튼 텍스트를 `guestCTA` 키로 변경 (다음 Task에서 번역 파일에 추가)
- 두 버튼 모두 `gtagEvent('landing_cta_click')` 전송

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: `guestCTA` 번역 키가 아직 없어서 런타임 경고가 날 수 있지만, 타입 에러는 아님. Task 7에서 추가.

- [ ] **Step 4: 커밋**

```bash
git add app/components/LandingPage.tsx
git commit -m "feat: 랜딩 CTA에 GA4 이벤트 추가 + 게스트 버튼을 primary로 변경"
```

---

### Task 7: 랜딩 페이지 텍스트 개선 (번역 파일)

**Files:**
- Modify: `messages/ko.json`
- Modify: `messages/en.json`

- [ ] **Step 1: ko.json hero 섹션 텍스트 변경**

`messages/ko.json`에서 `landing` 객체 내 hero 관련 키를 변경:

기존:
```json
"heroTagline": "매매 일지 · AI 투자 코칭 · 차트 분석 · 클라우드 동기화",
"heroTitle1": "투자 기록이",
"heroTitle2": "실력이 됩니다.",
"heroDesc": "매매 일지를 30초만 쓰세요. AI가 투자 패턴을 분석하고, 같은 실수를 반복하지 않도록 코칭합니다.",
"startFree": "무료로 시작하기",
"browseWithoutLogin": "로그인 없이 둘러보기",
```

변경:
```json
"heroTagline": "개인 투자자를 위한 무료 매매일지",
"heroTitle1": "투자 기록이",
"heroTitle2": "실력이 됩니다.",
"heroDesc": "매매 일지를 30초만 쓰세요. AI가 투자 패턴을 분석하고, 같은 실수를 반복하지 않도록 코칭합니다.",
"startFree": "로그인하고 시작하기",
"guestCTA": "가입 없이 바로 시작",
"browseWithoutLogin": "로그인 없이 둘러보기",
```

변경 사항:
- `heroTagline`: 기능 나열 → 타겟 + 무료 강조
- `startFree`: "무료로 시작하기" → "로그인하고 시작하기" (이제 secondary 버튼이므로 역할 명확화)
- `guestCTA`: 새 키 추가 — "가입 없이 바로 시작" (primary 버튼 텍스트)

- [ ] **Step 2: en.json hero 섹션 텍스트 변경**

`messages/en.json`에서 동일 키 변경:

기존:
```json
"heroTagline": "Trade Journal · AI Coaching · Chart Analysis · Cloud Sync",
"startFree": "Start for free",
"browseWithoutLogin": "Browse without login",
```

변경:
```json
"heroTagline": "Free trading journal for individual investors",
"startFree": "Sign in to start",
"guestCTA": "Start without sign-up",
"browseWithoutLogin": "Browse without login",
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공. lint 경고 없음.

- [ ] **Step 4: 커밋**

```bash
git add messages/ko.json messages/en.json
git commit -m "feat: 랜딩 페이지 hero 텍스트 개선 — 타겟 명시 + 게스트 CTA 강조"
```

---

### Task 8: 환경변수 설정 + 최종 검증

**Files:**
- Modify: `.env.local` (git에 포함되지 않음)

- [ ] **Step 1: .env.local에 GA4 측정 ID 추가**

`.env.local` 파일에 추가:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

실제 GA4 측정 ID는 Google Analytics 콘솔에서 생성해야 한다:
1. https://analytics.google.com 접속
2. 관리 > 데이터 스트림 > 웹 스트림 생성
3. 웹사이트 URL: `www.xn--9z2ba455hkgc.com`
4. 측정 ID (G-XXXXXXXXXX) 복사

- [ ] **Step 2: 개발 서버에서 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속 후:
1. 개발자 도구 > Network 탭에서 `gtag` 또는 `google-analytics` 관련 요청 확인
2. 랜딩 페이지에서 "가입 없이 바로 시작" 버튼이 primary(파란색)인지 확인
3. 태그라인이 "개인 투자자를 위한 무료 매매일지"로 변경되었는지 확인

- [ ] **Step 3: 최종 빌드 확인**

```bash
npm run build && npm run lint
```

Expected: 빌드 + 린트 모두 성공

- [ ] **Step 4: Vercel 환경변수 설정**

Vercel 대시보드 또는 CLI에서 프로덕션 환경변수 추가:

```bash
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID
```

값: `G-XXXXXXXXXX` (실제 측정 ID)

---

## 검증 체크리스트

모든 Task 완료 후 확인:

- [ ] GA4 `page_view`가 자동으로 수집되는가 (GA4 Realtime 리포트)
- [ ] 로그인 시 `sign_up` 이벤트가 전송되는가
- [ ] 게스트 시작 시 `guest_start` 이벤트가 전송되는가
- [ ] 첫 거래 기록 시 `first_trade` 이벤트가 전송되는가
- [ ] CTA 클릭 시 `landing_cta_click` 이벤트가 전송되는가
- [ ] UTM 파라미터가 GA4에 자동으로 인식되는가 (`?utm_source=fmkorea` 등)
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID`가 없을 때 에러 없이 동작하는가
