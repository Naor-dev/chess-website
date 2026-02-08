# Sound Effects - Implementation Plan

**Last Updated:** 2026-02-08

## Executive Summary

Add chess sound effects for moves, captures, check, castling, promotion, and game-end events. Include volume control with mute toggle. Must be WCAG 2.1 AA compliant (sounds never the sole feedback channel).

## Current State Analysis

- No audio infrastructure exists (zero audio files, no Web Audio API usage)
- No sound-related libraries in dependencies
- Game events are currently visual-only (board updates, modals, overlays)
- Key trigger points exist in `apps/frontend/src/app/game/[id]/page.tsx`

## Proposed Future State

- Distinct sounds for: move, capture, check, castling, promotion, game-over (win/loss/draw), low time warning
- Volume slider + mute toggle in game UI
- User preference persisted in localStorage
- Sounds complement (never replace) visual feedback
- Preloaded for zero-latency playback

## Implementation Phases

### Phase 1: Audio Infrastructure (Effort: M)

1. **Source or create chess sound assets**
   - Move (piece placed on square)
   - Capture (piece taken)
   - Check (alert tone)
   - Castling (two-piece move)
   - Promotion (special move)
   - Game over - win (positive)
   - Game over - loss (negative)
   - Game over - draw (neutral)
   - Low time warning (10 seconds remaining)
   - File format: MP3 + OGG for browser compatibility
   - **Acceptance:** All sound files < 50KB each, clear and distinct

2. **Create `useSound` hook** in `apps/frontend/src/hooks/`
   - Preload all audio files on mount
   - Expose `play(soundName)` function
   - Handle volume and mute state
   - Persist preferences in localStorage
   - Graceful fallback if audio blocked (autoplay policy)
   - **Acceptance:** Hook plays sounds without lag, respects user preferences

3. **Create `SoundControl` component** in `apps/frontend/src/app/game/[id]/components/`
   - Volume slider (0-100%)
   - Mute/unmute toggle button
   - Speaker icon changes based on volume level
   - **Acceptance:** Volume changes apply immediately, state persists

### Phase 2: Game Event Integration (Effort: M)

4. **Integrate sounds into game flow**
   - After successful move: play move/capture/check/castling sound
   - Determine sound type from chess.js move result flags
   - After promotion: play promotion sound
   - On game over: play appropriate win/loss/draw sound
   - **Acceptance:** Correct sound plays for each event type

5. **Add low-time warning sound**
   - Trigger when player clock reaches 10 seconds
   - Play once (not repeatedly)
   - Only for player's clock (not engine)
   - **Acceptance:** Warning plays once at 10 seconds, doesn't repeat

6. **Engine move sounds**
   - Play appropriate sound when engine makes its move
   - Same logic: move/capture/check/castling detection
   - **Acceptance:** Engine moves produce correct sounds

### Phase 3: Accessibility & Testing (Effort: S)

7. **WCAG 2.1 AA compliance**
   - Sounds are supplementary (all events have visual feedback already)
   - Mute control is keyboard accessible
   - Volume slider has `aria-label` and `aria-valuenow`
   - No sound auto-plays before user interaction (autoplay policy)
   - Sound control announced by screen readers
   - **Acceptance:** All visual feedback works with sound muted

8. **Testing**
   - Unit tests for `useSound` hook (mock Audio API)
   - Test volume/mute persistence in localStorage
   - Test sound selection logic (move vs capture vs check)
   - Playwright: verify sound controls render and toggle
   - **Acceptance:** All tests pass, no console errors

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Browser autoplay policy blocks sound | High | Medium | Require user interaction first, show mute state clearly |
| Audio latency on mobile | Medium | Low | Preload all sounds, use small files (<50KB) |
| Sound licensing issues | Medium | High | Use CC0/public domain sounds (lichess sounds are AGPL) |
| Multiple rapid moves overlap | Low | Low | Stop previous sound before playing new one |

## Success Metrics

- All 9 game events have distinct sounds
- Sound plays within 50ms of event
- Volume preference persists across sessions
- Mute works correctly, no sound leaks
- Fully keyboard accessible sound controls

## Dependencies

- No new npm packages (use native `HTMLAudioElement` or `AudioContext`)
- Sound asset files (CC0 licensed)
- chess.js move flags for sound type detection



