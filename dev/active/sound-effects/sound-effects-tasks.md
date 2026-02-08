# Sound Effects - Task Checklist

**Last Updated:** 2026-02-08

## Phase 1: Audio Infrastructure

- [ ] Source/create CC0 licensed chess sound files (9 sounds)
- [ ] Add sound files to `apps/frontend/public/sounds/`
- [ ] Create `useSound.ts` hook in `apps/frontend/src/hooks/`
- [ ] Implement audio preloading on first user interaction
- [ ] Add volume control (0-100%)
- [ ] Add mute/unmute toggle
- [ ] Persist volume and mute state in localStorage
- [ ] Handle browser autoplay policy gracefully
- [ ] Create `SoundControl.tsx` component
- [ ] Style SoundControl with speaker icon (changes with volume level)
- [ ] Support dark mode for SoundControl

## Phase 2: Game Event Integration

- [ ] Detect move type from chess.js result flags (move/capture/check/castling/promotion)
- [ ] Play correct sound after player move
- [ ] Play correct sound after engine move
- [ ] Play game-over sound (win/loss/draw) on game end
- [ ] Add low-time warning sound at 10 seconds
- [ ] Ensure warning plays only once per game
- [ ] Stop previous sound before playing new one (prevent overlap)

## Phase 3: Accessibility & Testing

- [ ] Verify all sounds are supplementary (visual feedback exists for all events)
- [ ] Add `aria-label` to mute button
- [ ] Add `role="slider"` + aria attributes to volume control
- [ ] Ensure keyboard navigation for all sound controls
- [ ] Unit tests for `useSound` hook
- [ ] Test volume/mute localStorage persistence
- [ ] Test sound type detection logic
- [ ] Playwright: verify SoundControl renders and toggles
