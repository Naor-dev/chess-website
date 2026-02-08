# Pawn Promotion UI - Task Checklist

**Last Updated:** 2026-02-08

## Phase 1: Promotion Dialog Component

- [ ] Create `PromotionDialog.tsx` in `apps/frontend/src/app/game/[id]/components/`
- [ ] Display 4 piece options (Queen, Rook, Bishop, Knight) with correct color
- [ ] Position dialog over promotion square on the board
- [ ] Add `role="dialog"`, `aria-modal="true"`, `aria-label`
- [ ] Add `aria-label` to each piece button (e.g., "Promote to Queen")
- [ ] Implement focus trap within dialog
- [ ] Add keyboard navigation (Arrow keys, Enter, Escape)
- [ ] Style for mobile (44x44px touch targets minimum)
- [ ] Support dark mode
- [ ] Match emerald theme

## Phase 2: Game Logic Integration

- [ ] Add `pendingPromotion` state to game page
- [ ] Modify `onDrop` to detect promotion and set pending state
- [ ] Modify click-to-move to detect promotion and set pending state
- [ ] On piece selection: execute move with chosen promotion type
- [ ] On cancel (Escape/click outside): reset to pre-move state
- [ ] Prevent double-submission during promotion selection
- [ ] Hide engine thinking overlay during promotion selection
- [ ] Verify clock keeps running during selection

## Phase 3: Testing

- [ ] Unit tests for PromotionDialog component
- [ ] Test keyboard navigation (arrows, enter, escape)
- [ ] Test callbacks return correct piece type
- [ ] Playwright: drag pawn to last rank → dialog appears
- [ ] Playwright: select each piece type → correct promotion
- [ ] Playwright: cancel → pawn returns to original square
- [ ] Test on mobile viewport size
