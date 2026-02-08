# Analytics & Statistics - Implementation Plan

**Last Updated:** 2026-02-08

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

1. **Create `StatsRepository`** in `apps/backend/src/repositories/`
   - Extend `BaseRepository`
   - Aggregation queries using Prisma `groupBy` and `aggregate`
   - Methods: `getUserStats(userId)`, `getStatsByDifficulty(userId)`, `getStatsByTimeControl(userId)`
   - **Acceptance:** Returns all aggregated data in single response

2. **Create `StatsService`** in `apps/backend/src/services/`
   - Business logic for stats calculation
   - Win rate computation: `wins / totalFinished * 100`
   - Average moves per game: `sum(movesHistory.length) / count`
   - Streak calculation (current win/loss streak)
   - **Acceptance:** Correct calculations with edge cases (0 games, all wins, etc.)

3. **Create `StatsController`** in `apps/backend/src/controllers/`
   - Extend `BaseController`
   - `GET /api/users/stats` endpoint
   - Auth required (uses `req.user.id`)
   - Response via `handleSuccess()`
   - Sentry breadcrumbs
   - **Acceptance:** Returns structured stats response, 401 for unauthenticated

4. **Add stats types to shared package**
   - `UserStatsResponse` type in `packages/shared/src/types/`
   - Include: totalGames, wins, losses, draws, winRate, avgMovesPerGame, byDifficulty, byTimeControl, currentStreak
   - **Acceptance:** Types exported and usable in frontend

### Phase 2: Frontend Statistics Page (Effort: L)

5. **Create stats API client** in `apps/frontend/src/lib/`
   - `getUserStats()` function using apiClient
   - TanStack Query hook: `useUserStats()`
   - **Acceptance:** Data fetches correctly via proxy

6. **Create `/stats` page** in `apps/frontend/src/app/stats/`
   - Overview cards: Total Games, Win Rate, Current Streak, Avg Moves
   - Results breakdown: Wins/Losses/Draws with visual proportions
   - Performance by difficulty: bar chart or accessible table
   - Time control preferences: distribution display
   - **Acceptance:** All stats display correctly, loading and error states

7. **Add navigation to stats page**
   - Link in main navigation/header
   - Link from history page
   - Protected route (auth required)
   - **Acceptance:** Accessible from multiple entry points

8. **Responsive design**
   - Mobile: stacked cards, horizontal scroll for tables
   - Desktop: grid layout (2-3 columns)
   - Emerald theme, dark mode support
   - **Acceptance:** Usable on 320px+ screens

### Phase 3: Accessibility & Testing (Effort: M)

9. **WCAG 2.1 AA compliance**
   - Data tables with proper `<th>`, `scope`, `caption`
   - Charts have text alternatives (accessible data table below)
   - All colors meet 4.5:1 contrast ratio
   - Screen reader announces stat values
   - Keyboard navigable (all interactive elements focusable)
   - `aria-live` for loading states
   - **Acceptance:** Passes axe-core automated scan

10. **Backend tests**
    - Unit tests for StatsService calculations
    - API tests for StatsController (authenticated, unauthenticated, no games)
    - Edge cases: user with 0 games, user with only active games
    - **Acceptance:** Full coverage of calculation logic

11. **Frontend tests**
    - Component tests for stat cards
    - Playwright: navigate to stats page, verify data displays
    - Test loading and error states
    - **Acceptance:** E2E flow works

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Slow aggregation queries on large datasets | Low (few users) | Medium | Use Prisma `groupBy`, add indexes if needed |
| Incorrect stat calculations | Medium | High | Comprehensive unit tests with known data sets |
| Chart accessibility | Medium | Medium | Always provide data table alternative to charts |
| Empty state (new user) | Medium | Low | Show encouraging message with 0 games |

## Success Metrics

- Stats page loads in < 2 seconds
- All calculations verified correct via tests
- Charts have accessible alternatives
- Page scores 100 on axe-core accessibility
- Responsive on all breakpoints

## Dependencies

- Existing game data in database (no schema changes needed)
- Shared types package (add new types)
- No chart library in MVP (use CSS-based bars), or lightweight chart lib if needed




