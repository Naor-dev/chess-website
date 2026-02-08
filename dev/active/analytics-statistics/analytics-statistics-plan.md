# Analytics & Statistics - Implementation Plan

**Last Updated:** 2026-02-09

## Executive Summary

Add a player statistics dashboard showing win rate, games played, average game length, performance by difficulty, and other insights derived from existing game data. Requires new backend aggregation endpoint and frontend statistics page. Must be WCAG 2.1 AA compliant.

## Current State Analysis

- Game model stores: status, result, difficulty, time control, moves history, timestamps
- Result values: `user_win_checkmate`, `user_win_timeout`, `engine_win_checkmate`, `engine_win_timeout`, `draw_stalemate`, `draw_repetition`, `draw_fifty_moves`, `draw_insufficient_material`, `user_resigned`
- No statistics aggregation endpoint exists
- No statistics UI page exists
- All data needed for basic stats is already in the database

## Proposed Future State

- `/stats` page with player statistics dashboard
- Backend endpoint `GET /api/users/stats` with aggregated data
- Statistics: total games, win/loss/draw counts, win rate, avg moves per game, performance by difficulty, favorite time control
- Visual charts (bar chart for difficulty distribution, pie chart for results)
- Accessible data tables as alternative to charts
- Responsive layout (cards on mobile, grid on desktop)

## Implementation Phases

### Phase 1: Backend Statistics Endpoint (Effort: M)

1. **Add stats types to shared package** (must come first - needed by all backend code)
   - `UserStatsResponse` type in `packages/shared/src/types/`
   - Include: totalGames, wins, losses, draws, winRate, avgMovesPerGame, byDifficulty, byTimeControl, currentStreak
   - **Note:** `UserProfile` type already exists in shared package with `gamesPlayed`, `gamesWon`, etc. - create a separate `UserStatsResponse` type (different shape, more detailed)
   - **Acceptance:** Types exported and usable in both frontend and backend

2. **Create `StatsRepository`** in `apps/backend/src/repositories/`
   - Extend `BaseRepository`
   - Aggregation queries using Prisma `groupBy` and `aggregate`
   - **`movesHistory` array length:** Prisma cannot aggregate array length in `groupBy` - use raw SQL via `prisma.$queryRaw`:
     ```sql
     SELECT AVG(array_length("movesHistory", 1)) FROM "Game"
     WHERE "userId" = $1 AND "status" = 'completed'
     ```
   - **Streak calculation:** Fetch recent finished games ordered by `updatedAt`, compute streak in service layer (simpler than SQL window functions)
   - Methods: `getUserStats(userId)`, `getStatsByDifficulty(userId)`, `getStatsByTimeControl(userId)`, `getAvgMoves(userId)`
   - **Acceptance:** Returns all aggregated data correctly

3. **Create `StatsService`** in `apps/backend/src/services/`
   - Business logic for stats calculation
   - Win rate computation: `wins / totalFinished * 100`
   - Average moves per game: from raw SQL query result (step 2)
   - Streak calculation: iterate recent finished games ordered by completion time, count consecutive same-result games (wins or losses only, draws break the streak)
   - **Acceptance:** Correct calculations with edge cases (0 games, all wins, all draws, etc.)

4. **Create `StatsController`** in `apps/backend/src/controllers/`
   - Extend `BaseController`
   - `GET /api/users/stats` endpoint
   - Auth required (uses `req.userId` - NOT `req.user.id`, which doesn't exist)
   - Response via `handleSuccess()`
   - Sentry breadcrumbs
   - **Acceptance:** Returns structured stats response, 401 for unauthenticated

5. **Wire up backend plumbing**
   - **Register in ServiceContainer:** Add `StatsRepository` and `StatsService` to `apps/backend/src/services/serviceContainer.ts`
   - **Create route file:** `apps/backend/src/routes/statsRoutes.ts` (or `userRoutes.ts`)
   - **Register routes:** Add `router.use('/users', statsRoutes)` in `apps/backend/src/routes/index.ts`
   - **Proxy allowlist:** Add `'users'` to `ALLOWED_PATHS` in `apps/frontend/src/app/api/proxy/[...path]/route.ts` (if not already there)
   - **Acceptance:** `GET /api/users/stats` is accessible through the BFF proxy

6. **Write backend tests alongside implementation**
   - Unit tests for `StatsService` calculations (write tests in parallel with service code, not deferred)
   - API tests for `StatsController` (authenticated, unauthenticated, no games)
   - Edge cases: user with 0 games, user with only active games, all wins, all draws
   - Test raw SQL query for movesHistory average
   - **Acceptance:** Full coverage of calculation logic

### Phase 2: Frontend Statistics Page (Effort: L)

7. **Create stats API client** in `apps/frontend/src/lib/`
   - `getUserStats()` function using apiClient
   - TanStack Query hook: `useUserStats()` with `staleTime: 60_000` (stats don't change rapidly)
   - **Acceptance:** Data fetches correctly via proxy, cached for 60 seconds

8. **Create `/stats` page** in `apps/frontend/src/app/stats/`
   - Overview cards: Total Games, Win Rate, Current Streak, Avg Moves
   - Results breakdown: Wins/Losses/Draws with visual proportions
   - Performance by difficulty: **CSS-based bar charts** (no chart library for MVP - drop pie chart, too complex in pure CSS)
   - Time control preferences: distribution display
   - **Acceptance:** All stats display correctly, loading and error states

9. **Add `stats/error.tsx` Sentry error boundary**
   - Follow existing pattern from `game/[id]/error.tsx` and `history/error.tsx`
   - `Sentry.captureException(error, { tags: { page: 'stats' } })`
   - **Acceptance:** Errors captured to Sentry, user sees error UI

10. **Add navigation to stats page**
    - **No shared navigation component exists** - navigation links are inline per page
    - Add "Statistics" button to home page authenticated section (matches existing "Start New Game" / "Game History" button pattern)
    - Add link from history page
    - Protected route (auth required)
    - **Acceptance:** Accessible from home page and history page

11. **Responsive design**
    - Mobile: stacked cards, horizontal scroll for tables
    - Desktop: grid layout (2-3 columns)
    - Emerald theme, dark mode support
    - **Acceptance:** Usable on 320px+ screens

### Phase 3: Accessibility & Frontend Testing (Effort: M)

12. **WCAG 2.1 AA compliance**
    - Data tables with proper `<th>`, `scope`, `caption`
    - CSS bar charts have text alternatives (accessible data table below each)
    - All colors meet 4.5:1 contrast ratio
    - Screen reader announces stat values
    - Keyboard navigable (all interactive elements focusable)
    - `aria-live` for loading states
    - **Acceptance:** Passes axe-core automated scan

13. **Frontend tests**
    - Component tests for stat cards
    - Playwright: navigate to stats page, verify data displays
    - Test loading and error states
    - Test empty state (0 games)
    - **Acceptance:** E2E flow works

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Prisma can't aggregate array length | High | High | Use `prisma.$queryRaw` with `array_length()` for movesHistory |
| Slow aggregation queries on large datasets | Low (few users) | Medium | Use Prisma `groupBy`, add indexes if needed |
| Incorrect stat calculations | Medium | High | Write tests alongside service code (Phase 1), not deferred |
| Chart accessibility | Medium | Medium | CSS bar charts + accessible data table alternatives |
| Empty state (new user) | Medium | Low | Show encouraging message with 0 games |
| Proxy allowlist missing `users` path | Medium | Medium | Verify and add to `ALLOWED_PATHS` in proxy route |

## Success Metrics

- Stats page loads in < 2 seconds
- All calculations verified correct via tests
- Charts have accessible alternatives
- Page scores 100 on axe-core accessibility
- Responsive on all breakpoints

## Dependencies

- Existing game data in database (no schema changes needed)
- Shared types package (add new `UserStatsResponse` type; note existing `UserProfile` type)
- No chart library in MVP (CSS-based bars only, pie chart deferred)
- `prisma.$queryRaw` for `movesHistory` array length aggregation
- ServiceContainer registration for new repository and service
- Route file and registration in `routes/index.ts`
- Proxy allowlist update for `users` path




