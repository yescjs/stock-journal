# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-27
**Framework:** Next.js 16 (App Router), React 19, TypeScript 5
**Language:** Korean (Communication), English (Code)

## OVERVIEW
Stock Journal is a trading journal app supporting **Hybrid Storage** (Guest: LocalStorage vs User: Supabase).
**CRITICAL**: All responses/comments must be in **KOREAN** (한국어).

## STRUCTURE
```
.
├── app/
│   ├── api/             # Route Handlers (Supabase/Auth/Stocks)
│   ├── components/      # UI (See app/components/AGENTS.md)
│   ├── hooks/           # Business Logic (See app/hooks/AGENTS.md)
│   ├── lib/             # Supabase Clients
│   └── types/           # TS Definitions (Trade, Stock, etc.)
├── tests/               # Playwright E2E Tests
└── CLAUDE.md            # LLM Instructions (Read First)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Auth** | `app/lib/supabaseClient.ts` | Handles Supabase & Naver auth |
| **Data Logic** | `app/hooks/` | **CRITICAL**: Check Guest vs User mode |
| **Pages** | `app/page.tsx` | Main entry, orchestrates providers |
| **Styles** | `app/globals.css` | Tailwind v4, Glassmorphism config |
| **Types** | `app/types/trade.ts` | Core data models |

## COMMANDS
```bash
# Development
npm run dev           # Start server on :3000
npm run lint          # Run ESLint

# Testing (Playwright)
npx playwright test             # Run all tests
npx playwright test --ui        # Interactive UI mode
npx playwright test guest-mode  # Run specific test file

# Build
npm run build         # Production build
```

## CONVENTIONS
- **Language**: **KOREAN** for all explanations. English for code.
- **Imports**: Absolute imports only (`@/app/...`).
- **Storage**: Always support **BOTH** Guest (LocalStorage) and User (Supabase).
- **Styling**: Tailwind CSS v4. Use `bg-white/50`, `backdrop-blur` for glass effect.
- **Components**: Functional, PascalCase. Use `"use client"` only when needed.

## ANTI-PATTERNS (THIS PROJECT)
- **NO** ignoring Supabase `null` returns (handle explicitly).
- **NO** breaking Guest Mode (always test logic with `useSupabaseAuth().user == null`).
- **NO** relative imports (e.g., `../../components`). Use `@/`.
- **NO** direct API calls in components (Use hooks).

## UNIQUE STYLES
- **Glassmorphism**: Extensive use of transparency and blur.
- **Dark Mode**: Support via `dark:` class prefix.
