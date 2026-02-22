# Sound Effects - Implementation Plan

**Last Updated:** 2026-02-22 (v16 - address Opus+Sonnet v15 review: 5 MEDIUM items)

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
   - **Normalization approach:** Peak normalize to -1dB via Audacity, then manual QA listening test across all 9 sounds to verify consistent perceived loudness. **Trade-off documented:** -23 LUFS (integrated loudness) would guarantee perceptual consistency but requires `ffmpeg-normalize` or similar tooling. Peak normalization is simpler but can result in files with different perceived loudness (e.g., a sharp click vs. a sustained tone). **Mitigation:** After peak normalization, play all 9 sounds at the same volume setting and adjust individual file gains in Audacity until they sound equally loud. Document any per-file gain adjustments in `LICENSE.txt`
   - Create `public/sounds/LICENSE.txt` with per-file CC0 attribution and source URLs
   - Target: MP3 at 64kbps mono, ~5-15KB per file
   - Place in `public/sounds/` directory (static paths only, never user-supplied URLs)
   - **Acceptance:** All 9 sounds consistent in style, < 50KB each, distinct, CC0 license documented. **Cohesion criterion:** If after normalization and manual QA the sounds feel inconsistent (different character/timbre), source all sounds from a single freesound creator or a chess-specific sound pack (still CC0) before proceeding to Phase 2
   - **Tip:** Start steps 2-4 in parallel using placeholder sounds to unblock engineering work

2. **Add `media-src 'self'` to CSP**
   - `media-src` is **not explicitly defined** in `next.config.ts` - `default-src 'self'` already covers same-origin audio, but explicitly add `media-src 'self'` for clarity and future-proofing
   - **Placement:** Insert `media-src 'self';` after `font-src 'self'` (line 17) and before `connect-src` (line 18) to maintain conventional CSP directive ordering
   - **Note:** Audio will likely work without this change (covered by `default-src 'self'`), but explicit is better than implicit - don't use this as a debugging red herring if audio doesn't play
   - **Acceptance:** (1) Inspect response headers in dev tools or `curl -I localhost:3000` to confirm CSP includes `media-src 'self'`; (2) Playwright test (step 14) verifies no CSP violation console errors when playing sounds

3. **Create `useSound` hook** in `apps/frontend/src/hooks/`
   - Type-safe sound names via TypeScript enum:
     ```typescript
     type SoundType = 'move' | 'capture' | 'check' | 'castling' | 'promotion'
       | 'gameOverWin' | 'gameOverLoss' | 'gameOverDraw' | 'lowTimeWarning';
     ```
   - Expose: `{ play, playRef, setVolume, toggleMute, volume, isMuted }`
     - `play` — standard callback (for use in useEffects with proper deps)
     - `playRef` — stable ref (`useRef(play)`, synced via useEffect) for use inside `onDrop`/`onKeyboardMove` without polluting their dependency arrays. Exposed directly from hook to avoid each call site duplicating the ref boilerplate
   - **Audio approach: `HTMLAudioElement` pool** — one `HTMLAudioElement` per `SoundType` (9 elements total). No shared pool management needed — each sound type has a dedicated element. No `AudioContext` needed at all (iOS Safari unlock uses a silent `.play()` on a pool element instead):
     ```typescript
     // Pool: one element per sound type (9 total)
     const audioPool = useRef<Map<SoundType, HTMLAudioElement>>();
     // On creation: audio.preload = 'auto' (ensures browsers buffer the audio)
     ```
   - **Preload timing:** In `useEffect` after game data loads (avoid blocking initial render). Not on app-wide mount - only on game page visit. Guard against React StrictMode double-invoke with an `initialized` ref (`if (initialized.current) return`)
   - **Audio load failure handling:** If MP3 file fails to load (404, network error), handle `onerror` on HTMLAudioElement, log to Sentry (not console.error), mark that sound as unavailable in an `availableSounds: Set<SoundType>` ref, continue silently. The `play()` function checks `availableSounds.has(type)` before attempting playback — skips silently if unavailable
   - Handle volume and mute state
   - Persist preferences in localStorage with SSR guard (`typeof window !== 'undefined'`)
   - Handle Safari private mode localStorage errors
   - **First-interaction handling:** On first user gesture (click/keydown), call `audio.play().catch(() => {})` on a pool element at zero volume to unlock playback. This is simpler and more reliable than `AudioContext` create/resume/close (which has async close races). iOS 17+ only requires a user-gesture-triggered `.play()` call. If still blocked, show visual mute indicator, degrade gracefully (no retry spam)
   - **localStorage errors:** Fail silently with default values (no console.error revealing browser state)
   - **All `audio.play()` calls must use `.catch(() => {})`** — `play()` returns a Promise that rejects with `AbortError` when interrupted (e.g., rapid `pause()` then `play()`). A synchronous try-catch does NOT catch async Promise rejections. Pattern: `audio.play().catch(() => {})` to suppress unhandled rejection warnings
   - Sound interruption: `audio.pause(); audio.currentTime = 0;` before each `play()` (reuse pool, limit active Audio objects)
   - **Tab visibility:** Suppress sounds when `document.visibilityState !== 'visible'` (listen to `visibilitychange` event)
   - **Cleanup on unmount:** Pause all audio elements, clear their `src`, remove event listeners, clear the audio pool Map. **StrictMode note:** Cleanup must set `initialized.current = false` so the second mount re-initializes. Without clearing `src` on the first mount's elements, they'd be orphaned (not GC'd while holding a network resource). **Ref cleanup behaviors differ by purpose:** `initialized` resets to `false` on cleanup (must re-run init on StrictMode remount), but `wasGameOverOnLoad` (Step 7) must NOT reset (it's a one-time snapshot of initial game state that must survive StrictMode remount). Document this asymmetry with comments in both locations
   - **`prefers-reduced-motion`:** Audio is NOT suppressed by `prefers-reduced-motion` — sounds are not motion/animation. Users who want silence should use the mute control. Low-time warning is the only sound that could be argued as disruptive, but it's a functional alert, not decorative
   - **Acceptance:** Hook plays sounds without lag, respects user preferences, works in SSR, no memory leaks

4. **Create `SoundControl` component** in `apps/frontend/src/app/game/[id]/components/`
   - **Placement:** Render immediately after `<GameInfo game={game} />` in page.tsx, before the replay controls / resign+save buttons section. Compact inline layout — mute toggle icon + volume slider
   - Volume slider using native `<input type="range" min="0" max="100" step="10">` — `step="10"` ensures arrow keys adjust by 10% increments (WCAG 2.1.1 keyboard operability)
   - Mute/unmute toggle button
   - Speaker icon changes based on volume level (muted, low, medium, high)
   - Use `useAriaLiveAnnouncer` to announce "Sound enabled" / "Sound muted" on toggle
   - Add `data-testid` attrs: `sound-control`, `mute-button`, `volume-slider`
   - **Update `components/index.ts`** to export `SoundControl`
   - Visible in both active game and replay mode (allows pre-setting preferences)
   - **Acceptance:** Volume changes apply immediately, state persists across refresh

**Phase 1 smoke test:** Before moving to Phase 2, verify `useSound` can play a placeholder sound on a button click in isolation. This catches browser autoplay issues early before wiring into game logic.

### Phase 2: Game Event Integration (Effort: M)

5. **Create sound utility functions** in `apps/frontend/src/lib/soundUtils.ts`
   - **`determineSoundType(moveResult: Move, isInCheck: boolean): SoundType`** — standalone pure function for move sound detection. `Move` type imported from `chess.js`:
     - Map chess.js flags to sound types:
       - `chess.inCheck()` after move -> check sound
       - `move.captured` -> capture sound
       - `move.flags` includes 'k' or 'q' -> castling sound
       - `move.flags` includes 'p' -> promotion sound (plays after piece selected, not on pawn drop)
       - Default -> move sound
     - **Sound priority** (when multiple flags): check > promotion > capture > castling > move
       - **Promotion + capture:** Plays promotion sound (promotion is the rarer, more significant event)
       - **Promotion + check:** Plays check sound (check takes highest priority always)
       - **Defensive note:** The priority chain handles all valid chess flag combinations. If chess.js ever produces unexpected flag combos (e.g., castling + capture — impossible in standard chess), the priority chain still returns the highest-priority match. No special error handling needed — the function always returns a valid `SoundType`. Add a unit test for an impossible flag combo to verify graceful fallback
   - **`determineGameOverSoundType(result: GameResult): SoundType`** — co-located in same file. `GameResult` imported from `@chess-website/shared` (`packages/shared/src/types/game.ts`). Use an **exhaustive `Record<GameResult, SoundType>` map** (not `startsWith` matching) for compile-time safety — adding a new `GameResult` variant will produce a TS error instead of silently falling through:
     ```typescript
     import type { GameResult } from '@chess-website/shared';

     const GAME_OVER_SOUND_MAP: Record<GameResult, SoundType> = {
       user_win_checkmate: 'gameOverWin',
       user_win_timeout: 'gameOverWin',
       engine_win_checkmate: 'gameOverLoss',
       engine_win_timeout: 'gameOverLoss',
       user_resigned: 'gameOverLoss',
       draw_stalemate: 'gameOverDraw',
       draw_insufficient_material: 'gameOverDraw',
       draw_repetition: 'gameOverDraw',
       draw_fifty_moves: 'gameOverDraw',
     } satisfies Record<GameResult, SoundType>;
     ```
   - Also export `SoundType`, `SOUND_FILES` map, and `SOUND_STORAGE_KEYS` constants from this file
   - **Acceptance:** Both pure functions with full unit test coverage

6. **Retain move flags from `chess.move()` result**
   - The `chess.move()` result is captured but its flags (`.captured`, `.flags`) go unused - retain the result for sound selection
   - Pass to `determineSoundType()` along with `chess.inCheck()`
   - **Acceptance:** Move flags available for sound selection after every move

7. **Integrate sounds into game flow**
   - **Two integration points: `onDrop` + `onKeyboardMove`**
     - `onSquareClick` delegates to `onDrop`, so `onDrop` covers drag-and-drop AND click-to-move. **Pre-Phase 2 verification required:** At the start of Phase 2, confirm in react-chessboard v5 source/docs that `onSquareClick` still delegates to `onDrop`. If it does NOT, add sound integration to `onSquareClick` as a third path (same pattern as `onKeyboardMove`)
     - **`onKeyboardMove` is a separate, independent code path** with its own `testChess.move()`, optimistic update, and `gameApi.makeMove()` call. It does NOT delegate to `onDrop`. Both paths must have sound integration
     - Do NOT add sound in `onSquareClick` (would cause duplicate sounds with `onDrop`)
   - **User move sound (both paths):** Play at the optimistic update point (before API call), using the `testChess.move()` result which has flags. Use `testChess.inCheck()` (not main `chess`) for check detection since `testChess` reflects the post-move state. **Variable scoping note:** `testChess` and `moveResult` are declared inside a `try` block — sound code MUST be placed inside that same `try` block (after the `if (!moveResult) return false` guard, before the API call). `onDrop` returns `boolean` (react-chessboard contract): `false` for invalid moves, `true` at the end. Sound code must not interfere with this return flow — since `playRef.current()` is fire-and-forget (`.catch(() => {})` internally), it cannot throw or prevent `return true`. All sound-related code uses only locally-scoped variables within the handler — no new state or context dependencies are introduced
   - **Promotion sound timing:** Currently auto-queens (no promotion picker yet) — play promotion sound immediately at the optimistic update point. When the promotion picker UI is added (PR #150), sound must move to fire **after** piece selection completes (not on pawn drop to last rank). The `determineSoundType()` call stays the same; only the trigger timing changes
   - **Game-over sound — 3 trigger paths:**
     1. **Checkmate/stalemate via makeMove:** In `.then()` handler, check `result.game.isGameOver && !previousGame.isGameOver`
     2. **Timeout via fetchGame:** When clock hits 0, `fetchGame()` updates state via `setGame(gameData)` — detect game-over in this path too. **Timing note:** `displayTimeUser` ticks down locally; `game.isGameOver` is set by the server response. Sound plays when fetch completes (not when clock visually hits 0). Brief window where clock shows 0:00 but sound hasn't played yet — this is acceptable
     3. **Resign:** Resign handler uses `await` (not `.then()`), sets game via `setGame(result)` synchronously in the try block. The consolidated useEffect watching `game?.isGameOver` still catches this
   - **Game-over sound type:** Use `determineGameOverSoundType()` from step 5 to map `game.result` to the correct sound
   - **Consolidated approach:** Use a `wasGameOverOnLoad` ref (initialized to `null`). **Initialization problem:** `fetchGame()` is a shared function used for initial load, timeout refetch, AND visibility refetch — cannot set the ref inside `fetchGame` without a guard. **Solution:** Use a separate `hasSetInitialGameOver` ref. In the game-over useEffect, on the first non-null `game`, set `wasGameOverOnLoad.current = game.isGameOver` and `hasSetInitialGameOver.current = true`. The useEffect only plays sound when `hasSetInitialGameOver.current === true && wasGameOverOnLoad.current === false && game.isGameOver && game.result` (null check on `game.result` — result may be undefined momentarily if server hasn't processed timeout yet). This avoids modifying `fetchGame` and avoids the brief render gap problem (useEffect runs synchronously after state update in React 19 batching). **StrictMode note:** `wasGameOverOnLoad` must NOT be reset on cleanup — it represents a one-time snapshot of initial state
   - **IMPORTANT:** Create a NEW, separate useEffect for game-over sound — do NOT merge into the existing modal useEffect at page.tsx line 210. The existing useEffect controls `showGameOverModal` with a 500ms delay; the sound useEffect uses different guards (`wasGameOverOnLoad`, `hasSetInitialGameOver`) and fires immediately
   - **Game-over useEffect dependency array:** `[game?.isGameOver, game?.result]` — `playRef`, `wasGameOverOnLoad`, and `hasSetInitialGameOver` are all refs (stable, don't trigger re-runs). Only reactive values in the deps array
   - **Game-over sound vs modal timing:** Sound plays immediately via useEffect. The existing game-over modal has a 500ms delay. This is intentional — sound provides instant feedback, modal appears slightly after. Not a race condition
   - **Tab visibility re-fetch:** When a game ends while the tab is hidden (timeout, engine checkmate), `fetchGame()` fires on tab focus. Since `wasGameOverOnLoad` is `false` (game was active at load), the game-over sound will play when the user returns. This is correct — the user should hear the game ended
   - Do NOT play game-over sounds when loading/navigating to a previously finished game (the ref guard prevents this)
   - **No sound on initial game load** - when loading a game in progress or a finished game, render board silently
   - **No sound on failed optimistic update** - if API call fails and move reverts, sound already played is acceptable (too fast to matter)
   - **`playRef` pattern:** `useSound` exposes `playRef` (a stable ref) directly. Use `playRef.current(soundType)` inside `onDrop`/`onKeyboardMove` — no dependency array changes needed. This keeps the existing dependency arrays unchanged
   - **Page complexity management:** Extract a `useGameSounds(game, displayTimeUser, timeControlType, playRef)` custom hook in `apps/frontend/src/hooks/useGameSounds.ts` that encapsulates: the game-over useEffect (with `wasGameOverOnLoad` + `hasSetInitialGameOver` refs), the low-time warning useEffect (with `hasPlayedWarning` + `lastWarningTime` refs), and the `wasGameOverOnLoad` initialization logic. This keeps page.tsx changes minimal — one hook call + `playRef.current()` calls in `onDrop`/`onKeyboardMove`. **Decision made:** Extract, don't inline. 4 refs + 2 useEffects added to an already-complex page.tsx warrants extraction
   - **Acceptance:** Correct sound plays for each event type via both input methods, no sound on page load or when viewing finished games

8. **Engine move sound detection**
   - Backend returns `engineMove.san` but not flags
   - **Code change required in BOTH `onDrop` and `onKeyboardMove`:** `result.engineMove` is currently **unused** on the frontend - `setGame(result.game)` is the only action taken on API response. Must add code to read `result.engineMove.san` and replay it client-side
   - **Explicit `onKeyboardMove` sub-checklist** (independent code path, easy to forget):
     - [ ] Capture `userMoveFen` after valid move (same pattern as `onDrop`)
     - [ ] Play user move sound via `playRef.current()` inside `try` block
     - [ ] Add engine move sound replay in `.then()` handler
     - [ ] Verify return flow is not affected (onKeyboardMove returns void, simpler than onDrop)
   - **FEN race condition fix (both paths):** Capture `userMoveFen` AFTER a successful `testChess.move()` but BEFORE the `gameApi.makeMove()` call. **Guard:** Only capture `userMoveFen` when `moveResult` is non-null (i.e., after the `if (!moveResult) return` guard passes). **Verified:** `newFen` is `let`-declared before the `try` block at line 333 (onDrop) and line 391 (onKeyboardMove), so it IS accessible outside the try. Capture `userMoveFen = newFen` at line 354 (onDrop) / line 402 (onKeyboardMove) — after `newFen = testChess.fen()` succeeds, before `gameApi.makeMove()`. Do NOT use `result.game.fen` (that's after the engine moved) or `game.currentFen` (stale due to optimistic update):
     ```typescript
     // AFTER moveResult validation, BEFORE API call (in BOTH onDrop and onKeyboardMove)
     // newFen was assigned inside try via testChess.fen() — only valid if moveResult is non-null
     const userMoveFen = newFen;

     // In the .then() handler (same pattern for both paths):
     if (result.engineMove?.san) {
       try {
         const tempChess = new Chess(userMoveFen); // FEN BEFORE engine move
         const engineResult = tempChess.move(result.engineMove.san);
         if (engineResult) {
           playRef.current(determineSoundType(engineResult, tempChess.inCheck()));
         }
       } catch { /* malformed SAN — skip engine sound silently */ }
     }
     ```
   - Use same `determineSoundType()` function as user moves
   - Play sound when engine response arrives (in the `.then()` handler), alongside `setGame(result.game)`
   - **Stale response guard:** In the `.then()` handler, before playing engine sound, verify `gameId` hasn't changed (user may have navigated away). Compare the `gameId` captured at call time against the current `gameId` from the outer scope. If they differ, skip the engine sound silently (the user is viewing a different game)
   - **No debounce initially** - user sound plays at optimistic update, engine sound plays when API responds (200ms+ later). Natural gap prevents clashing. **Intended UX flow:** user move sound → EngineThinkingOverlay appears → engine move sound → board updates. Add debounce only if testing reveals actual overlap
   - **Tab-hidden engine move:** If the user's tab is hidden when the API response arrives, the engine move sound is suppressed by the visibility check. When the user returns, `fetchGame()` updates the board but no engine sound plays (the `.then()` handler already executed). This is acceptable — a stale engine move sound on tab return would be confusing
   - **Acceptance:** Engine moves produce correct sounds via both input methods, no audio clashing with user moves

9. **Add low-time warning sound**
   - Watch `displayTimeUser` (local state, in **milliseconds**) — the client-side ticking value, NOT `game.timeLeftUser` which only updates on API responses
   - Trigger when `displayTimeUser < 10_000` (10 seconds), separate from existing `isLowTime` visual indicator at 30s (`< 30000`). **UX rationale for different thresholds:** The visual indicator (red clock at 30s) serves as a gentle "heads up" — the player notices time is running low. The audio warning at 10s is an urgent alert — time is critically low and requires immediate action. Two distinct thresholds create a progressive urgency ramp: visual awareness at 30s → audio urgency at 10s. A single threshold would either make the audio too early (annoying at 30s) or the visual too late (useless at 10s)
   - Play once per threshold crossing (use `hasPlayedWarning` ref). **Guard order in useEffect (top to bottom):**
     1. `if (game?.isGameOver || isReplayMode) return;` — no warnings for finished games
     2. `if (timeControlType === 'none') return;` — no warnings for untimed games (where `displayTimeUser` legitimately stays `0`)
     3. `if (displayTimeUser === 0) return;` — skip uninitialized state (page.tsx line 47 initializes to `0` before `fetchGame()` populates real value)
     4. `if (displayTimeUser >= 10_000) { /* reset hasPlayedWarning if increment pushed above threshold */ return; }`
     5. Threshold crossed — play warning if `!hasPlayedWarning.current` and cooldown elapsed
   - **Separate page-load guard:** After all guards pass, if this is the first render with real time data already below 10s (e.g., resuming a bullet game), initialize `hasPlayedWarning.current = true` to prevent a warning sound on page load (violates "no sound on initial game load")
   - For games WITH increment: reset `hasPlayedWarning` when `displayTimeUser` rises above `10_000` (increment applied). **Cooldown guard:** Track `lastWarningTime` ref — suppress re-triggering within 5 seconds of the last warning to prevent spam near the boundary (e.g., `bullet_2min` with 1s increment oscillating around 10s)
   - For games WITHOUT increment: play once, never reset (clock only decreases)
   - Only for player's clock (not engine)
   - Guard: skip if `game.isGameOver`, `isReplayMode`, or `timeControlType === 'none'`
   - **Acceptance:** Warning plays at 10 seconds, resets on increment, no rapid-fire spam near threshold

10. **No sounds in replay mode (already handled by existing guards)**
    - **Verified:** `isReplayMode` is derived directly from `game?.isGameOver ?? false` (page.tsx line 59) — it is NOT a separate state variable. When `game.isGameOver` is true, `isReplayMode` is true. No separate replay state exists
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
    - **Error boundary isolation:** Verify that audio errors (load failure, playback rejection) do NOT propagate to page-level error boundaries (`game/[id]/error.tsx`). All `audio.play()` calls use `.catch(() => {})`, and `onerror` handlers log to Sentry without throwing. Test in Playwright: simulate audio load failure (e.g., rename sound file), confirm game page still renders and functions without triggering error boundary
    - **Acceptance:** All visual feedback works with sound muted, volume slider fully keyboard-operable, audio failures never trigger error boundaries

12. **Set up frontend unit test infrastructure (prerequisite)**
    - The frontend currently has **zero unit test infrastructure** — only Playwright E2E tests exist
    - Install: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDependencies
    - Create `apps/frontend/vitest.config.ts` with jsdom environment and `@` path alias matching `tsconfig.json`
    - Add `"test": "vitest run"` script to `apps/frontend/package.json`
    - **Scope:** Keep minimal — only configure enough to test pure functions (`determineSoundType`) and the `useSound` hook with mocked `HTMLAudioElement`. Do NOT attempt to test full page components (App Router `'use client'` directives, React Server Components) — leave that to Playwright
    - **CI integration:** CI uses `pnpm -r test` (not turbo) which runs the `test` script in all workspaces that have one. Adding `"test": "vitest run"` to frontend's `package.json` is sufficient — no `turbo.json` changes needed. **Vitest vs Jest compatibility:** Both exit with code 1 on failure, which is what CI checks. Vitest uses a different output format but `pnpm -r test` reports pass/fail per workspace regardless. Run `pnpm deps:check` locally after adding vitest to catch outdated/deprecated warnings before pushing
    - **Acceptance:** `cd apps/frontend && pnpm test` runs and finds test files; CI pipeline runs them; `pnpm deps:check` passes with no new outdated/deprecated warnings from vitest dependencies

13. **Unit tests**
    - `determineSoundType()` pure function tests (all flag combinations, priority order including promotion+capture)
    - `determineGameOverSoundType()` tests (all GameResult variants)
    - `useSound` hook tests: mock `HTMLAudioElement` in `vitest.setup.ts` — jsdom's `play()` returns `undefined` not a Promise, so mock must return `Promise.resolve()`
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
    - **Audio playback verification approach:** Do NOT rely on `.paused`/`.currentTime` on HTMLAudioElement — short clips may complete before assertion runs (`.paused` returns `true` for completed clips, `.currentTime` resets to 0). Instead, use `page.addInitScript()` to mock `HTMLAudioElement.prototype.play` and track calls:
      ```typescript
      await page.addInitScript(() => {
        window.__soundsPlayed = [];
        const origPlay = HTMLAudioElement.prototype.play;
        HTMLAudioElement.prototype.play = function() {
          window.__soundsPlayed.push(this.src);
          return origPlay.call(this);
        };
      });
      // After game action:
      const played = await page.evaluate(() => window.__soundsPlayed);
      expect(played.some(src => src.includes('move.mp3'))).toBe(true);
      ```
    - Also test `.volume` and `.muted` state on audio elements (these are stable, unlike playback state)
    - **Verify no CSP errors:** After triggering audio playback, check browser console for CSP violation messages (`page.on('console')` filtering for `Content-Security-Policy`)
    - **Acceptance:** Controls render, toggle, persist; play() calls tracked via mock; zero CSP violations

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Browser autoplay policy blocks sound | High | Medium | Silent `.play()` on first user gesture to unlock; show mute indicator if blocked |
| Safari private/quirks | Medium | Medium | Silent `.play()` unlock on gesture; no AudioContext needed; test on iOS Safari |
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
- Replay mode `useEffect` on move list (Sonnet LOW v10 - no sound useEffect watches move list, only `game?.isGameOver`)
- Sentry init timing for early audio failures (Sonnet LOW v10 - Sentry client inits in `sentry.client.config.ts` before page components mount; non-issue)
- Volume slider touch target inconsistency on mobile (Sonnet v10 - native `<input type="range">` is acceptable; test on mobile during Playwright phase)
- Extract shared `executeMove()` helper from onDrop/onKeyboardMove (Opus v10 - out of scope for sound PR, would be a refactor; noted as optional future improvement)
- `onDrop` dependency array explicitly unchanged — `[game, chess, gameId, isMoving]` (Opus LOW v11 - confirmed zero new deps; sound code uses only local variables + playRef)
- Resign sound type correctness — `user_resigned` maps to `gameOverLoss` in exhaustive Record (Opus LOW v11 - confirmed correct)
- Game page missing from axe-core spec (Sonnet v11 - out of scope for sound PR; tracked separately)
- React 19 batching assumption for `wasGameOverOnLoad` (Sonnet v11 - valid in React 19; documented as assumption)
- `onSquareClick` delegation to `onDrop` — PROMOTED to pre-Phase 2 verification step in v16 (Sonnet MEDIUM v15 - load-bearing assumption)
- `playRef` pattern confirmed sound (Opus LOW v12 - stable ref avoids dep array pollution, no new deps)
- Volume slider `step="10"` label phrasing — "10 percentage points" vs "10%" (Sonnet LOW v12 - functionally identical, cosmetic)
- Phase 1 smoke test may need temporary button if SoundControl not wired yet (Sonnet LOW v12 - implementation detail)
- Service Worker / PWA interference with audio caching (Sonnet v12 - future concern; no SW exists currently)
- Mid-play tab hiding for long sounds (Sonnet v12 - sounds are <1s clips, negligible)
- `useGameSounds` extraction — RESOLVED in v16: decided to extract (Sonnet MEDIUM v15 confirmed 4 refs + 2 useEffects warrants it)
- Concrete freesound.org sound IDs in plan (Sonnet LOW v13 - will be chosen during implementation based on availability and quality)
- Audio pool memory rollback plan (Sonnet v13 - 9 HTMLAudioElement instances are lightweight; mute toggle is the rollback)
- Audio context resumption after device sleep (Sonnet v13 - using HTMLAudioElement not AudioContext; add iOS lock/unlock to Playwright mobile tests)
- `moveResult` retention phrasing (Opus MEDIUM v13 - existing `const moveResult = testChess.move(...)` already captures result; no extra "retain" step needed, just use it)
- `Permissions-Policy` code comment near autoplay (Opus LOW v15 - noted in ignored items already; one-line comment is cheap but not blocking)
- `window.__soundsPlayed` TypeScript declaration for Playwright tests (Opus LOW v15 - add `sounds.d.ts` during implementation if TS errors arise)
- Run `pnpm build` after vitest setup in step 12 (Opus LOW v15 - already implied by acceptance criteria; turbo caching verified)
- Line number drift for `userMoveFen` capture (Opus LOW v15 - plan references pattern not just line numbers)
- `React.memo` on SoundControl (Sonnet LOW v15 - clock ticks cause re-renders; wrap if profiling shows issue)
- iOS Safari `preload="auto"` silently ignored until user gesture (Sonnet LOW v15 - sounds still play after first gesture; document in code comments)
- Promotion TODO comment for PR #150 coordination (Sonnet LOW v15 - add `// TODO(PR #150)` during implementation)
- `aria-valuetext` for volume slider percentage (Sonnet LOW v15 - add `aria-valuetext={\`${volume}%\`}` during implementation)

## Dependencies

- No new npm packages for audio (use native `HTMLAudioElement` pool; vitest + testing-library for tests only)
- Sound asset files (CC0 licensed from freesound.org) + `LICENSE.txt`
- chess.js move flags for sound type detection (user moves)
- chess.js SAN replay for engine move sound detection
