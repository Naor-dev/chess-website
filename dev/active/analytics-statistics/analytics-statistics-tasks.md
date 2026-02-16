# Analytics & Statistics - Task Checklist

**Last Updated:** 2026-02-16

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

- [ ] Create `statsApi.ts` in `apps/frontend/src/lib/`
- [ ] Create `/stats` page layout with responsive grid (useEffect + useState, NOT TanStack Query)
- [ ] Build overview stat cards (Total Games, Win Rate, Streak, Avg Moves)
- [ ] Build results breakdown section (wins/losses/draws)
- [ ] Build performance by difficulty section
- [ ] Build time control distribution section
- [ ] Add empty state for users with 0 games
- [ ] Add loading state with skeleton UI
- [ ] Add error state with retry
- [ ] Add `stats/error.tsx` Sentry error boundary
- [ ] Add navigation links to stats page (home page, history page)
- [ ] Support dark mode
- [ ] Responsive layout (mobile stacked, desktop grid)

## Phase 3: Accessibility & Testing

- [ ] Data tables with `<caption>`, `<th scope>` for all stats tables
- [ ] Text alternatives for any visual charts
- [ ] Verify 4.5:1 contrast ratio on all text
- [ ] Focus management and keyboard navigation
- [ ] `aria-live` for loading states
- [ ] Frontend component tests
- [ ] Playwright: navigate to stats, verify data displays
