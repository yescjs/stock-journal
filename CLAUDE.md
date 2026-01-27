# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language / 언어 설정

**모든 응답, 설명, 코멘트는 한글로 작성합니다.** 코드 자체(변수명, 함수명 등)는 영어를 유지하되, 사용자와의 대화 및 설명은 항상 한글로 합니다.

## Project Overview

Stock Journal is a trading journal application for tracking stock trades. It supports both guest mode (LocalStorage) and authenticated user mode (Supabase).

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is currently configured. Verify changes by running the dev server.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS v4 with glassmorphism patterns (`bg-white/50`, `backdrop-blur`)
- **Database/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Charts**: Recharts
- **Icons**: lucide-react
- **Dates**: date-fns (stored as `YYYY-MM-DD` strings)

### Directory Structure
- `app/api/` - Next.js Route Handlers (stock-chart, stock-list, stock-search, auth/naver)
- `app/components/` - UI components (PascalCase)
- `app/components/views/` - Main view components (DashboardView, TradeListView, SettingsView, MarketDiaryView)
- `app/components/charts/` - Chart components (EquityCurve, MonthlyBarChart, StockChart, etc.)
- `app/hooks/` - Custom React hooks (camelCase)
- `app/lib/` - Supabase client and auth helpers
- `app/types/` - TypeScript definitions
- `app/utils/` - Stateless utility functions

### Core Data Flow
The main entry point is `app/page.tsx` which orchestrates:
1. Authentication state via `useSupabaseAuth`
2. Trade data via `useTrades` - handles both guest (LocalStorage) and user (Supabase) modes
3. Statistics via `useStats`
4. Additional domain hooks: `useStrategies`, `useMonthlyGoals`, `useRiskManagement`, `useDiary`, etc.

### Hybrid Storage Pattern (Critical)
All data hooks must handle BOTH storage modes:
- **Guest Mode**: Uses `localStorage.getItem/setItem` with keys like `stock-journal-guest-trades-v1`
- **User Mode**: Uses `supabase.from('table').select/insert/update`

When modifying data hooks, always check if the logic affects guest mode, user mode, or both.

### Trade Data Model
The `Trade` interface (`app/types/trade.ts`) is central:
- `id`: UUID for Supabase, `guest-...` string for localStorage
- `date`: `YYYY-MM-DD` format
- `side`: `'BUY'` or `'SELL'`
- `tags`: Array of strings
- `image`: URL (Supabase Storage) or Base64 data URL (guest mode)

## Code Conventions

### Imports
Always use absolute imports with `@/` alias:
```typescript
import { Trade } from '@/app/types/trade';
```

### Components
- Use functional components: `function ComponentName({ prop }: Props)`
- Add `"use client"` directive only when necessary (state, effects, browser APIs)
- Support dark mode using `dark:` prefix

### Supabase Null Handling
Supabase returns `null` for empty results - handle explicitly.

## Environment Variables

Required for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
