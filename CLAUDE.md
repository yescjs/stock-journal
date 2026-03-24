# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build (also runs next-sitemap postbuild)
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test runner is configured beyond Playwright (E2E). Run Playwright tests with:
```bash
npx playwright test
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ALPHA_VANTAGE_API_KEY=
```

Optional (AI analysis falls back to mock mode if not set):
```
GEMINI_API_KEY=
```

## Architecture

**Stack**: Next.js 16 App Router, TypeScript 5, React 19, Tailwind CSS 4, Supabase (auth + PostgreSQL), Recharts, Framer Motion, Lucide React, **next-intl** (i18n).

**Routing**: All pages under `app/[locale]/` with subpath-based i18n (`/ko/trade`, `/en/trade`):
- `/[locale]/` (`app/[locale]/page.tsx`) — Landing page with login modal. Redirects to `/trade` if authenticated.
- `/[locale]/trade` (`app/[locale]/trade/page.tsx`) — Main application shell. Orchestrates all hooks and renders `TradeListView`.

### i18n (Internationalization)

- **Library**: `next-intl` with `localePrefix: 'always'` (URL always includes `/ko/` or `/en/`)
- **Locales**: `ko` (Korean, default), `en` (English)
- **Config files**: `i18n/config.ts`, `i18n/routing.ts`, `i18n/navigation.ts`, `i18n/request.ts`
- **Translation files**: `messages/ko.json`, `messages/en.json` (~618 keys each)
- **Middleware**: `proxy.ts` (Next.js 16 naming) handles locale detection from Accept-Language + NEXT_LOCALE cookie
- **Navigation**: Always import `Link`, `useRouter`, `usePathname` from `@/i18n/navigation` (NOT `next/link` or `next/navigation`) — these auto-strip/add locale prefix
- **Server Components**: Must call `setRequestLocale(locale)` at top; use `getTranslations()` from `next-intl/server`
- **Client Components**: Use `useTranslations('namespace')` hook
- **Layout**: `app/layout.tsx` is minimal shell; `app/[locale]/layout.tsx` has `NextIntlClientProvider`, fonts, nav, theme
- **Currency display**: Based on stock symbol (not locale) — KRW stocks show "won", USD stocks show "$" regardless of language

### Hybrid Storage Pattern (Critical)

Every data hook must support both modes based on whether `user` from `useSupabaseAuth` is `null`:

- **Guest mode** (`user === null`): Read/write `localStorage` with keys prefixed `stock-journal-guest-*`
- **User mode**: Read/write Supabase tables with `user_id` filter

The `useTrades` hook is the canonical reference implementation of this pattern.

### Hooks (`app/hooks/`)

Business logic layer. All hooks return `{ data, loading, error, ...operations }`.

| Hook | Purpose |
|------|---------|
| `useSupabaseAuth` | Auth state, login/logout, JWT error recovery |
| `useTrades` | Trade CRUD (hybrid storage) |
| `useTradeFilter` | Client-side filtering/grouping of trades |
| `useTradeAnalysis` | Round-trip matching (buy→sell), stats calculation |
| `useAIAnalysis` | Google Gemini AI reports; saves to `ai_reports` Supabase table |
| `useCurrentPrices` | Real-time prices via `/api/stock-price` |
| `useExchangeRate` | KRW/USD exchange rate via `/api/exchange-rate` |
| `useDebounce` | Utility for debouncing search/write operations |

### Components (`app/components/`)

- `views/` — Full page sections (`TradeListView`, `AnalysisDashboard`)
- `charts/` — Recharts wrappers (`StockChart`)
- `ui/` — Reusable atoms (`Button`, `Card`, `ChartSkeleton`)
- Root level — Feature widgets (`TradeForm`, `TradeList`, `BottomSheet`, `CalendarView`, `AIReportCard`, `AIReportHistory`)

### API Routes (`app/api/`)

| Route | Description |
|-------|-------------|
| `/api/ai-analysis` | Google Gemini API (weekly report + individual trade review); mock mode when `GEMINI_API_KEY` is unset |
| `/api/stock-search` | Alpha Vantage stock search |
| `/api/stock-price` | Current stock price |
| `/api/stock-chart` | Yahoo Finance OHLCV data |
| `/api/exchange-rate` | USD/KRW rate |


### Supabase Tables

- `trades` — Core trade records (`user_id`, `date`, `symbol`, `side`, `price`, `quantity`, `strategy_id`, `emotion_tag`)
- `strategies` — Named trading strategies (joined into trades as `strategy_name`)
- `ai_reports` — Saved AI analysis reports (`report_type`, `title`, `report`, `metadata`, `locale`)
- `news_articles` — includes `title_en`, `summary_en`, `key_points_en` for English translations

### Types (`app/types/`)

- `trade.ts` — `Trade`, `TradeSide` (`'BUY' | 'SELL'`)
- `analysis.ts` — `TradeAnalysis`, `RoundTrip`, `PatternStats`, `InsightItem`
- `stock.ts`, `search.ts`, `ui.ts` — Supporting types

## Component Conventions

- **Icons**: `lucide-react` only — no other icon libraries
- **Colors**: Tailwind classes only — no hardcoded hex values (except in chart `CHART_COLORS` constants)
- **Dark mode**: Theme is forced dark (`forcedTheme="dark"`). All colors must include `dark:` variants
- **Animations**: `framer-motion` for transitions
- **Prop drilling**: Max 2 levels — use composition or context beyond that
- **Charts**: Handle empty/null data gracefully

## html2canvas / DOM-to-Image Compatibility (Critical)

Tailwind CSS 4 generates `oklab()` color functions for opacity modifiers (`bg-white/10`, `border-white/8`, `text-white/40`, etc.). **html2canvas does NOT support `oklab()`** and will throw "Attempting to parse an unsupported color function 'oklab'".

**Rule**: Any DOM element captured by `html2canvas` (or similar DOM-to-image libraries) must use **inline `rgba()` styles** instead of Tailwind opacity classes.

```tsx
// BAD — html2canvas crashes on oklab()
<div ref={cardRef} className="bg-white/10 border border-white/8 text-white/40">

// GOOD — html2canvas renders correctly
<div ref={cardRef} style={{
  backgroundColor: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.40)',
}}>
```

This applies to: share cards, export images, PDF generation, social preview cards — any feature that captures DOM as an image. Elements **outside** the capture area can use normal Tailwind classes.

## Supabase Coin System

- `daily_bonus`: pg_cron 일일 리셋 전용 (매일 KST 자정, 10코인으로 리셋)
- `attendance_bonus`: 출석 스트릭 보너스 전용 (로그인 시 1~5코인 추가)
- 두 타입은 분리되어야 함. `daily_bonus`를 다른 용도로 사용하면 크론과 충돌.

## Key localStorage Keys

- `stock-journal-guest-trades-v1` — Guest trade data
- `stock-journal-open-months-v1` — Month expand/collapse state in trade list
- `sb-*` — Supabase session (cleared on logout and JWT error recovery)
