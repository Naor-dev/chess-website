# Pawn Promotion UI - Implementation Plan

**Last Updated:** 2026-02-08

## Executive Summary

Add an interactive pawn promotion dialog that lets users choose which piece to promote to (Queen, Rook, Bishop, Knight) instead of auto-promoting to Queen. Must be fully accessible (WCAG 2.1 AA).

## Current State Analysis

- Promotion detection exists in `apps/frontend/src/app/game/[id]/page.tsx` (lines 266-285)
- Currently auto-promotes to Queen (`promotion: 'q'`)
- Backend already supports all 4 promotion types via `MakeMoveRequest.promotion`
- Shared types define `promotion?: 'q' | 'r' | 'b' | 'n'`
- No promotion UI component exists

## Proposed Future State

- Modal/popover appears on the promotion square when a pawn reaches the last rank
- Displays 4 piece options (Queen, Rook, Bishop, Knight) with piece images
- Keyboard navigable with arrow keys, Enter to select, Escape to cancel
- Screen reader announces "Choose promotion piece" with piece names
- Works on mobile (touch targets >= 44x44px)
- Cancel returns pawn to original square

## Implementation Phases

### Phase 1: Promotion Dialog Component (Effort: M)

1. **Create `PromotionDialog` component** in `apps/frontend/src/app/game/[id]/components/`
   - Positioned over the promotion square on the board
   - Shows 4 piece images (matching current piece set)
   - Accepts `color` prop ('w' | 'b') to show correct piece colors
   - Accepts `square` prop to position correctly
   - Accepts `onSelect` and `onCancel` callbacks
   - **Acceptance:** Dialog renders with 4 clickable piece options

2. **Add WCAG 2.1 AA accessibility**
   - `role="dialog"` with `aria-modal="true"` and `aria-label="Choose promotion piece"`
   - Each piece button has `aria-label` (e.g., "Promote to Queen")
   - Focus trap within dialog
   - Arrow key navigation between pieces
   - Enter/Space to select, Escape to cancel
   - Focus returns to board after selection
   - **Acceptance:** Navigable with keyboard only, screen reader announces all options

3. **Style for all screen sizes**
   - Desktop: popover aligned to promotion square
   - Mobile: larger touch targets (min 44x44px), clear visual feedback
   - Dark mode support
   - Matches existing emerald theme
   - **Acceptance:** Usable on 320px+ screens

### Phase 2: Game Logic Integration (Effort: M)

4. **Add promotion state management** in game page
   - New state: `pendingPromotion: { from, to, color } | null`
   - On drop/click to promotion square: set pending instead of making move
   - On piece selection: make move with chosen promotion
   - On cancel: reset board to pre-move state
   - **Acceptance:** Promotion flow pauses for selection, then completes move

5. **Handle edge cases**
   - Cancel resets drag state properly
   - No double-submission during promotion selection
   - Engine thinking indicator doesn't show during promotion selection
   - Clock continues running during promotion selection (realistic chess behavior)
   - **Acceptance:** No broken states on cancel, double-click, or rapid actions

### Phase 3: Testing (Effort: S)

6. **Add component tests**
   - Dialog renders with correct pieces for white/black
   - Keyboard navigation works (arrows, enter, escape)
   - Callbacks fire with correct piece type
   - **Acceptance:** Tests pass for all interaction modes

7. **Playwright UI testing**
   - Drag pawn to last rank → dialog appears
   - Select each promotion piece → correct piece on board
   - Cancel → pawn returns to original position
   - **Acceptance:** E2E flow works for all 4 promotions + cancel

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dialog positioning on small screens | Medium | Medium | Use viewport-aware positioning, fallback to centered modal |
| react-chessboard conflicts with overlay | Low | High | Test with v5 `options` prop, may need z-index tuning |
| Click-to-move promotion detection | Medium | Low | Reuse same detection logic, just trigger dialog instead |

## Success Metrics

- Users can promote to all 4 piece types
- Dialog is fully keyboard navigable
- Screen reader announces promotion options
- No regression in existing move functionality
- Touch targets meet 44x44px minimum

## Dependencies

- react-chessboard v5 piece images (for promotion options display)
- Existing game page state management
- No backend changes needed




