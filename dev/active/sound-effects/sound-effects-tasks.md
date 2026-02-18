# Sound Effects - Task Checklist

**Last Updated:** 2026-02-18 (aligned with plan v9)

## Phase 1: Audio Infrastructure

- [ ] 1. Source/create 9 CC0 licensed MP3 sound files (or generate placeholders via ffmpeg)
- [ ] 1. Add files to `apps/frontend/public/sounds/` + `LICENSE.txt`
- [ ] 2. Add `media-src 'self'` to CSP in `next.config.ts`
- [ ] 3. Create `useSound.ts` hook with HTMLAudioElement pool
- [ ] 3. Preload audio on game page visit (StrictMode-safe with `initialized` ref)
- [ ] 3. Handle volume/mute state + localStorage persistence (SSR guard + Safari private mode)
- [ ] 3. First-interaction unlock for iOS Safari (AudioContext create+resume+close)
- [ ] 3. Tab visibility suppression (`document.visibilityState`)
- [ ] 3. Audio load failure -> mark unavailable in `availableSounds` Set, report to Sentry
- [ ] 3. Cleanup on unmount (clear pool, listeners, `initialized.current = false`)
- [ ] 4. Create `SoundControl.tsx` (mute toggle + volume slider)
- [ ] 4. Place after `<GameInfo>`, before resign/save controls
- [ ] 4. Speaker icon changes by volume level (muted, low, medium, high)
- [ ] 4. `useAriaLiveAnnouncer` for "Sound enabled"/"Sound muted"
- [ ] 4. Add `data-testid`: `sound-control`, `mute-button`, `volume-slider`
- [ ] 4. Export from `components/index.ts`

## Phase 2: Game Event Integration

- [ ] 5. Create `determineSoundType()` in `soundUtils.ts` (priority: check > promotion > capture > castling > move)
- [ ] 5. Create `determineGameOverSoundType()` (GameResult -> gameOverWin/Loss/Draw)
- [ ] 6. Retain `testChess.move()` result flags in `onDrop` for sound selection
- [ ] 6. Retain `testChess.move()` result flags in `onKeyboardMove` for sound selection
- [ ] 7. Add `playRef` pattern (`useRef(play)` + sync useEffect)
- [ ] 7. Play user move sound in `onDrop` (at optimistic update, before API call)
- [ ] 7. Play user move sound in `onKeyboardMove` (same pattern)
- [ ] 7. Add `wasGameOverOnLoad` ref, set on initial `fetchGame()`
- [ ] 7. Add game-over useEffect (watch `game?.isGameOver`, gate with `wasGameOverOnLoad`)
- [ ] 8. Capture `userMoveFen` before API call in `onDrop`
- [ ] 8. Capture `userMoveFen` before API call in `onKeyboardMove`
- [ ] 8. Play engine move sound in `onDrop` `.then()` (replay SAN on temp Chess)
- [ ] 8. Play engine move sound in `onKeyboardMove` `.then()` (same pattern)
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
- [ ] 12. Set up vitest + @testing-library/react + jsdom (frontend has zero test infra)
- [ ] 12. Add `vitest.config.ts` with jsdom env + `@` path alias
- [ ] 12. Add `"test": "vitest run"` to `package.json`
- [ ] 13. Unit tests: `determineSoundType()` all flag combos + priority
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

## Verification

- [ ] `pnpm build` passes (CSP valid, no TS errors)
- [ ] `cd apps/frontend && pnpm test` passes all unit tests
- [ ] Playwright E2E tests pass
- [ ] Manual test: moves produce correct sounds via drag, click, and keyboard
- [ ] Manual test: mute/unmute works, reload persists
- [ ] Manual test: finished game loads silently
- [ ] Manual test: background tab produces no sound
- [ ] Pre-push hook passes all CI checks
