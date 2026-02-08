# Sound Effects - Context

**Last Updated:** 2026-02-08

## Key Files

| File | Purpose |
|------|---------|
| `apps/frontend/src/app/game/[id]/page.tsx` | Main game page - move handling, game over detection |
| `apps/frontend/src/app/game/[id]/components/ChessClock.tsx` | Clock component - low time detection |
| `apps/frontend/src/app/game/[id]/components/GameOverModal.tsx` | Game end modal - win/loss/draw events |
| `apps/frontend/src/hooks/` | Custom hooks directory (add `useSound.ts` here) |

## Key Decisions

1. **Native Audio API vs library**: Use native `HTMLAudioElement` (no library needed for simple playback)
2. **Sound source**: CC0/public domain chess sounds (NOT lichess - AGPL licensed)
3. **Storage**: Sound files in `apps/frontend/public/sounds/`
4. **Preferences**: localStorage key `chess-sound-preferences` with `{ volume: number, muted: boolean }`
5. **No backend changes**: Sounds are purely frontend

## Sound Type Detection from chess.js

```typescript
// chess.js move result includes flags:
// 'c' = capture, 'k' = kingside castling, 'q' = queenside castling
// 'p' = promotion, 'e' = en passant
// Check detected from game.inCheck() after move

const getSoundType = (moveResult) => {
  if (game.isCheckmate()) return 'gameOver';
  if (game.inCheck()) return 'check';
  if (moveResult.flags.includes('c') || moveResult.flags.includes('e')) return 'capture';
  if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) return 'castling';
  if (moveResult.flags.includes('p')) return 'promotion';
  return 'move';
};
```

## WCAG 2.1 AA Requirements

- Sounds are always supplementary to visual cues (NEVER sole feedback channel)
- Mute control keyboard accessible with `aria-label`
- Volume slider: `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- No auto-play before first user interaction
- Low-time warning is also visual (clock turns red already)

## Browser Autoplay Policy

- Chrome/Safari block audio until user gesture
- Solution: Initialize AudioContext on first user click/interaction
- Show visual indicator if audio is blocked
