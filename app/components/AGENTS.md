# COMPONENTS KNOWLEDGE BASE

## OVERVIEW
UI components using Tailwind v4 and Framer Motion. Organized by domain (Charts, Views) and atoms (UI).

## STRUCTURE
```
app/components/
├── charts/      # Recharts implementations
├── views/       # Full page sections (Dashboard, TradeList)
├── ui/          # Reusable atoms (Buttons, Inputs)
└── *.tsx        # Shared widgets
```

## CONVENTIONS
- **Charts**: Use `Recharts`. Handle empty data gracefully.
- **Animations**: `framer-motion` for transitions.
- **Theme**: Support `dark:` variants for ALL colors.
- **Icons**: `lucide-react` only.

## ANTI-PATTERNS
- **NO** hardcoded colors. Use Tailwind classes.
- **NO** large inline styles.
- **NO** prop drilling > 2 levels. Use Composition or Context.
