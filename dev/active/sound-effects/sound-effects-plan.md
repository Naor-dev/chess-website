# Sound Effects - Implementation Plan

**Last Updated:** 2026-02-09

## Executive Summary

Add chess sound effects for moves, captures, check, castling, promotion, and game-end events. Include volume control with mute toggle. Must be WCAG 2.1 AA compliant (sounds never the sole feedback channel).

## Current State Analysis

- No audio infrastructure exists (zero audio files, no Web Audio API usage)
- No sound-related libraries in dependencies
- Game events are currently visual-only (board updates, modals, overlays)
- Key trigger points exist in `apps/frontend/src/app/game/[id]/page.tsx`
- `chess.move()` result (lines 281-296) is captured and checked for validity, but move **flags** (`.captured`, `.flags`) go unused - need to retain them for sound selection
- Backend `MoveResponse` returns `engineMove.san` but NOT chess.js flags - engine move sound type must be computed client-side
- No localStorage usage exists yet in the codebase - need SSR guards
- `isLowTime` visual threshold already exists at 30 seconds (`page.tsx:485`) - audio warning uses a separate 10s threshold
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
   - Normalize all files to consistent loudness (-23 LUFS, game audio standard)
   - Create `public/sounds/LICENSE.txt` with per-file CC0 attribution and source URLs
   - Target: MP3 at 64kbps mono, ~5-15KB per file
   - Place in `public/sounds/` directory (static paths only, never user-supplied URLs)
   - **Acceptance:** All 9 sounds consistent in style, < 50KB each, distinct, CC0 license documented
   - **Tip:** Start steps 2-4 in parallel using placeholder sounds to unblock engineering work

2. **Add `media-src 'self'` to CSP**
   - `media-src` is **not explicitly defined** in `next.config.ts` - `default-src 'self'` may cover it, but explicitly add `media-src 'self'` for clarity and safety
   - **Acceptance:** CSP header includes `media-src 'self'`, audio files load without CSP errors

3. **Create `useSound` hook** in `apps/frontend/src/hooks/`
   - Type-safe sound names via TypeScript enum:
     ```typescript
     type SoundType = 'move' | 'capture' | 'check' | 'castling' | 'promotion'
       | 'gameOverWin' | 'gameOverLoss' | 'gameOverDraw' | 'lowTimeWarning';
     ```
   - Expose: `{ play, setVolume, toggleMute, volume, isMuted }`
   - **Audio pool via `useRef`:** `useRef<Map<SoundType, HTMLAudioElement>>()` to avoid re-renders
   - Preload audio files on first game page visit (lazy, not app-wide)
   - Handle volume and mute state
   - Persist preferences in localStorage with SSR guard (`typeof window !== 'undefined'`)
   - Handle Safari private mode localStorage errors
   - **First-interaction handling:** Initialize AudioContext on first board click/drag, show visual mute indicator if audio blocked. If `AudioContext.resume()` fails, degrade gracefully (persistent mute icon, no retry spam)
   - **localStorage errors:** Fail silently with default values (no console.error revealing browser state)
   - **All `play()` calls wrapped in try-catch** - audio failures never crash the app
   - Sound interruption: `audio.pause(); audio.currentTime = 0;` before each `play()` (reuse pool, limit active Audio objects)
   - **Tab visibility:** Suppress sounds when `document.visibilityState !== 'visible'` (listen to `visibilitychange` event)
   - **Cleanup on unmount:** Close `AudioContext`, remove event listeners, clear audio pool
   - **Acceptance:** Hook plays sounds without lag, respects user preferences, works in SSR, no memory leaks

4. **Create `SoundControl` component** in `apps/frontend/src/app/game/[id]/components/`
   - Volume slider (0-100%)
   - Mute/unmute toggle button
   - Speaker icon changes based on volume level
   - Add `data-testid` for Playwright testing
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
   - **Sound priority** (when multiple flags): check > capture > castling > promotion > move
   - Place in `apps/frontend/src/utils/soundUtils.ts` or co-located with hook
   - **Acceptance:** Pure function with full unit test coverage

6. **Retain move flags from `chess.move()` result**
   - The `chess.move()` result is captured but its flags (`.captured`, `.flags`) go unused - retain the result for sound selection
   - Pass to `determineSoundType()` along with `chess.inCheck()`
   - **Acceptance:** Move flags available for sound selection after every move

7. **Integrate sounds into game flow**
   - After successful user move: play sound based on move flags
   - Promotion: currently auto-queens (no promotion picker yet). Play promotion sound immediately. If promotion picker is added later, play after piece selection completes
   - On game over: play appropriate win/loss/draw sound
   - **No sound on initial game load** - when loading a game in progress, render board silently (only play on new moves)
   - **No sound on failed optimistic update** - if API call fails and move reverts, sound already played is acceptable (too fast to matter)
   - **Acceptance:** Correct sound plays for each event type, no sound on page load

8. **Engine move sound detection**
   - Backend returns `engineMove.san` but not flags
   - Strategy: replay engine SAN on client-side chess instance to get flags:
     ```typescript
     const tempChess = new Chess(currentFen);
     const engineResult = tempChess.move(engineMove.san);
     // engineResult now has .captured, .flags, etc.
     ```
   - Use same `determineSoundType()` function as user moves
   - Play sound when engine response arrives and board updates (not when API call starts)
   - **Debounce:** If user sound played within last 200ms, delay engine sound by 100ms to avoid clashing
   - **Coordinate with react-chessboard animation timing** - play sound at animation start, not before
   - **Acceptance:** Engine moves produce correct sounds, no audio clashing with user moves

9. **Add low-time warning sound**
   - Trigger when player clock reaches 10 seconds (separate from existing `isLowTime` visual indicator at 30s in `page.tsx:485`)
   - Play once per game (use `hasPlayedWarning` ref)
   - For games WITH increment: reset `hasPlayedWarning` after a move adds time above 10s
   - For games WITHOUT increment: play once, never reset (clock only decreases)
   - Only for player's clock (not engine)
   - **Acceptance:** Warning plays once at 10 seconds, only resets if increment pushes clock above threshold

10. **Disable sounds in replay mode**
    - When `MoveReplayControls` is active (navigating through move history), mute all game sounds
    - **Acceptance:** No sounds play during move replay navigation

### Phase 3: Accessibility & Testing (Effort: M)

11. **WCAG 2.1 AA compliance**
    - Sounds are supplementary (all events have visual feedback already)
    - Mute control is keyboard accessible (Tab to focus, Enter/Space to toggle)
    - Volume slider has `aria-label="Volume"` and `aria-valuenow`
    - Screen reader announces mute state change ("Sound enabled" / "Sound muted")
    - No sound auto-plays before user interaction (autoplay policy)
    - **Acceptance:** All visual feedback works with sound muted

12. **Unit tests**
    - `determineSoundType()` pure function tests (all flag combinations, priority order)
    - `useSound` hook tests: mock `HTMLAudioElement` / `AudioContext`
    - Test play(), setVolume(), toggleMute()
    - Test volume/mute persistence in localStorage
    - Test SSR guard (no errors when window undefined)
    - Test first-interaction gating
    - Test tab visibility suppression
    - Test cleanup on unmount (no lingering AudioContext/listeners)
    - **Acceptance:** All tests pass, no memory leaks

13. **Playwright UI tests**
    - Verify sound controls render and toggle
    - Verify mute state persists across page reload
    - Test HTMLAudioElement state changes via `page.evaluate()` (played, volume, muted)
    - **Acceptance:** Controls render, toggle, persist; audio element state verifiable

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

## Ignored Low-Priority Items

- Merge steps 5+6 (minor restructuring, not worth churn)
- SAN-based fallback for sound detection (chess.js replay is more reliable)
- SoundContext provider (hook approach is sufficient for single-page usage)
- Sound file naming convention docs (obvious during implementation)
- Offline support / graceful audio load failure (try-catch covers this)
- Performance metrics measurement (verify during implementation)
- Predictive preloading on "New Game" hover (minor optimization)

## Dependencies

- No new npm packages (use native `HTMLAudioElement` pool; `AudioContext` only for unlock-on-first-interaction if needed)
- Sound asset files (CC0 licensed from freesound.org) + `LICENSE.txt`
- chess.js move flags for sound type detection (user moves)
- chess.js SAN replay for engine move sound detection
