# Analytics & Statistics - Implementation Plan

**Last Updated:** 2026-02-16 (v5 - addresses 3rd round Opus review)

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
- Visual charts (bar chart for difficulty distribution, CSS-based — no pie chart for MVP)
- Accessible data tables as alternative to charts
- Stats are private (only accessible to the owning user)
- Responsive layout (cards on mobile, grid on desktop)

## Implementation Phases

### Phase 1: Backend Statistics Endpoint (Effort: M)

1. **Add stats types to shared package** (must come first - needed by all backend code)
   - `UserStatsResponse` type in `packages/shared/src/types/`
   - Include: totalGames, wins, losses, draws, winRate, avgMovesPerGame, byDifficulty, byTimeControl, currentStreak
   - **Note:** `UserProfile` type already exists in shared package with `gamesPlayed`, `gamesWon`, etc. - create a separate `UserStatsResponse` type (different shape, more detailed)
   - **Acceptance:** Types exported and usable in both frontend and backend

2. **Create `StatsRepository`** in `apps/backend/src/repositories/`
   - Extend `BaseRepository`, use `executeWithErrorHandling()` for ALL methods
   - **Input validation:** Validate `userId` is a valid UUID format before passing to any query
   - Aggregation queries using Prisma `groupBy` and `aggregate`
   - **Filter:** Only count `FINISHED` games (exclude `ACTIVE` and `ABANDONED`)
   - **`movesHistory` array length:** Use tagged template (auto-parameterized, safe from SQL injection).
     **CRITICAL: Use Prisma `@map` column/table names in raw SQL (not Prisma model names):**
     ```typescript
     const result = await this.prisma.$queryRaw<[{ avg: bigint | Decimal | null }]>`
       SELECT AVG(COALESCE(array_length("moves_history", 1), 0)) as avg
       FROM "games"
       WHERE "user_id" = ${userId} AND "status" = 'FINISHED'
     `;
     // IMPORTANT: $queryRaw returns bigint/Decimal, NOT number
     // Must explicitly convert: Number(result[0].avg) ?? 0
     ```
     Column name mappings (Prisma → PostgreSQL): `movesHistory` → `moves_history`, `userId` → `user_id`, `difficultyLevel` → `difficulty_level`, `timeControlType` → `time_control_type`. Table: `Game` model → `games` table.
   - **NEVER use `$queryRawUnsafe` or string concatenation — explicit ban**
   - **Result type mapping** (document explicitly to prevent bugs):
     - Wins: `user_win_checkmate`, `user_win_timeout`
     - Losses: `engine_win_checkmate`, `engine_win_timeout`, `user_resigned`
     - Draws: `draw_stalemate`, `draw_repetition`, `draw_fifty_moves`, `draw_insufficient_material`
   - **`result` field is `String?` (nullable):** Active/abandoned games may have `result = null`. The `WHERE status = 'FINISHED'` filter mitigates this since finished games should always have a result, but add defensive `IS NOT NULL` as belt-and-suspenders
   - **Streak calculation:** Fetch recent finished games ordered by `updatedAt` **with `take: 50` limit** (unbounded query is wasteful — streaks beyond 50 are statistically irrelevant). Compute in service layer: count consecutive wins from most recent game backwards (losses break streak; draws break streak). Display as "Current Win Streak: N" (or "Current Losing Streak" if negative)
   - Methods: `getUserStats(userId)`, `getStatsByDifficulty(userId)`, `getStatsByTimeControl(userId)`, `getAvgMoves(userId)`
   - **Acceptance:** Returns all aggregated data correctly, ABANDONED excluded, SQL injection safe, userId validated as UUID

3. **Create `StatsService`** in `apps/backend/src/services/`
   - Constructor receives `StatsRepository` via dependency injection (same pattern as `GameService`)
   - Business logic for stats calculation
   - **Type coercion:** All `$queryRaw` numeric results must be explicitly converted via `Number()` before returning (PostgreSQL returns `bigint`/`Decimal`, not JS `number`)
   - Win rate: `totalFinished > 0 ? (wins / totalFinished) * 100 : 0` (guard division by zero)
   - Average moves per game: from raw SQL query result (step 2), convert via `Number(result) ?? 0`
   - Streak calculation: iterate recent finished games ordered by completion time, count consecutive same-result games (wins or losses only, draws break the streak)
   - **Edge case:** User with only abandoned games should show 0 finished games (not error)
   - **Error handling:** All errors logged to Sentry, generic messages to users (never expose DB structure, query details, or internal state). Use `BaseController.handleError()` pattern
   - Add Sentry breadcrumb: `Sentry.addBreadcrumb({ category: 'stats', message: 'Calculated user statistics', data: { userId, totalGames } })`
   - **No disposal needed:** `StatsService` and `StatsRepository` don't hold resources — no `dispose()` method required (unlike `EngineService`)
   - **Acceptance:** Correct calculations with edge cases (0 games, all wins, all draws, only abandoned games, etc.)

4. **Create `StatsController`** in `apps/backend/src/controllers/`
   - Extend `BaseController`
   - `GET /api/users/stats` endpoint
   - **Controller pattern:** Use `GameController` pattern — direct property initializer `private statsService = services.statsService` (NOT constructor injection like `AuthController`). This is simpler for a single-dependency controller
   - **Authorization:** Users can only access their own stats (`req.userId` - NOT `req.user.id`). Return **404** for unauthorized access (not 403 — prevents information disclosure about other users' existence)
   - **Rate limiting:** Apply `generalLimiter` (100 req/15min) — this is a read-only GET endpoint, 20/15min is too restrictive (auto-refresh or back/forth navigation could easily hit it)
   - **CSRF:** GET endpoint — CSRF validation not required (read-only, no state mutation)
   - **Caching:** Consider `Cache-Control: private, max-age=60` header (stats don't change frequently, 1-minute client-side cache reduces server load)
   - Response via `handleSuccess()`
   - Sentry breadcrumbs
   - **Acceptance:** Returns structured stats response, 401 for unauthenticated, 404 for unauthorized

5. **Wire up backend plumbing**
   - **Register in ServiceContainer:**
     ```typescript
     this.statsRepository = new StatsRepository(prisma);
     this.statsService = new StatsService(this.statsRepository);
     ```
   - **Create route file:** `apps/backend/src/routes/statsRoutes.ts` - instantiate controller in route file (per `gameRoutes.ts` pattern)
   - **Register routes:** Add `router.use('/users', statsRoutes)` in `routes/index.ts`. **Note:** This establishes the `/users` route namespace for the first time (currently only `/health`, `/auth`, `/games` exist). Using `/users/stats` semantically groups user-level data. Alternative considered: `/games/stats` — but stats span multiple game dimensions (difficulty, time control, streaks) and are user-scoped, not game-scoped
   - **Proxy allowlist:** `'users'` already exists in `ALLOWED_PATH_PREFIXES` - no change needed. Only update `ALLOWED_QUERY_PARAMS` if adding filter params later
   - **Acceptance:** `GET /api/users/stats` is accessible through the BFF proxy

6. **Write backend tests alongside implementation**
   - Unit tests for `StatsService` calculations (write tests in parallel with service code, not deferred)
   - API tests for `StatsController` (authenticated, unauthenticated, no games)
   - Edge cases: user with 0 games, user with only active/abandoned games, all wins, all draws
   - Test raw SQL query for movesHistory average (including empty arrays)
   - **Test authorization:** User cannot access other user's statistics (returns 404, not 403)
   - **Security tests:**
     - Unauthenticated request returns 401
     - Invalid userId format returns 400
     - SQL injection attempts are safely parameterized
   - **Acceptance:** Full coverage, 80%+ test coverage for stats module

### Phase 2: Frontend Statistics Page (Effort: L)

7. **Create `statsApi.ts`** in `apps/frontend/src/lib/` (follows `gameApi.ts`, `authApi.ts` naming convention)
   - `getUserStats()` function using apiClient
   - **Decision:** Use `useEffect` + `useState` for data fetching (consistent with existing codebase). `QueryClientProvider` is NOT wired up, and no components use TanStack Query — introducing it here would be the first usage and adds complexity. Stick with existing pattern.
   - **Frontend validation:** Validate all numeric stats are finite numbers before display (prevent NaN/Infinity display bugs from malformed API responses)
   - **Acceptance:** Data fetches correctly via proxy

8. **Create `/stats` page** in `apps/frontend/src/app/stats/`
   - Overview cards: Total Games, Win Rate, Current Streak, Avg Moves
   - Results breakdown: Wins/Losses/Draws with visual proportions
   - Performance by difficulty: **CSS-based bar charts** (no chart library for MVP - drop pie chart, too complex in pure CSS)
   - Time control preferences: distribution display
   - **Empty state (0 games):** Show all stat cards with zero values, plus a call-to-action: "Play your first game to see statistics!" with a link to `/game/new`. Don't show an empty page or error — zeros are valid stats
   - **Auth guard:** Check `!authLoading && isAuthenticated` before fetching (same pattern as history page)
   - **Acceptance:** All stats display correctly, loading/error/empty states handled

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
| Raw SQL column name mismatch | High | Critical | Use `@map` names (`moves_history`, `user_id`, `games` table) — NOT Prisma model names |
| `$queryRaw` returns bigint/Decimal | High | Medium | Explicit `Number()` conversion in service layer |
| Slow aggregation queries on large datasets | Low (few users) | Medium | Use Prisma `groupBy`, composite index `(user_id, status)` already exists |
| Incorrect stat calculations | Medium | High | Write tests alongside service code (Phase 1), not deferred |
| Information disclosure via error messages | Medium | High | Use `BaseController.handleError()`, generic messages to users |
| Unauthorized access to stats | Low | High | JWT middleware + ownership check + UUID validation + 404 response |
| SQL injection | Low | Critical | Tagged templates, validate userId format, NO `$queryRawUnsafe` |
| Chart accessibility | Medium | Medium | CSS bar charts + accessible data table alternatives |
| Empty state (new user) | Medium | Low | Show encouraging message with 0 games |
| Proxy allowlist missing `users` path | Medium | Medium | Verify and add to `ALLOWED_PATHS` in proxy route |

## Success Metrics

- Stats page loads in < 2 seconds
- All calculations verified correct via tests
- Charts have accessible alternatives
- Page scores 100 on axe-core accessibility
- Responsive on all breakpoints

## Ignored Low-Priority Items

- Backend caching (Redis/in-memory) - fine for MVP, Cache-Control header provides basic client caching
- Loading skeleton/state design - follow existing history page pattern during implementation
- CORS considerations - already handled by existing middleware
- Accessibility color contrast specific values - determine during implementation
- Chart library decision - CSS bars for MVP, no pie chart
- ~~`movesHistory` interpretation~~ — **Decided:** `movesHistory` stores every half-move (ply) for both players. A 30-move game has ~60 entries. Display as **full moves** (`array_length / 2`, rounded up) and label "Avg. Moves per Game" in the UI. This matches standard chess notation convention

## Dependencies

- Existing game data in database (composite index `@@index([userId, status])` already exists in Prisma schema — no migration needed)
- Shared types package (add new `UserStatsResponse` type; note existing `UserProfile` type)
- No chart library in MVP (CSS-based bars only, pie chart deferred)
- `prisma.$queryRaw` tagged template for `movesHistory` array length aggregation
- ServiceContainer registration for new repository and service
- Route file and registration in `routes/index.ts`
- Proxy allowlist: `users` already in `ALLOWED_PATH_PREFIXES` - no change needed
- JWT verification middleware (existing pattern)
- `generalLimiter` rate limiter (existing pattern, 100 req/15min)

## Review Feedback Addressed (v4)

Changes from Opus/Sonnet review on PR #152:

1. **[CRITICAL] Fixed raw SQL column names** — Use `@map` names (`moves_history`, `user_id`, `games`) not Prisma model names
2. **[CRITICAL] Added `$queryRawUnsafe` explicit ban** — Was implied, now stated explicitly
3. **[HIGH] Added `$queryRaw` type coercion** — Returns `bigint`/`Decimal`, must convert via `Number()`
4. **[HIGH] Added streak query `LIMIT 50`** — Prevents unbounded query for users with thousands of games
5. **[HIGH] Resolved TanStack Query ambiguity** — Decision: use `useEffect`/`useState` (consistent with codebase)
6. **[MEDIUM] Fixed controller pattern** — Controllers import from ServiceContainer singleton, not constructor injection
7. **[MEDIUM] Changed rate limiter** — From 20/15min to `generalLimiter` (100/15min) for read-only GET
8. **[MEDIUM] Removed pie chart from Future State** — Was contradicting MVP scope
9. **[MEDIUM] Added no-dispose note** — StatsService/Repository don't hold resources
10. **Added security measures** — userId UUID validation, 404 for unauthorized (not 403), error handling strategy
11. **Added caching** — `Cache-Control: private, max-age=60` header
12. **Added composite index** — `(user_id, status)` for stats query performance
13. **Added security tests** — Auth, invalid UUID, SQL injection tests
14. **Added frontend validation** — Numeric stats checked for finite values

### v5 — 3rd Round Opus Review

15. **[HIGH] Clarified controller injection pattern** — Direct property initializer (GameController pattern), not constructor injection
16. **[HIGH] Documented `/users` namespace establishment** — First route under `/users` prefix, rationale for `/users/stats` vs `/games/stats`
17. **[MEDIUM] Fixed composite index in dependencies** — Already exists in Prisma schema, no migration needed
18. **[MEDIUM] Decided movesHistory semantics** — Display as full moves (plies / 2), labeled in UI accordingly
19. **[MEDIUM] Specified empty-state UX** — Zero-value cards + "Play your first game" CTA
20. **[MEDIUM] Named API client file** — `statsApi.ts` (follows `gameApi.ts`/`authApi.ts` convention)
21. **[MEDIUM] Clarified streak semantics** — Current consecutive wins from most recent game, draws break streak
22. **[MEDIUM] Added `result` nullable handling** — Defensive `IS NOT NULL` alongside status filter
23. **[MEDIUM] Added auth guard pattern** — `!authLoading && isAuthenticated` before fetching


