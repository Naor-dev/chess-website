# Pawn Promotion UI - Context

**Last Updated:** 2026-02-08

## Key Files

| File | Purpose |
|------|---------|
| `apps/frontend/src/app/game/[id]/page.tsx` | Main game page - promotion detection at lines 266-285 |
| `apps/frontend/src/app/game/[id]/components/` | Extracted game components (GameOverModal, ChessClock, etc.) |
| `packages/shared/src/types/game.ts` | `MakeMoveRequest` with `promotion?: 'q' \| 'r' \| 'b' \| 'n'` |
| `apps/backend/src/services/gameService.ts` | Backend move handling (already accepts promotion param) |

## Key Decisions

1. **Dialog vs inline selection**: Use positioned popover over promotion square (standard chess UI pattern)
2. **Auto-queen option**: Not in MVP - always show dialog (can add preference later)
3. **Clock behavior**: Clock keeps running during promotion selection (matches real chess)
4. **Cancel behavior**: Pawn returns to original square, no move made

## Current Promotion Detection Logic

```typescript
const isPromotion =
  piece.pieceType[1] === 'P' &&
  ((piece.pieceType[0] === 'w' && targetSquare[1] === '8') ||
    (piece.pieceType[0] === 'b' && targetSquare[1] === '1'));
```

## Dependencies

- No new packages needed
- react-chessboard v5 piece rendering
- Existing Tailwind + dark mode classes

## WCAG 2.1 AA Requirements

- Focus trap in dialog
- `role="dialog"`, `aria-modal="true"`
- Keyboard: Arrow keys navigate, Enter selects, Escape cancels
- Touch targets: 44x44px minimum
- Color contrast: 4.5:1 for labels
- Screen reader: Announces "Choose promotion piece" and piece names
