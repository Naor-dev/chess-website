# Sound Effects - Implementation Plan

**Last Updated:** 2026-02-08

## Executive Summary

Add chess sound effects for moves, captures, check, castling, promotion, and game-end events. Include volume control with mute toggle. Must be WCAG 2.1 AA compliant (sounds never the sole feedback channel).

## Current State Analysis

- No audio infrastructure exists (zero audio files, no Web Audio API usage)
- No sound-related libraries in dependencies
- Game events are currently visual-only (board updates, modals, overlays)
- Key trigger points exist in `apps/frontend/src/app/game/[id]/page.tsx`
- `moveResult` from `chess.move()` (lines 281-296) is currently used only for validation then discarded - need to capture flags for sound selection
- Backend `MoveResponse` returns `engineMove.san` but NOT chess.js flags - engine move sound type must be computed client-side
- No localStorage usage exists yet in the codebase - need SSR guards

## Proposed Future State

- Distinct sounds for: move, capture, check, castling, promotion, game-over (win/loss/draw), low time warning
- Volume slider + mute toggle in game UI
- User preference persisted in localStorage (with SSR guard)
- Sounds complement (never replace) visual feedback
- Preloaded for zero-latency playback
- No sounds during move replay mode

## Implementation Phases

### Phase 1: Audio Infrastructure (Effort: M-L)

1. **Source CC0 chess sound assets**
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
   - Normalize all files to consistent loudness (e.g., -16 LUFS)
   - Target: MP3 at 64kbps mono, ~5-15KB per file
   - Place in `public/sounds/` directory
   - **Acceptance:** All sound files < 50KB each, clear and distinct, CC0 license documented

2. **Verify CSP compatibility**
   - Check `next.config.ts` Content Security Policy for `media-src`
   - Ensure `media-src 'self'` allows local audio files
   - **Acceptance:** Audio files load without CSP errors

3. **Create `useSound` hook** in `apps/frontend/src/hooks/`
   - Type-safe sound names via TypeScript enum:
     ```typescript
     type SoundType = 'move' | 'capture' | 'check' | 'castling' | 'promotion'
       | 'gameOverWin' | 'gameOverLoss' | 'gameOverDraw' | 'lowTimeWarning';
     ```
   - Expose: `{ play, setVolume, toggleMute, volume, isMuted }`
   - Preload audio files on first game page visit (lazy, not app-wide)
   - Handle volume and mute state
   - Persist preferences in localStorage with SSR guard (`typeof window !== 'undefined'`)
   - Handle Safari private mode localStorage errors
   - **First-interaction handling:** Initialize AudioContext on first board click/drag, show visual mute indicator if audio blocked
   - Sound interruption: `audio.pause(); audio.currentTime = 0;` before each `play()`
   - **Acceptance:** Hook plays sounds without lag, respects user preferences, works in SSR

4. **Create `SoundControl` component** in `apps/frontend/src/app/game/[id]/components/`
   - Volume slider (0-100%)
   - Mute/unmute toggle button
   - Speaker icon changes based on volume level
   - Add `data-testid` for Playwright testing
   - **Acceptance:** Volume changes apply immediately, state persists across refresh

### Phase 2: Game Event Integration (Effort: M)

5. **Capture move flags for sound selection**
   - Store `moveResult` from `chess.move()` in a ref before optimistic update (currently discarded at line 281-296)
   - Map chess.js flags to sound types:
     - `move.captured` -> capture sound
     - `move.flags` includes 'k' or 'q' -> castling sound
     - `move.flags` includes 'p' -> promotion sound (plays after piece selected, not on pawn drop)
     - `chess.inCheck()` after move -> check sound
     - Default -> move sound
   - **Sound priority** (when multiple flags): check > capture > castling > promotion > move
   - **Acceptance:** Correct sound type determined for every move

6. **Integrate sounds into game flow**
   - After successful user move: play sound based on captured flags
   - After promotion: play promotion sound only after piece selection completes
   - On game over: play appropriate win/loss/draw sound
   - **No sound on failed optimistic update** - if API call fails and move reverts, sound already played is acceptable (too fast to matter)
   - **Acceptance:** Correct sound plays for each event type

7. **Engine move sound detection**
   - Backend returns `engineMove.san` but not flags
   - Strategy: replay engine SAN on client-side chess instance to get flags:
     ```typescript
     const tempChess = new Chess(currentFen);
     const engineResult = tempChess.move(engineMove.san);
     // engineResult now has .captured, .flags, etc.
     ```
   - Use same flag-to-sound mapping as user moves
   - **Acceptance:** Engine moves produce correct sounds

8. **Add low-time warning sound**
   - Trigger when player clock reaches 10 seconds (separate from existing `isLowTime` at 30s visual indicator)
   - Play once per turn (use `hasPlayedWarning` ref)
   - Reset `hasPlayedWarning` when clock resets after a move with increment
   - Only for player's clock (not engine)
   - **Acceptance:** Warning plays once at 10 seconds, resets after each move

9. **Disable sounds in replay mode**
   - When `MoveReplayControls` is active (navigating through move history), mute all game sounds
   - **Acceptance:** No sounds play during move replay navigation

### Phase 3: Accessibility & Testing (Effort: M)

10. **WCAG 2.1 AA compliance**
    - Sounds are supplementary (all events have visual feedback already)
    - Mute control is keyboard accessible (Tab to focus, Enter/Space to toggle)
    - Volume slider has `aria-label="Volume"` and `aria-valuenow`
    - Screen reader announces mute state change ("Sound enabled" / "Sound muted")
    - No sound auto-plays before user interaction (autoplay policy)
    - **Acceptance:** All visual feedback works with sound muted

11. **Unit tests for `useSound` hook**
    - Mock `HTMLAudioElement` / `AudioContext`
    - Test play(), setVolume(), toggleMute()
    - Test volume/mute persistence in localStorage
    - Test SSR guard (no errors when window undefined)
    - Test sound type selection from chess.js flags
    - Test first-interaction gating
    - **Acceptance:** All tests pass

12. **Playwright UI tests**
    - Verify sound controls render and toggle
    - Verify mute state persists across page reload
    - Note: cannot verify actual audio output in headless mode - test control UI only
    - **Acceptance:** Controls render, toggle, and persist correctly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Browser autoplay policy blocks sound | High | Medium | Initialize AudioContext on first board interaction, show mute indicator |
| Audio latency on mobile | Medium | Low | Preload all sounds, use small MP3 files (<15KB) |
| Sound licensing issues | Medium | High | Use CC0 from freesound.org only, document license per file |
| Multiple rapid moves overlap | Low | Low | Stop previous sound before playing new one (`pause() + currentTime = 0`) |
| Engine move flags unavailable from API | High | Medium | Replay SAN on client-side chess instance to get flags |
| localStorage unavailable (SSR/Safari private) | Medium | Low | SSR guard + try-catch, fall back to defaults |

## Success Metrics

- All 9 game events have distinct sounds
- Sound plays within 50ms of event
- Volume preference persists across sessions
- Mute works correctly, no sound leaks
- Fully keyboard accessible sound controls
- No sounds during replay mode
- Works on iOS Safari (after first interaction)

## Dependencies

- No new npm packages (use native `HTMLAudioElement` or `AudioContext`)
- Sound asset files (CC0 licensed from freesound.org)
- chess.js move flags for sound type detection (user moves)
- chess.js SAN replay for engine move sound detection
