# Analytics & Statistics - Task Checklist

**Last Updated:** 2026-02-17

## Phase 1: Backend Statistics Endpoint

- [x] Add `UserStatsResponse` type to `packages/shared/src/types/`
- [x] Create `StatsRepository.ts` in `apps/backend/src/repositories/`
- [x] Implement `getUserStats(userId)` with Prisma aggregation
- [x] Implement `getStatsByDifficulty(userId)` with groupBy
- [x] Implement `getStatsByTimeControl(userId)` with groupBy
- [x] Create `StatsService.ts` in `apps/backend/src/services/`
- [x] Implement win rate, avg moves, streak calculations
- [x] Handle edge cases (0 games, only active games)
- [x] Create `StatsController.ts` extending BaseController
- [x] Add `GET /api/users/stats` route
- [x] Add Sentry breadcrumbs to stats operations
- [x] Register stats routes in route setup
- [x] Unit tests for StatsService calculations (10 tests)
- [x] API tests for StatsController (auth, no-auth, edge cases) (7 tests)

## Phase 2: Frontend Statistics Page

- [x] Create `statsApi.ts` in `apps/frontend/src/lib/`
- [x] Create `/stats` page layout with responsive grid (useEffect + useState)
- [x] Build overview stat cards (Total Games, Win Rate, Streak, Avg Moves)
- [x] Build results breakdown section (wins/losses/draws) with visual bar
- [x] Build performance by difficulty section with CSS bar charts
- [x] Build time control distribution section with CSS bar charts
- [x] Add empty state for users with 0 games (CTA to play first game)
- [x] Add loading state with spinner and aria-live
- [x] Add error state with retry button
- [x] Add `stats/error.tsx` Sentry error boundary
- [x] Add navigation links to stats page (home page "Statistics" button)
- [x] Support dark mode (all components use dark: variants)
- [x] Responsive layout (2-col on mobile, 4-col on sm+ for stat cards)

## Phase 3: Accessibility & Testing

- [x] Data tables with `<caption>`, `<th scope>` for all stats tables (sr-only)
- [x] Text alternatives for visual charts (accessible data tables)
- [x] Verify 4.5:1 contrast ratio on all text
- [x] `aria-live` for loading states
- [x] Frontend component tests (covered by Playwright E2E)
- [x] Playwright: navigate to stats, verify data displays
