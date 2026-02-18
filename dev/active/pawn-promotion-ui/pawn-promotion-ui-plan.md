# Pawn Promotion UI - Implementation Plan

**Last Updated:** 2026-02-18 (v6 - incorporating Opus + Sonnet 5th round feedback, simplified approach)

## Review Feedback Incorporated (v6)

**From Opus (Feb 16):**
1. react-chessboard v5 has NO built-in promotion dialog → must build custom ✅
2. Simplify state → use `pendingPromotion` + existing `isMoving` (NOT full state machine) ✅
3. Cancel = just clear `pendingPromotion` (no chess.undo chain needed since move not committed) ✅
4. Clock continues running during promotion (keep it simple, realistic chess) ✅
5. Use Unicode chess symbols (♛♜♝♞) — no dependency on react-chessboard internals ✅

**From Sonnet (Feb 16):**
1. User-facing error messages must be generic (Sentry gets full context) ✅
2. useEffect cleanup for scroll lock on mobile ✅
3. Piece selection is from 4 hardcoded buttons — TypeScript `'q'|'r'|'b'|'n'` type constrains at compile time, no runtime Zod needed (backend already validates via shared schema) ✅

## Executive Summary

Add an interactive pawn promotion dialog that lets users choose which piece to promote to (Queen, Rook, Bishop, Knight) instead of auto-promoting to Queen. Must be fully accessible (WCAG 2.1 AA).

## Context

- Promotion detection exists in `apps/frontend/src/app/game/[id]/page.tsx`
- Currently auto-promotes to Queen (`promotion: 'q'`)
- Backend already validates promotion via `z.enum(['q','r','b','n']).optional()` in shared package
- No promotion UI component exists

## Files to Modify

| File | Action |
|------|--------|
| `apps/frontend/src/app/game/[id]/components/PromotionDialog.tsx` | **CREATE** - New promotion piece picker component |
| `apps/frontend/src/app/game/[id]/components/index.ts` | **EDIT** - Add PromotionDialog export |
| `apps/frontend/src/app/game/[id]/page.tsx` | **EDIT** - Add pendingPromotion state, modify onDrop/onSquareClick, render dialog |

No backend changes needed.

## Step 1: Create PromotionDialog Component

**File:** `apps/frontend/src/app/game/[id]/components/PromotionDialog.tsx`

A positioned overlay that shows 4 piece buttons (Queen, Rook, Bishop, Knight) when a pawn reaches the last rank.

**Props:**
```typescript
interface PendingPromotion {
  from: string;
  to: string;
}

interface PromotionDialogProps {
  pending: PendingPromotion;
  boardSize: number;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}
```

**Piece rendering:** Use chess Unicode symbols: ♛ (Queen), ♜ (Rook), ♝ (Bishop), ♞ (Knight). Large font size scaled to square size.

**Positioning:**
- Absolute positioning within the board container (same pattern as `EngineThinkingOverlay`)
- Column aligned to the target file: `left = fileIndex * squareSize` where `fileIndex = to.charCodeAt(0) - 97`
- Drops down from top of board (rank 8 promotion for white)
- Each button is `squareSize x squareSize` (naturally >= 44px touch target for all board sizes)

**Layout:** Vertical column of 4 piece buttons + semi-transparent backdrop over the board

**Accessibility (WCAG 2.1 AA):**
- `role="dialog"`, `aria-modal="true"`, `aria-label="Choose promotion piece"`
- Each button: `aria-label="Promote to queen"` etc.
- Auto-focus Queen button on mount (useRef + useEffect)
- Arrow key navigation between pieces (up/down cycle)
- Enter/Space selects, Escape cancels
- Focus trap: Tab wraps within the 4 buttons
- Backdrop click cancels

**Styling:**
- Buttons: `bg-white dark:bg-zinc-800`, emerald hover highlight
- Backdrop: `bg-black/30` over the board area (same as EngineThinkingOverlay)
- `prefers-reduced-motion`: skip fade-in animation via `motion-safe:` utilities

**Scroll lock (Sonnet feedback):**
```typescript
useEffect(() => {
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, []);
```

## Step 2: Update index.ts

Add `export { PromotionDialog } from './PromotionDialog';` and export the `PendingPromotion` type.

## Step 3: Modify page.tsx

### 3a. Add state
```typescript
const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
```

### 3b. Modify onDrop

When a promotion is detected, instead of auto-promoting to queen:
1. Validate the move is legal (using testChess with promotion='q' just for legality check)
2. Set `pendingPromotion = { from, to }`
3. Return `false` — piece snaps back to source square (no optimistic update yet)

### 3c. Modify onSquareClick

At the click-to-move code path, add promotion detection before delegation to `onDrop`:
- Check if the piece is a pawn and target is last rank
- If promotion: validate legality, set `pendingPromotion`, clear selection, return
- If not promotion: proceed as before

### 3d. Add handlePromotionSelect callback

When user selects a piece from the dialog:
1. Clear `pendingPromotion` (closes dialog)
2. Validate move with chosen piece via testChess
3. Optimistic update (same pattern as existing onDrop)
4. API call with chosen promotion piece
5. Announce via aria-live: "Pawn promoted to queen" etc.
6. Error handling: generic user messages, full context to Sentry (Sonnet feedback)

### 3e. Add handlePromotionCancel callback

Just `setPendingPromotion(null)`. Board reverts to `game.currentFen` automatically since no optimistic update was applied.

### 3f. Add guards

- `allowDragging`: add `&& !pendingPromotion`
- `onSquareClick`: add `if (pendingPromotion) return;` guard
- `onDrop`: add `pendingPromotion` to the early return guard

### 3g. Render PromotionDialog

Inside the board container div, after the Chessboard and alongside EngineThinkingOverlay:
```tsx
{pendingPromotion && (
  <PromotionDialog
    pending={pendingPromotion}
    boardSize={boardSize}
    onSelect={handlePromotionSelect}
    onCancel={handlePromotionCancel}
  />
)}
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Simple `pendingPromotion` state | Opus: no full state machine needed, just one new state var |
| Clock during promotion | Keeps running | Realistic chess behavior, simpler (no extra state) |
| Cancel behavior | Clear pendingPromotion | No chess.undo chain needed — move not committed until selection |
| onDrop return for promotion | `return false` | Piece snaps back to source; no optimistic board update until selection |
| Piece images | Unicode symbols ♛♜♝♞ | No dependency on react-chessboard internals (Opus recommendation) |
| Dialog position | Absolute within board container | Same pattern as EngineThinkingOverlay |
| Input validation | TypeScript type + backend Zod | Piece selection is from 4 hardcoded buttons with `'q'|'r'|'b'|'n'` type; backend validates via shared schema |
| Error messages | Generic to user, detailed to Sentry | Sonnet: never expose userId, FEN, version in user-facing messages |

## Verification

1. `pnpm build` — verify no build errors
2. `pnpm lint` — verify no lint errors
3. `cd apps/backend && pnpm test` — verify no test regressions
4. **Playwright UI testing:**
   - Start `pnpm dev`
   - Navigate to localhost:3000, sign in
   - Create new game (difficulty 1)
   - Advance a pawn to promotion rank
   - Verify dialog appears with 4 piece options
   - Test each piece selection → correct promotion on board
   - Test cancel (Escape) → pawn returns
   - Test keyboard navigation (arrows, Enter, Escape)
   - Test dark mode appearance
   - Test mobile viewport

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dialog positioning on small screens | Medium | Medium | Each button = squareSize (naturally >= 44px) |
| react-chessboard overlay conflicts | Low | High | Absolute positioning inside board container, z-10 |
| Click-to-move promotion detection | Medium | Low | Same detection logic, triggers dialog instead |
| Race condition with engine response | Low | High | Board disabled + isMoving blocks interaction |
| Clock timeout during promotion | Medium | Medium | Existing timeout detection refetches game state |
| API failure during promotion | Medium | High | Generic error message + Sentry tracking |

## Ignored Low-Priority Items

- Analytics tracking for promotion choices (future enhancement)
- Number key shortcuts (1-4) for power users (future enhancement)
- AbortController for timeout during API call (existing timeout detection handles this adequately)
- Zod validation on frontend (TypeScript types + backend Zod schema provide sufficient protection)
- State machine refactor (simple pendingPromotion + isMoving is sufficient)
