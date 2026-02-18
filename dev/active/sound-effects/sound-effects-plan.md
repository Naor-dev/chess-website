# Sound Effects - Implementation Plan

**Last Updated:** 2026-02-18 (v9 - addressing Opus CRITICAL/MEDIUM + Sonnet CRITICAL/MODERATE from v8 review)

## Executive Summary

Add chess sound effects for moves, captures, check, castling, promotion, and game-end events. Include volume control with mute toggle. Must be WCAG 2.1 AA compliant (sounds never the sole feedback channel).

## Current State Analysis

- No audio infrastructure exists (zero audio files, no Web Audio API usage)
- No sound-related libraries in dependencies
- Game events are currently visual-only (board updates, modals, overlays)
- Key trigger points exist in `apps/frontend/src/app/game/[id]/page.tsx`
- `chess.move()` result (in `onDrop` and `onKeyboardMove`) is captured and checked for validity, but move **flags** (`.captured`, `.flags`) go unused - need to retain them for sound selection
- Backend `MoveResponse` returns `engineMove.san` but NOT chess.js flags - engine move sound type must be computed client-side
- No localStorage usage exists yet in the codebase - need SSR guards
- `isLowTime` visual threshold already exists at 30 seconds (in ChessClock component) - audio warning uses a separate 10s threshold
- **Security note:** All audio file paths are static/hardcoded (`public/sounds/`), never from user input

## Proposed Future State

- Distinct sounds for: move, capture, check, castling, promotion, game-over (win/loss/draw), low time warning
- Volume slider + mute toggle in game UI
- User preference persisted in localStorage (with SSR guard)
- Sounds complement (never replace) visual feedback
- Preloaded for zero-latency playback
- No sounds during move replay mode

## Implementation Phases

### Phase 1: Audio Infrastructure (Effort: M-L)

1. **Source CC0 chess sound assets** (**Blocking dependency** for Phase 2)
   - Source: [freesound.org](https://freesound.org) CC0 licensed sounds (do NOT use Lichess sounds - AGPL)
   - Move (piece placed on square)
   - Capture (piece taken)
   - Check (alert tone)
   - Castling (two-piece move)
   - Promotion (special move)
   - Game over - win (positive)
   - Game over - loss (negative)
   - Game over - draw (neutral)
   - Low time warning (10 seconds remaining)
   - File format: **MP3 only** (universally supported, OGG unnecessary)
   - Normalize all files to consistent loudness (peak normalize to -1dB via Audacity; -23 LUFS is ideal but requires specialized tooling - peak normalization is acceptable)
   - Create `public/sounds/LICENSE.txt` with per-file CC0 attribution and source URLs
   - Target: MP3 at 64kbps mono, ~5-15KB per file
   - Place in `public/sounds/` directory (static paths only, never user-supplied URLs)
   - **Acceptance:** All 9 sounds consistent in style, < 50KB each, distinct, CC0 license documented
   - **Tip:** Start steps 2-4 in parallel using placeholder sounds to unblock engineering work

2. **Add `media-src 'self'` to CSP**
   - `media-src` is **not explicitly defined** in `next.config.ts` - `default-src 'self'` already covers same-origin audio, but explicitly add `media-src 'self'` for clarity and future-proofing
   - **Note:** Audio will likely work without this change (covered by `default-src 'self'`), but explicit is better than implicit - don't use this as a debugging red herring if audio doesn't play
   - **Acceptance:** CSP header includes `media-src 'self'`, audio files load without CSP errors

3. **Create `useSound` hook** in `apps/frontend/src/hooks/`
   - Type-safe sound names via TypeScript enum:
     ```typescript
     type SoundType = 'move' | 'capture' | 'check' | 'castling' | 'promotion'
       | 'gameOverWin' | 'gameOverLoss' | 'gameOverDraw' | 'lowTimeWarning';
     ```
   - Expose: `{ play, setVolume, toggleMute, volume, isMuted }`
   - **Audio approach: `HTMLAudioElement` pool (primary)** - no `AudioContext` needed for simple sound playback. `AudioContext` is only used as a one-time unlock mechanism on iOS Safari (create + resume on first user gesture, then discard). All actual playback uses `HTMLAudioElement.play()`:
     ```typescript
     // Pool for playback (primary)
     const audioPool = useRef<Map<SoundType, HTMLAudioElement>>();
     // AudioContext ONLY for iOS Safari unlock - not for playback
     ```
   - **Preload timing:** In `useEffect` after game data loads (avoid blocking initial render). Not on app-wide mount - only on game page visit. Guard against React StrictMode double-invoke with an `initialized` ref (`if (initialized.current) return`)
   - **Audio load failure handling:** If MP3 file fails to load (404, network error), handle `onerror` on HTMLAudioElement, log to Sentry (not console.error), mark that sound as unavailable in an `availableSounds: Set<SoundType>` ref, continue silently. The `play()` function checks `availableSounds.has(type)` before attempting playback — skips silently if unavailable
   - Handle volume and mute state
   - Persist preferences in localStorage with SSR guard (`typeof window !== 'undefined'`)
   - Handle Safari private mode localStorage errors
   - **First-interaction handling:** On first board click/drag, attempt to play a silent/zero-volume sound to unlock audio. If blocked, show visual mute indicator, degrade gracefully (no retry spam)
   - **localStorage errors:** Fail silently with default values (no console.error revealing browser state)
   - **All `play()` calls wrapped in try-catch** - audio failures never crash the app
   - Sound interruption: `audio.pause(); audio.currentTime = 0;` before each `play()` (reuse pool, limit active Audio objects)
   - **Tab visibility:** Suppress sounds when `document.visibilityState !== 'visible'` (listen to `visibilitychange` event)
   - **Cleanup on unmount:** Remove event listeners, clear audio pool (close AudioContext only if it was created for Safari unlock). **StrictMode note:** Cleanup must also clear `initialized.current = false` so the second mount re-initializes the audio pool
   - **`prefers-reduced-motion`:** Audio is NOT suppressed by `prefers-reduced-motion` — sounds are not motion/animation. Users who want silence should use the mute control. Low-time warning is the only sound that could be argued as disruptive, but it's a functional alert, not decorative
   - **Acceptance:** Hook plays sounds without lag, respects user preferences, works in SSR, no memory leaks

4. **Create `SoundControl` component** in `apps/frontend/src/app/game/[id]/components/`
   - **Placement:** Render immediately after `<GameInfo game={game} />` in page.tsx, before the replay controls / resign+save buttons section. Compact inline layout — mute toggle icon + volume slider
   - Volume slider (0-100%) using native `<input type="range">`
   - Mute/unmute toggle button
   - Speaker icon changes based on volume level (muted, low, medium, high)
   - Use `useAriaLiveAnnouncer` to announce "Sound enabled" / "Sound muted" on toggle
   - Add `data-testid` attrs: `sound-control`, `mute-button`, `volume-slider`
   - Visible in both active game and replay mode (allows pre-setting preferences)
   - **Acceptance:** Volume changes apply immediately, state persists across refresh

### Phase 2: Game Event Integration (Effort: M)

5. **Create `determineSoundType()` utility function**
   - Standalone pure function for easy unit testing (separate from hook):
     ```typescript
     function determineSoundType(moveResult: Move, isInCheck: boolean): SoundType
     ```
   - Map chess.js flags to sound types:
     - `chess.inCheck()` after move -> check sound
     - `move.captured` -> capture sound
     - `move.flags` includes 'k' or 'q' -> castling sound
     - `move.flags` includes 'p' -> promotion sound (plays after piece selected, not on pawn drop)
     - Default -> move sound
   - **Sound priority** (when multiple flags): check > promotion > capture > castling > move
     - **Promotion + capture:** Plays promotion sound (promotion is the rarer, more significant event)
     - **Promotion + check:** Plays check sound (check takes highest priority always)
   - Place in `apps/frontend/src/lib/soundUtils.ts` (co-locate with other utility code in `lib/`; `utils/` dir doesn't exist)
   - **Acceptance:** Pure function with full unit test coverage

6. **Retain move flags from `chess.move()` result**
   - The `chess.move()` result is captured but its flags (`.captured`, `.flags`) go unused - retain the result for sound selection
   - Pass to `determineSoundType()` along with `chess.inCheck()`
   - **Acceptance:** Move flags available for sound selection after every move

7. **Integrate sounds into game flow**
   - **Two integration points: `onDrop` + `onKeyboardMove`**
     - `onSquareClick` delegates to `onDrop`, so `onDrop` covers drag-and-drop AND click-to-move
     - **`onKeyboardMove` is a separate, independent code path** with its own `testChess.move()`, optimistic update, and `gameApi.makeMove()` call. It does NOT delegate to `onDrop`. Both paths must have sound integration
     - Do NOT add sound in `onSquareClick` (would cause duplicate sounds with `onDrop`)
   - **User move sound (both paths):** Play at the optimistic update point (before API call), using the `testChess.move()` result which has flags. Use `testChess.inCheck()` (not main `chess`) for check detection since `testChess` reflects the post-move state
   - **Promotion sound timing:** Currently auto-queens (no promotion picker yet) — play promotion sound immediately at the optimistic update point. When the promotion picker UI is added (PR #150), sound must move to fire **after** piece selection completes (not on pawn drop to last rank). The `determineSoundType()` call stays the same; only the trigger timing changes
   - **Game-over sound — 3 trigger paths:**
     1. **Checkmate/stalemate via makeMove:** In `.then()` handler, check `result.game.isGameOver && !previousGame.isGameOver`
     2. **Timeout via fetchGame:** When clock hits 0, `fetchGame()` updates state via `setGame(gameData)` — detect game-over in this path too
     3. **Resign:** Resign API response sets `isGameOver` — needs game-over sound
   - **Game-over sound type mapping:** Map `GameResult` values to sound types:
     ```typescript
     function determineGameOverSoundType(result: GameResult): SoundType {
       if (result.startsWith('user_win_')) return 'gameOverWin';
       if (result.startsWith('draw_')) return 'gameOverDraw';
       return 'gameOverLoss'; // user_resigned, engine_win_*, timeout_*
     }
     ```
   - **Consolidated approach:** Use a `wasGameOverOnLoad` ref, set to `game.isGameOver` on initial `fetchGame()` response. Then a single `useEffect` watching `game?.isGameOver` gates all game-over sounds: only play if `!wasGameOverOnLoad.current && game.isGameOver`. This handles all 3 paths cleanly without duplicating sound logic
   - **Game-over sound vs modal timing:** Sound plays immediately via useEffect. The existing game-over modal has a 500ms delay. This is intentional — sound provides instant feedback, modal appears slightly after. Not a race condition
   - **Tab visibility re-fetch:** When a game ends while the tab is hidden (timeout, engine checkmate), `fetchGame()` fires on tab focus. Since `wasGameOverOnLoad` is `false` (game was active at load), the game-over sound will play when the user returns. This is correct — the user should hear the game ended
   - Do NOT play game-over sounds when loading/navigating to a previously finished game (the ref guard prevents this)
   - **No sound on initial game load** - when loading a game in progress or a finished game, render board silently
   - **No sound on failed optimistic update** - if API call fails and move reverts, sound already played is acceptable (too fast to matter)
   - **`play` ref pattern:** Do NOT add `play` to `onDrop`'s or `onKeyboardMove`'s dependency arrays. Instead, use a stable ref:
     ```typescript
     const playRef = useRef(play);
     useEffect(() => { playRef.current = play }, [play]);
     // In onDrop/onKeyboardMove: playRef.current(soundType) — no dependency array change needed
     ```
     This keeps the existing dependency arrays unchanged
   - **Acceptance:** Correct sound plays for each event type via both input methods, no sound on page load or when viewing finished games

8. **Engine move sound detection**
   - Backend returns `engineMove.san` but not flags
   - **Code change required in BOTH `onDrop` and `onKeyboardMove`:** `result.engineMove` is currently **unused** on the frontend - `setGame(result.game)` is the only action taken on API response. Must add code to read `result.engineMove.san` and replay it client-side
   - **FEN race condition fix (both paths):** Capture `newFen` (the FEN after user's move) into a local variable `userMoveFen` **before** the API call. This is the FEN before the engine's move. Do NOT use `result.game.fen` (that's after the engine moved) or `game.currentFen` (stale due to optimistic update):
     ```typescript
     // BEFORE API call - capture FEN after user move (in BOTH onDrop and onKeyboardMove)
     const userMoveFen = newFen; // from testChess.fen()

     // In the .then() handler (same pattern for both paths):
     if (result.engineMove?.san) {
       const tempChess = new Chess(userMoveFen); // FEN BEFORE engine move
       const engineResult = tempChess.move(result.engineMove.san);
       if (engineResult) {
         playRef.current(determineSoundType(engineResult, tempChess.inCheck()));
       }
     }
     ```
   - Use same `determineSoundType()` function as user moves
   - Play sound when engine response arrives (in the `.then()` handler), alongside `setGame(result.game)`
   - **No debounce initially** - user sound plays at optimistic update, engine sound plays when API responds (200ms+ later). Natural gap prevents clashing. Add debounce only if testing reveals actual overlap
   - **Acceptance:** Engine moves produce correct sounds via both input methods, no audio clashing with user moves

9. **Add low-time warning sound**
   - Trigger when player clock reaches 10 seconds (separate from existing `isLowTime` visual indicator at 30s)
   - Play once per threshold crossing (use `hasPlayedWarning` ref)
   - For games WITH increment: reset `hasPlayedWarning` when `displayTimeUser` rises above 10s (increment applied). **Cooldown guard:** Track `lastWarningTime` ref — suppress re-triggering within 5 seconds of the last warning to prevent spam near the boundary (e.g., `bullet_2min` with 1s increment oscillating around 10s)
   - For games WITHOUT increment: play once, never reset (clock only decreases)
   - Only for player's clock (not engine)
   - Guard: skip if `game.isGameOver`, `isReplayMode`, or `timeControlType === 'none'`
   - **Acceptance:** Warning plays at 10 seconds, resets on increment, no rapid-fire spam near threshold

10. **No sounds in replay mode (already handled by existing guards)**
    - `isReplayMode` is derived from `game?.isGameOver` — when a game is over, move replay controls become available
    - `onDrop` and `onKeyboardMove` both return early when `game.isGameOver`, so move sounds cannot fire during replay navigation
    - The `wasGameOverOnLoad` ref prevents game-over sounds when loading a finished game
    - **No additional code needed** — existing guards already prevent sounds during replay. This step is documentation-only to prevent implementers from adding redundant state tracking
    - **Acceptance:** No sounds play during move replay navigation (verified by existing guards)

### Phase 3: Accessibility & Testing (Effort: M)

11. **WCAG 2.1 AA compliance**
    - Sounds are supplementary (all events have visual feedback already)
    - Mute control is keyboard accessible (Tab to focus, Enter/Space to toggle)
    - Volume slider: use native `<input type="range">` which provides `aria-label`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and arrow key support for free. Arrow keys adjust by 10%, Home/End for min/max
    - Screen reader announces mute state change ("Sound enabled" / "Sound muted")
    - No sound auto-plays before user interaction (autoplay policy)
    - **Acceptance:** All visual feedback works with sound muted, volume slider fully keyboard-operable

12. **Set up frontend unit test infrastructure (prerequisite)**
    - The frontend currently has **zero unit test infrastructure** — only Playwright E2E tests exist
    - Install: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDependencies
    - Create `apps/frontend/vitest.config.ts` with jsdom environment and `@` path alias
    - Add `"test": "vitest run"` script to `apps/frontend/package.json`
    - **Acceptance:** `cd apps/frontend && pnpm test` runs and finds test files

13. **Unit tests**
    - `determineSoundType()` pure function tests (all flag combinations, priority order including promotion+capture)
    - `determineGameOverSoundType()` tests (all GameResult variants)
    - `useSound` hook tests: mock `HTMLAudioElement` (primary audio approach)
    - Test play(), setVolume(), toggleMute()
    - Test volume/mute persistence in localStorage
    - Test SSR guard (no errors when window undefined)
    - Test first-interaction gating
    - Test tab visibility suppression
    - Test audio load failure (onerror handler, graceful degradation)
    - Test cleanup on unmount (no lingering listeners, audio pool cleared)
    - **Acceptance:** All tests pass, no memory leaks

14. **Playwright UI tests**
    - Verify sound controls render and toggle
    - Verify mute state persists across page reload
    - Test HTMLAudioElement state changes via `page.evaluate()` — use `.paused` (boolean) and `.currentTime` (number > 0 means played), NOT `.played` (which is a `TimeRanges` object, not a boolean). Also test `.volume` and `.muted`
    - **Verify no CSP errors:** After triggering audio playback, check browser console for CSP violation messages (`page.on('console')` filtering for `Content-Security-Policy`)
    - **Acceptance:** Controls render, toggle, persist; audio element state verifiable; zero CSP violations

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Browser autoplay policy blocks sound | High | Medium | Initialize AudioContext on first board interaction, show mute indicator |
| Safari AudioContext quirks | High | Medium | Require user gesture to create/resume context; thorough iOS Safari testing |
| Sound sourcing difficulty (9 consistent CC0 sounds) | Medium | High | **Blocking dependency** - start engineering with placeholder sounds in parallel |
| Audio latency on mobile | Medium | Low | Preload all sounds, use small MP3 files (<15KB) |
| Sound licensing issues | Medium | High | Use CC0 from freesound.org only, document license per file |
| Multiple rapid moves overlap | Low | Low | Audio pool with reuse; stop previous sound before playing new one |
| Engine move flags unavailable from API | High | Medium | Replay SAN on client-side chess instance to get flags |
| localStorage unavailable (SSR/Safari private) | Medium | Low | SSR guard + try-catch, fall back to defaults |
| Background tab plays unexpected audio | High | Medium | Suppress sounds when `document.visibilityState !== 'visible'` |
| react-chessboard animation timing mismatch | Medium | Low | Coordinate sound with board animation start; add configurable delay if needed |

## Success Metrics

- All 9 game events have distinct sounds
- Sound plays within 50ms of event
- Volume preference persists across sessions
- Mute works correctly, no sound leaks
- Fully keyboard accessible sound controls
- No sounds during replay mode
- Works on iOS Safari (after first interaction)
- Total audio assets < 150KB (acceptable for mobile data)
- Audio memory stays stable in long sessions (no leaks)

## Ignored Low-Priority Items

- Merge steps 5+6 (minor restructuring, not worth churn)
- SAN-based fallback for sound detection (chess.js replay is more reliable)
- SoundContext provider (hook approach is sufficient for single-page usage)
- Sound file naming convention docs (obvious during implementation)
- Performance metrics measurement (verify during implementation)
- Predictive preloading on "New Game" hover (minor optimization)
- Per-sound volume control (master volume + mute is sufficient for MVP)
- Sound preview/test button in settings (add post-launch if users request)
- Concurrent game tabs playing sounds (tab visibility check handles the common case; two visible tabs both playing is acceptable edge case)
- Low-time warning 2s dwell time (unnecessary complexity - cooldown + threshold crossing is sufficient)
- `Permissions-Policy` autoplay note (Opus LOW #8 - current header doesn't include `autoplay=()` which is correct; noted here for future reference)

## Dependencies

- No new npm packages (use native `HTMLAudioElement` pool for playback; `AudioContext` only as one-time iOS Safari unlock mechanism if needed)
- Sound asset files (CC0 licensed from freesound.org) + `LICENSE.txt`
- chess.js move flags for sound type detection (user moves)
- chess.js SAN replay for engine move sound detection
