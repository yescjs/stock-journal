# Implementation Plan: UI/UX Fixes

## Phase 1: Analysis & Reproduction
- [x] Task: Audit current layout issues [commit: b95d3ae]
    - [ ] Create a reproduction report listing specific breakage points (screenshots/descriptions).
    - [ ] Identify hardcoded pixels vs relative units in Tailwind classes.

## Phase 2: Global Layout & Header
- [x] Task: Fix Global Container and Header [commit: cfeff6a]
    - [ ] Write Test: Create Playwright test checking Header visibility and content width on Mobile/Desktop.
    - [ ] Implement: Update `app/layout.tsx` for proper `min-h-screen` and background color handling.
    - [ ] Implement: Refactor `app/components/Header.tsx` to be fully responsive (hamburger menu for mobile if needed).

## Phase 3: Dashboard Responsiveness
- [x] Task: Stack Widgets on Mobile [commit: 5803ac1]
    - [x] Write Test: Playwright test ensuring Widgets (Charts, Stats) are visible and not overlapping on 375px width.
    - [x] Implement: Update `app/components/views/DashboardView.tsx` grid system (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
    - [x] Implement: Ensure `app/components/charts/*` components resize correctly within their containers.

## Phase 4: Trade List & Navigation [checkpoint: 8c9de30]
- [x] Task: Responsive Trade List [commit: 39d390b]
    - [x] Write Test: Check Trade List table readability on mobile.
    - [x] Implement: Convert `TradeListView` table to a Card-based layout on mobile OR enable smooth horizontal scrolling.
- [x] Task: Improve Navigation Flow [commit: b0893bb]
    - [x] Implement: Add clear navigation tabs/links between Dashboard and Trade List.
    - [x] Implement: Ensure active state styling for current view in the navigation.

## Phase 5: Visual Polish & Verification [checkpoint: b1c21b4]
- [x] Task: Design System Alignment [commit: 936379d]
    - [x] Implement: Verify font usage (JetBrains Mono/SF Mono) across corrected views.
    - [x] Implement: Ensure Color Palette (Electric Blue/Deep Purple accents) is consistent.
- [x] Task: Final Verification [commit: 8d2cf18]
    - [x] Run all Playwright tests.
    - [x] Manual check of light/dark mode switching.