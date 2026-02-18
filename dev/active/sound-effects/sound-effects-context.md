# Sound Effects - Context

**Last Updated:** 2026-02-18 (aligned with plan v9)

## Key Files

| File | Purpose | Action |
|------|---------|--------|
| `apps/frontend/src/app/game/[id]/page.tsx` | Main game page - `onDrop`, `onKeyboardMove`, game-over detection | MODIFY (biggest change) |
| `apps/frontend/src/lib/soundUtils.ts` | `determineSoundType()` + `determineGameOverSoundType()` pure functions | CREATE |
| `apps/frontend/src/hooks/useSound.ts` | Audio hook - pool, preload, play, volume, mute, localStorage | CREATE |
| `apps/frontend/src/app/game/[id]/components/SoundControl.tsx` | Mute toggle + volume slider UI | CREATE |
| `apps/frontend/src/app/game/[id]/components/index.ts` | Component barrel exports | MODIFY (add export) |
| `apps/frontend/next.config.ts` | CSP headers | MODIFY (add `media-src 'self'`) |
| `apps/frontend/public/sounds/*.mp3` | 9 placeholder MP3 files | CREATE |
| `apps/frontend/public/sounds/LICENSE.txt` | CC0 attribution | CREATE |
| `apps/frontend/vitest.config.ts` | Vitest test config (jsdom) | CREATE |
| `apps/frontend/package.json` | Add vitest devDeps + test script | MODIFY |
| `apps/frontend/src/lib/__tests__/soundUtils.test.ts` | Unit tests for sound type detection | CREATE |
| `apps/frontend/src/hooks/__tests__/useSound.test.ts` | Unit tests for audio hook | CREATE |
| `apps/frontend/e2e/sound-effects.spec.ts` | Playwright E2E tests | CREATE |

## Key Decisions

1. **HTMLAudioElement pool** (primary) - no AudioContext needed for playback. AudioContext only as one-time iOS Safari unlock
2. **CC0 sounds from freesound.org** - NOT Lichess (AGPL). MP3 only, 64kbps mono, <50KB each
3. **Two integration points**: `onDrop` (drag + click-to-move) AND `onKeyboardMove` (keyboard input) - they are independent code paths
4. **Preferences**: localStorage keys `chessSound.volume` (default 0.7), `chessSound.muted` (default false)
5. **No backend changes**: All sound logic is frontend-only
6. **No new npm deps** for audio (vitest + testing-library for tests only)
7. **playRef pattern**: Stable ref avoids polluting dependency arrays
8. **prefers-reduced-motion**: Audio NOT suppressed - sounds aren't motion. Users use mute control

## Sound Type Detection

```typescript
// Pure function in soundUtils.ts
function determineSoundType(moveResult: Move, isInCheck: boolean): SoundType
// Priority: check > promotion > capture/enPassant > castling > move

// Game-over mapping in soundUtils.ts
function determineGameOverSoundType(result: GameResult): SoundType
// user_win_* -> gameOverWin, draw_* -> gameOverDraw, else -> gameOverLoss
```

**Engine moves**: Backend returns `engineMove.san` but no flags. Replay SAN on temp `Chess(userMoveFen)` client-side to get flags. `userMoveFen` captured BEFORE API call (not from response).

## Critical Edge Cases

- **onKeyboardMove**: Separate path from onDrop, both need identical sound integration
- **Game-over vs modal timing**: Sound fires immediately via useEffect, modal has 500ms delay (intentional)
- **Tab visibility re-fetch**: Game ending while tab hidden -> sound plays on return (correct behavior)
- **Low-time warning cooldown**: 5s cooldown prevents spam with small increments (e.g., bullet_2min 1s increment)
- **StrictMode**: Cleanup must clear `initialized.current = false` for second mount
- **Replay mode**: Existing `isGameOver` guards already prevent sounds - no extra code needed
- **wasGameOverOnLoad ref**: Prevents sounds when loading a finished game

## WCAG 2.1 AA Requirements

- Sounds are always supplementary to visual cues (NEVER sole feedback channel)
- Mute button: `aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}`
- Volume slider: native `<input type="range">` with `aria-label="Volume"` (free a11y)
- Screen reader announcements via `useAriaLiveAnnouncer`: "Sound enabled" / "Sound muted"
- No auto-play before first user interaction
- `data-testid` attrs: `sound-control`, `mute-button`, `volume-slider`

## Browser Autoplay Policy

- Chrome/Safari block audio until user gesture
- One-time click/keydown listener creates+resumes+closes AudioContext for iOS Safari
- Graceful degradation: if blocked, show mute indicator, no retry spam
- `document.visibilityState !== 'visible'` suppresses sounds in background tabs

## Existing Code to Reuse

- `useAriaLiveAnnouncer` (`src/hooks/useAriaLiveAnnouncer.tsx`) - SR mute announcements
- `cn()` (`src/lib/utils.ts`) - className merging in SoundControl
- `gameApi.makeMove()` (`src/lib/gameApi.ts`) - returns `MoveResponse` with `engineMove?.san`
- `GameResult` type (`@chess-website/shared`) - for game-over sound mapping
- Playwright mock patterns from `e2e/stats.spec.ts` - auth mocking, route interception
