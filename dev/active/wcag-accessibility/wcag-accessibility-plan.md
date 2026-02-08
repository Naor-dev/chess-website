# WCAG 2.1 AA Compliance - Implementation Plan

**Last Updated:** 2026-02-08

## Executive Summary

Perform a comprehensive accessibility audit and remediation across the entire chess website to achieve WCAG 2.1 AA compliance. This includes semantic HTML, keyboard navigation, screen reader support, color contrast, focus management, and chess-specific accessibility features.

## Current State Analysis

### What's Already in Place
- Replay controls have `aria-label` attributes
- Error pages use `role="img"` with `aria-label`
- Keyboard shortcuts for replay mode (Arrow keys, Home, End)
- Focus rings on buttons (`focus:ring-2 focus:ring-emerald-500`)
- Dark mode with semantic colors
- Responsive design with mobile breakpoints

### Critical Gaps
- **Chess board is inaccessible** - no screen reader support, no keyboard move input
- **No skip-to-content links**
- **No `lang` attribute** on HTML element
- **GameOverModal lacks `role="dialog"`**, `aria-modal`, focus trap
- **No `eslint-plugin-jsx-a11y`** for automated linting
- **No ARIA live regions** for dynamic content (moves, clock, check)
- **Form inputs** may lack proper label associations
- **Tab order** not explicitly managed
- **No screen reader announcements** for game events

## Proposed Future State

- All pages pass axe-core automated accessibility scan
- Chess board navigable by keyboard with screen reader narration
- All modals have proper dialog roles, focus traps, and escape handling
- Dynamic content announced via ARIA live regions
- Skip-to-content link on all pages
- `eslint-plugin-jsx-a11y` enforces accessibility in development
- Color contrast verified at 4.5:1 for all text

## Implementation Phases

### Phase 1: Foundation & Tooling (Effort: S)

1. **Add `eslint-plugin-jsx-a11y`** to frontend ESLint config
   - Install package
   - Add to `apps/frontend/eslint.config.mjs`
   - Fix all lint errors it finds
   - **Acceptance:** Zero a11y lint errors

2. **Add HTML `lang` attribute**
   - Set `lang="en"` on root `<html>` in `apps/frontend/src/app/layout.tsx`
   - **Acceptance:** Lang attribute present on all pages

3. **Add skip-to-content link**
   - Hidden link at top of page, visible on focus
   - Targets main content area with `id="main-content"`
   - **Acceptance:** Tab to page → first focusable element is skip link → activates to skip nav

### Phase 2: Component Accessibility (Effort: L)

4. **Fix GameOverModal accessibility**
   - Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
   - Implement focus trap (focus stays within modal)
   - Escape key closes modal
   - Focus returns to board/trigger after close
   - Announce result to screen reader via `aria-live`
   - **Acceptance:** Modal navigable by keyboard, announced by screen reader

5. **Fix EngineThinkingOverlay accessibility**
   - Add `role="status"` and `aria-live="polite"`
   - Screen reader announces "Engine is thinking"
   - **Acceptance:** Screen reader announces thinking state

6. **Fix ChessClock accessibility**
   - Add `aria-label` to each clock ("Your time remaining", "Engine time remaining")
   - Low time state announced via `aria-live="assertive"` when < 30 seconds
   - Time format readable by screen readers
   - **Acceptance:** Screen reader reads clock values and announces low time

7. **Fix form accessibility (New Game page)**
   - Verify all inputs have associated `<label>` with `htmlFor`
   - Add `aria-describedby` for help text
   - Error messages linked via `aria-errormessage`
   - Radio buttons in `<fieldset>` with `<legend>`
   - **Acceptance:** Forms usable with screen reader

8. **Fix navigation accessibility**
   - Add `<nav>` landmark with `aria-label`
   - Active page indicated with `aria-current="page"`
   - Mobile menu accessible with keyboard
   - **Acceptance:** Navigation announced correctly by screen reader

9. **Fix History page accessibility**
   - Game list as accessible table or list
   - Sort controls with `aria-sort`
   - Filter controls with `aria-label`
   - Status badges with text (not color only)
   - **Acceptance:** Game history navigable by screen reader

### Phase 3: Chess Board Accessibility (Effort: XL)

10. **Add board description for screen readers**
    - Hidden description of current board state
    - Piece positions announced (e.g., "White King on e1")
    - Board summary (material count, whose turn)
    - **Acceptance:** Screen reader user understands board state

11. **Add move announcements**
    - ARIA live region announces each move in algebraic notation
    - Announces check, checkmate, draw conditions
    - Announces captures and special moves
    - **Acceptance:** Each game event is announced

12. **Add keyboard move input** (stretch goal)
    - Text input for algebraic notation (e.g., "e2e4" or "Nf3")
    - Validate input against legal moves
    - Show error for illegal moves
    - Tab to input, type move, Enter to submit
    - **Acceptance:** Moves can be made via keyboard input only

### Phase 4: Testing & Verification (Effort: M)

13. **Automated accessibility testing**
    - Add axe-core to Playwright tests
    - Run accessibility scan on each page
    - Zero violations for Level A and AA
    - **Acceptance:** All pages pass axe-core scan

14. **Manual testing with screen readers**
    - Test with NVDA or VoiceOver
    - Complete game flow: login → new game → play → game over
    - Verify all announcements and navigation
    - **Acceptance:** Blind user can understand game state

15. **Color contrast audit**
    - Verify all text meets 4.5:1 ratio (normal text) and 3:1 (large text)
    - Check both light and dark modes
    - Fix any failing elements
    - **Acceptance:** All text passes contrast check

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| react-chessboard limited a11y API | High | High | Use hidden description layer, don't fight the library |
| Chess-specific a11y is complex | High | Medium | Start with announcements, keyboard input is stretch |
| Breaking existing UI with a11y changes | Medium | Medium | Incremental changes, visual regression testing |
| Screen reader testing complexity | Medium | Low | Use axe-core for automated, manual for key flows |

## Success Metrics

- Zero axe-core violations (Level A + AA) on all pages
- All interactive elements keyboard accessible
- All modals have focus traps and escape handling
- Dynamic content announced via ARIA live regions
- Color contrast 4.5:1 for all normal text
- Complete game playable with keyboard + screen reader

## Dependencies

- `eslint-plugin-jsx-a11y` (new dev dependency)
- `@axe-core/playwright` (new test dependency)
- react-chessboard v5 accessibility limitations (work around)
