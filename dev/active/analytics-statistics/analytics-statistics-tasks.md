# Analytics & Statistics - Task Checklist

**Last Updated:** 2026-02-08

## Phase 1: Backend Statistics Endpoint

- [ ] Add `UserStatsResponse` type to `packages/shared/src/types/`
- [ ] Create `StatsRepository.ts` in `apps/backend/src/repositories/`
- [ ] Implement `getUserStats(userId)` with Prisma aggregation
- [ ] Implement `getStatsByDifficulty(userId)` with groupBy
- [ ] Implement `getStatsByTimeControl(userId)` with groupBy
- [ ] Create `StatsService.ts` in `apps/backend/src/services/`
- [ ] Implement win rate, avg moves, streak calculations
- [ ] Handle edge cases (0 games, only active games)
- [ ] Create `StatsController.ts` extending BaseController
- [ ] Add `GET /api/users/stats` route
- [ ] Add Sentry breadcrumbs to stats operations
- [ ] Register stats routes in route setup

## Phase 2: Frontend Statistics Page

- [ ] Create `statsApi.ts` in `apps/frontend/src/lib/`
- [ ] Create `useUserStats()` TanStack Query hook
- [ ] Create `/stats` page layout with responsive grid
- [ ] Build overview stat cards (Total Games, Win Rate, Streak, Avg Moves)
- [ ] Build results breakdown section (wins/losses/draws)
- [ ] Build performance by difficulty section
- [ ] Build time control distribution section
- [ ] Add empty state for users with 0 games
- [ ] Add loading state with skeleton UI
- [ ] Add error state with retry
- [ ] Add navigation links to stats page (header, history page)
- [ ] Support dark mode
- [ ] Responsive layout (mobile stacked, desktop grid)

## Phase 3: Accessibility & Testing

- [ ] Data tables with `<caption>`, `<th scope>` for all stats tables
- [ ] Text alternatives for any visual charts
- [ ] Verify 4.5:1 contrast ratio on all text
- [ ] Focus management and keyboard navigation
- [ ] `aria-live` for loading states
- [ ] Unit tests for StatsService calculations
- [ ] API tests for StatsController (auth, no-auth, edge cases)
- [ ] Frontend component tests
- [ ] Playwright: navigate to stats, verify data displays
