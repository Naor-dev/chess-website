# Analytics & Statistics - Context

**Last Updated:** 2026-02-08

## Key Files

| File | Purpose |
|------|---------|
| `apps/backend/prisma/schema.prisma` | Game model with result, difficulty, time control fields |
| `apps/backend/src/repositories/GameRepository.ts` | Existing game queries (model for StatsRepository) |
| `apps/backend/src/services/gameService.ts` | Existing service pattern (model for StatsService) |
| `apps/backend/src/controllers/BaseController.ts` | Base class for StatsController |
| `apps/backend/src/repositories/BaseRepository.ts` | Base class for StatsRepository |
| `apps/backend/src/routes/` | Route registration (add stats routes) |
| `packages/shared/src/types/game.ts` | Existing types (add UserStatsResponse) |
| `apps/frontend/src/lib/gameApi.ts` | Existing API client pattern (model for statsApi) |
| `apps/frontend/src/app/history/page.tsx` | History page (similar layout pattern) |

## Key Decisions

1. **No schema changes**: All stats derived from existing Game model data
2. **Server-side aggregation**: Prisma `groupBy` and `aggregate` (not client-side calculation)
3. **No caching in MVP**: Stats computed per request (add caching later if needed)
4. **Charts**: CSS-based progress bars in MVP (no chart library dependency)
5. **Streak**: Calculated from most recent finished games in order

## Game Result Values (for classification)

```typescript
// Wins
'user_win_checkmate'  // User won by checkmate
'user_win_timeout'    // User won on time

// Losses
'engine_win_checkmate' // Engine won by checkmate
'engine_win_timeout'   // Engine won on time
'user_resigned'        // User resigned

// Draws
'draw_stalemate'              // Stalemate
'draw_repetition'             // Threefold repetition
'draw_fifty_moves'            // 50-move rule
'draw_insufficient_material'  // Insufficient material
```

## Stats Response Structure

```typescript
interface UserStatsResponse {
  totalGames: number;
  activeGames: number;
  finishedGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // percentage
  avgMovesPerGame: number;
  currentStreak: { type: 'win' | 'loss' | 'draw'; count: number };
  byDifficulty: Array<{
    level: number;
    total: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
  byTimeControl: Array<{
    type: string;
    total: number;
    wins: number;
  }>;
}
```

## WCAG 2.1 AA Requirements

- Data tables: `<table>` with `<caption>`, `<th scope>`, proper structure
- Visual charts must have text alternative (data table)
- Color not sole indicator (use icons/text alongside color)
- Contrast ratio 4.5:1 for all text
- Focus visible on all interactive elements
- Loading state announced via `aria-live="polite"`

## Proxy Route Configuration

Frontend proxy at `apps/frontend/src/app/api/proxy/[...path]/route.ts` needs `users` in the path allowlist (already included).
