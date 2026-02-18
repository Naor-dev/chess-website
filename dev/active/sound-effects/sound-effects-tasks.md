# Sound Effects - Task Checklist

**Last Updated:** 2026-02-18 (aligned with plan v13)

## Phase 1: Audio Infrastructure

- [ ] 1. Source/create 9 CC0 licensed MP3 sound files (or generate placeholders via ffmpeg)
- [ ] 1. Peak normalize to -1dB, then manual QA listening test for perceived loudness consistency
- [ ] 1. Document any per-file gain adjustments in `LICENSE.txt`
- [ ] 1. Add files to `apps/frontend/public/sounds/` + `LICENSE.txt`
- [ ] 2. Add `media-src 'self'` to CSP in `next.config.ts`
- [ ] 2. Verify CSP via `curl -I localhost:3000` or dev tools response headers
- [ ] 3. Create `useSound.ts` hook with HTMLAudioElement pool
- [ ] 3. Preload audio on game page visit (StrictMode-safe with `initialized` ref)
- [ ] 3. Handle volume/mute state + localStorage persistence (SSR guard + Safari private mode)
- [ ] 3. First-interaction unlock for iOS Safari (silent `.play()` on pool element at zero volume)
- [ ] 3. Tab visibility suppression (`document.visibilityState`)
- [ ] 3. Audio load failure -> mark unavailable in `availableSounds` Set, report to Sentry
- [ ] 3. Set `audio.preload = 'auto'` on pool element creation
- [ ] 3. Cleanup on unmount (clear pool, listeners, `initialized.current = false`)
- [ ] 3. Document ref cleanup asymmetry: `initialized` resets, `wasGameOverOnLoad` does NOT
- [ ] 4. Create `SoundControl.tsx` (mute toggle + volume slider)
- [ ] 4. Place after `<GameInfo>`, before resign/save controls
- [ ] 4. Speaker icon changes by volume level (muted, low, medium, high)
- [ ] 4. `useAriaLiveAnnouncer` for "Sound enabled"/"Sound muted"
- [ ] 4. Add `data-testid`: `sound-control`, `mute-button`, `volume-slider`
- [ ] 4. Export from `components/index.ts`

## Phase 2: Game Event Integration

- [ ] 5. Create `determineSoundType()` in `soundUtils.ts` (priority: check > promotion > capture > castling > move)
- [ ] 5. Create `determineGameOverSoundType()` with exhaustive `Record<GameResult, SoundType>` map
- [ ] 5. Use `import type { GameResult } from '@chess-website/shared'` (explicit import source)
- [ ] 5. Use `draw_repetition` (NOT `draw_threefold_repetition`) as variant name
- [ ] 6. Retain `testChess.move()` result flags in `onDrop` for sound selection
- [ ] 6. Retain `testChess.move()` result flags in `onKeyboardMove` for sound selection
- [ ] 7. Add `playRef` pattern (`useRef(play)` + sync useEffect)
- [ ] 7. Play user move sound in `onDrop` (inside `try` block, after `!moveResult` guard, before API call)
- [ ] 7. Verify `onDrop` return flow unaffected (`playRef.current()` is fire-and-forget)
- [ ] 7. Play user move sound in `onKeyboardMove` (same pattern, inside `try` block)
- [ ] 7. Add `wasGameOverOnLoad` + `hasSetInitialGameOver` refs
- [ ] 7. Add game-over useEffect (watch `game?.isGameOver`, gate with `wasGameOverOnLoad`)
- [ ] 8. Capture `userMoveFen` after moveResult non-null guard in `onDrop`
- [ ] 8. Add stale `gameId` guard in `.then()` handler before playing engine sound
- [ ] 8. Play engine move sound in `onDrop` `.then()` (replay SAN on temp Chess)
- [ ] 8. `onKeyboardMove` sub-checklist:
  - [ ] Capture `userMoveFen` after valid move (same pattern as `onDrop`)
  - [ ] Play user move sound via `playRef.current()` inside `try` block
  - [ ] Add engine move sound replay in `.then()` handler
  - [ ] Verify return flow not affected (returns void, simpler than onDrop)
- [ ] 9. Add low-time warning sound (10s threshold)
- [ ] 9. Add 5s cooldown guard (`lastWarningTime` ref) for increment games
- [ ] 9. Reset `hasPlayedWarning` when time rises above 10s
- [ ] 9. Guard: skip if `isGameOver`, `isReplayMode`, `timeControlType === 'none'`
- [ ] 10. Verify replay mode sounds are blocked by existing guards (documentation-only)
- [ ] 8. Wire `<SoundControl>` into page.tsx JSX

## Phase 3: Accessibility & Testing

- [ ] 11. Verify all sounds supplementary to visual feedback
- [ ] 11. Verify mute button keyboard accessible (Tab, Enter/Space)
- [ ] 11. Verify volume slider keyboard accessible (arrows, Home/End)
- [ ] 11. Verify audio errors don't trigger page error boundary (`game/[id]/error.tsx`)
- [ ] 12. Set up vitest + @testing-library/react + jsdom (frontend has zero test infra)
- [ ] 12. Add `vitest.config.ts` with jsdom env + `@` path alias
- [ ] 12. Add `"test": "vitest run"` to `package.json` (CI compatible — both Vitest/Jest exit code 1 on failure)
- [ ] 12. Run `pnpm deps:check` locally after adding vitest
- [ ] 13. Unit tests: `determineSoundType()` all flag combos + priority (include impossible combo test)
- [ ] 13. Unit tests: `determineGameOverSoundType()` all GameResult variants
- [ ] 13. Unit tests: `useSound` play/setVolume/toggleMute
- [ ] 13. Unit tests: localStorage persistence + SSR guard
- [ ] 13. Unit tests: tab visibility suppression
- [ ] 13. Unit tests: audio load failure graceful degradation
- [ ] 13. Unit tests: cleanup on unmount
- [ ] 14. Playwright: sound controls render + toggle
- [ ] 14. Playwright: mute state persists across reload
- [ ] 14. Playwright: audio element state after move (`.paused`, `.currentTime`)
- [ ] 14. Playwright: no CSP violations
- [ ] 14. Playwright: simulate audio load failure, verify error boundary NOT triggered

## Verification

- [ ] `pnpm build` passes (CSP valid, no TS errors)
- [ ] `cd apps/frontend && pnpm test` passes all unit tests
- [ ] Playwright E2E tests pass
- [ ] Manual test: moves produce correct sounds via drag, click, and keyboard
- [ ] Manual test: mute/unmute works, reload persists
- [ ] Manual test: finished game loads silently
- [ ] Manual test: background tab produces no sound
- [ ] Pre-push hook passes all CI checks
