# HOOKS KNOWLEDGE BASE

## OVERVIEW
Core business logic handling data persistence and state.
**CRITICAL**: Must implement Hybrid Storage Pattern (Guest vs User).

## STRUCTURE
```
app/hooks/
├── useTrades.ts         # Core CRUD (Dual Mode)
├── useStats.ts          # Calculation logic
├── useSupabaseAuth.ts   # Auth state
└── use*.ts              # Domain specific logic
```

## HYBRID STORAGE PATTERN
Every data hook must implement:
1. **Guest Mode**: Read/Write to `localStorage` (Keys: `stock-journal-guest-*`)
2. **User Mode**: Read/Write to `Supabase` tables
3. **Switching**: Logic depends on `user` object from `useSupabaseAuth`.

## CONVENTIONS
- **Naming**: `use[Feature]`.
- **Return**: `{ data, loading, error, operations... }`.
- **Effects**: Use `useDebounce` for search/updates to minimize writes.

## ANTI-PATTERNS
- **NO** assuming user is always logged in.
- **NO** direct localStorage usage without type safety.
- **NO** blocking UI for background sync.
