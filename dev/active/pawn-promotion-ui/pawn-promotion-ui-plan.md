# Pawn Promotion UI - Implementation Plan

**Last Updated:** 2026-02-09

## Executive Summary

Add an interactive pawn promotion dialog that lets users choose which piece to promote to (Queen, Rook, Bishop, Knight) instead of auto-promoting to Queen. Must be fully accessible (WCAG 2.1 AA).

## Current State Analysis

- Promotion detection exists in `apps/frontend/src/app/game/[id]/page.tsx` (lines 266-285)
- Currently auto-promotes to Queen (`promotion: 'q'`)
- Backend already supports all 4 promotion types via `MakeMoveRequest.promotion`
- Shared types define `promotion?: 'q' | 'r' | 'b' | 'n'`
- No promotion UI component exists
- Project uses optimistic locking with `version` field for concurrent modification detection

## Proposed Future State

- Modal/popover appears on the promotion square when a pawn reaches the last rank
- Displays 4 piece options (Queen, Rook, Bishop, Knight) with piece images
- Keyboard navigable with arrow keys, Enter to select, Escape to cancel
- Screen reader announces "Choose promotion piece" with piece names
- Works on mobile (touch targets >= 44x44px)
- Cancel returns pawn to original square
- Validates promotion piece before API call
- Handles API failures and version conflicts gracefully

## Implementation Phases

### Phase 0.5: Pre-Implementation Research (Effort: S)

0. **Investigate before building**
   - **react-chessboard v5 piece image API:** Can we access piece SVGs programmatically? Determines dialog implementation approach
   - **Backend validation audit:** Verify `MakeMoveRequest` Zod schema in shared package validates `promotion` field server-side. If missing, add it - client validation alone is bypassable
   - **CSRF verification:** Confirm proxy route validates CSRF on POST `/api/games/:gameId/move` (should already work via apiClient interceptor)
   - **Z-index inspection:** Document react-chessboard rendered DOM z-index values to plan dialog overlay. If stacking context is problematic, prepare React Portal fallback (`createPortal(dialog, document.body)`)
   - **Acceptance:** Written answers to all 4 questions, blockers identified

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
   - Test on iOS Safari (touch conflicts with react-chessboard overlays)
   - Use viewport-relative positioning (avoid `vh` units on iOS)
   - **Acceptance:** Usable on 320px+ screens, tested on real iOS device

### Phase 2: Game Logic Integration (Effort: M)

4. **Add promotion state management** in game page
   - Use explicit game state machine to prevent race conditions:
     ```typescript
     type GameState = 'idle' | 'thinking' | 'pending_promotion' | 'api_call';
     ```
   - New state: `pendingPromotion: { from, to, color } | null`
   - On drop/click to promotion square: set state to `pending_promotion`, show dialog
   - On piece selection: validate promotion piece, set state to `api_call`, make move
   - On cancel: reset board with `chess.undo()`, reset position to `chess.fen()`, clear `pendingPromotion`, re-enable board, return focus to board. If `chess.undo()` fails, log error and reload game state
   - Block ALL state mutations during `pending_promotion` or `api_call` (ignore engine responses, user clicks)
   - **Input validation before API call:**
     ```typescript
     const validPromotions = ['q', 'r', 'b', 'n'] as const;
     if (!validPromotions.includes(piece)) return;
     ```
   - **Acceptance:** Promotion flow pauses for selection, then completes move

5. **Handle promotion that ends the game**
   - Promotion moves can deliver checkmate or stalemate (e.g., f7-f8=Q#)
   - Game-over detection must run AFTER promotion resolves
   - Dialog closes automatically if game ends during promotion
   - **Acceptance:** Promotion + checkmate/stalemate handled correctly

6. **Handle race conditions and concurrency**
   - Disable board interaction while promotion dialog is open
   - **Disable engine response processing** while `pendingPromotion !== null`
   - Queue engine response and apply after promotion completes
   - Add loading state during promotion API call
   - Prevent new moves until promotion API resolves
   - **Acceptance:** No race conditions between promotion and engine responses

7. **Handle clock behavior during promotion**
   - Clock continues running during promotion selection (realistic chess behavior)
   - If clock expires while dialog is open: close dialog, trigger timeout game-over
   - **Acceptance:** Clock timeout correctly ends game even during promotion

8. **Handle errors and version conflicts**
   - Try-catch around promotion move API call
   - Handle 409 Conflict (optimistic locking version mismatch): show error, refresh game state
   - Handle network errors: show retry option, don't corrupt game state
   - Capture errors to Sentry with full context:
     ```typescript
     Sentry.captureException(error, {
       tags: { feature: 'pawn-promotion', boundary: 'game-page' },
       extra: { from, to, promotion, gameId, userId: user?.id, gameVersion, color, timeRemaining }
     });
     ```
   - **Acceptance:** API failures don't break game state, errors tracked in Sentry

9. **Mobile scroll lock during dialog**
   - Prevent body scroll while promotion dialog is open (especially landscape/small viewports)
   - Use `body { overflow: hidden }` when dialog opens, restore on close
   - Test on iOS Safari with small viewports (iPhone SE)
   - **Acceptance:** No scroll-through behind promotion dialog on mobile

### Phase 3: Testing (Effort: M)

10. **Add component tests**
    - Dialog renders with correct pieces for white/black
    - Keyboard navigation works (arrows, enter, escape)
    - Callbacks fire with correct piece type
    - Invalid promotion piece rejected
    - **Acceptance:** Tests pass for all interaction modes

11. **Add error and edge case tests**
    - Disables board interaction during API call (no double-submit)
    - Handles 409 conflict gracefully (shows error, resets state)
    - Handles network failure (shows retry)
    - Sentry captures promotion errors with full context
    - Promotion + checkmate/stalemate handled correctly
    - Clock timeout during promotion dialog closes dialog
    - Cancel correctly calls chess.undo() and restores board
    - **Acceptance:** All error paths and edge cases tested

12. **Playwright UI testing**
    - Drag pawn to last rank -> dialog appears
    - Select each promotion piece -> correct piece on board
    - Cancel -> pawn returns to original position
    - Test on mobile viewport (scroll lock, touch targets)
    - **Acceptance:** E2E flow works for all 4 promotions + cancel

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dialog positioning on small screens | Medium | Medium | Use viewport-aware positioning, fallback to centered modal |
| react-chessboard conflicts with overlay | Low | High | Test with v5 `options` prop, React Portal fallback to document.body |
| Click-to-move promotion detection | Medium | Low | Reuse same detection logic, just trigger dialog instead |
| Race condition with engine response | High | High | Disable engine processing while `pendingPromotion !== null` |
| Clock timeout during promotion | Medium | Medium | Watch clock state, close dialog on timeout |
| API failure during promotion | Medium | High | Error boundary + retry option, Sentry tracking |
| iOS Safari touch conflicts | Medium | Medium | Test on real device, use position: fixed with viewport-relative units |

## Success Metrics

- Users can promote to all 4 piece types
- Dialog is fully keyboard navigable
- Screen reader announces promotion options
- No regression in existing move functionality
- Touch targets meet 44x44px minimum
- API errors handled gracefully without state corruption
- No race conditions with engine responses
- Works on iOS Safari 15+ (real device tested)

## Ignored Low-Priority Items

- Analytics tracking for promotion choices (future enhancement)
- Number key shortcuts (1-4) for power users (future enhancement)
- Piece image preloading on game load (minor optimization)
- Performance benchmarking (dialog render <100ms) - verify during implementation, not a plan item

## Dependencies

- react-chessboard v5 piece images (for promotion options display) - **investigate in Phase 0.5**
- Existing game page state management
- Optimistic locking (version field) for move API calls
- Backend Zod validation of `promotion` field - **verify in Phase 0.5**
