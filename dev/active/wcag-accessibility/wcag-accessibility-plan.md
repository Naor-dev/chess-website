# WCAG 2.1 AA Compliance - Implementation Plan

**Last Updated:** 2026-02-08

## Executive Summary

Perform a comprehensive accessibility audit and remediation across the entire chess website to achieve WCAG 2.1 AA compliance. This includes semantic HTML, keyboard navigation, screen reader support, color contrast, focus management, and chess-specific accessibility features.

## Current State Analysis

### What's Already in Place
- `lang="en"` set on root HTML element in `layout.tsx`
- Replay controls have `aria-label` attributes
- Error pages use `role="img"` with `aria-label` (semantically questionable - review needed)
- Keyboard shortcuts for replay mode (Arrow keys, Home, End)
- Some focus rings on error page buttons (most buttons lack focus styles)
- Dark mode with semantic colors
- Responsive design with mobile breakpoints
- Animations exist in codebase (need `prefers-reduced-motion` support)

### Critical Gaps
- **Chess board is inaccessible** - no screen reader support, no keyboard move input
- **No skip-to-content links**
- **GameOverModal lacks `role="dialog"`**, `aria-modal`, focus trap
- **No `eslint-plugin-jsx-a11y`** for automated linting
- **No ARIA live regions** for dynamic content (moves, clock, check)
- **Form inputs** may lack proper label associations
- **Tab order** not explicitly managed
- **No screen reader announcements** for game events
- **No `prefers-reduced-motion`** media query support
- **Focus indicators** missing on most interactive elements (not just error page)
- **Heading hierarchy** not audited (`<h1>` -> `<h2>` -> `<h3>`)
- **Page titles** may not be unique/descriptive per page (WCAG 2.4.2)

## Proposed Future State

- All pages pass axe-core automated accessibility scan
- Chess board navigable by keyboard with screen reader narration
- All modals have proper dialog roles, focus traps, and escape handling
- Dynamic content announced via ARIA live regions (coordinated, not competing)
- Skip-to-content link on all pages
- `eslint-plugin-jsx-a11y` enforces accessibility in development
- Color contrast verified at 4.5:1 for all text
- Animations respect `prefers-reduced-motion`
- Content reflows properly at 400% zoom

## Implementation Phases

### Phase 1: Foundation & Tooling (Effort: S-M)

1. **Run quick color contrast audit**
   - Use axe DevTools or similar to scan all pages for contrast failures
   - Document systemic issues early (may require design changes that affect later phases)
   - Check both light and dark modes
   - **Acceptance:** Contrast issues documented, design fixes planned

2. **Investigate react-chessboard v5 accessibility API**
   - Review library source code for built-in a11y props
   - Check `options` prop for any accessibility-related configuration
   - Document what the library supports vs what we need to build custom
   - **Acceptance:** Written summary of library capabilities and gaps

3. **Add `eslint-plugin-jsx-a11y`** to frontend ESLint config
   - Install package
   - Add to `apps/frontend/eslint.config.mjs`
   - Install with **`warn` severity initially** (not `error`) to avoid blocking Phase 1 on Phase 2 work
   - Upgrade to `error` after Phase 2 is complete
   - **Acceptance:** Plugin installed, warnings visible

4. **Add skip-to-content link**
   - Hidden link at top of page, visible on focus
   - Targets main content area with `id="main-content"`
   - **Acceptance:** Tab to page -> first focusable element is skip link -> activates to skip nav

5. **Audit heading hierarchy and landmarks**
   - Verify `<h1>` -> `<h2>` -> `<h3>` hierarchy on each page
   - Add `<main>`, `<aside>`, `<header>` landmark regions where missing
   - Verify each page has unique, descriptive `<title>` (WCAG 2.4.2)
   - **Acceptance:** Heading hierarchy is sequential, all pages have landmarks and unique titles

6. **Add `prefers-reduced-motion` support**
   - Wrap existing animations with `prefers-reduced-motion` media query
   - Respect user preference globally
   - **Acceptance:** Animations disabled when OS setting is "reduce motion"

### Phase 2a: High-Impact Components (Effort: M)

7. **Fix GameOverModal accessibility**
   - Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
   - Implement focus trap (focus stays within modal)
   - Escape key closes modal
   - Focus returns to board/trigger after close
   - Announce result to screen reader via `aria-live`
   - **Acceptance:** Modal navigable by keyboard, announced by screen reader

8. **Fix form accessibility (New Game page)**
   - Verify all inputs have associated `<label>` with `htmlFor`
   - Add `aria-describedby` for help text
   - Error messages linked via `aria-errormessage` (WCAG 3.3.1)
   - Radio buttons in `<fieldset>` with `<legend>`
   - **Acceptance:** Forms usable with screen reader, errors announced

9. **Fix navigation accessibility**
   - Add `<nav>` landmark with `aria-label`
   - Active page indicated with `aria-current="page"`
   - Mobile menu accessible with keyboard
   - **Acceptance:** Navigation announced correctly by screen reader

10. **Document focus management strategy**
    - Define where focus goes after: making a move, resign/save, game over, page navigation
    - Audit focus indicator visibility on all interactive elements (WCAG 2.4.7)
    - Add consistent `focus-visible` ring styles where missing
    - **Acceptance:** Focus strategy documented, indicators visible on all interactive elements

### Phase 2b: Game-Specific Components (Effort: M)

11. **Fix EngineThinkingOverlay accessibility**
    - Add `role="status"` and `aria-live="polite"`
    - Screen reader announces "Engine is thinking"
    - **Acceptance:** Screen reader announces thinking state

12. **Fix ChessClock accessibility**
    - Add `aria-label` to each clock ("Your time remaining", "Engine time remaining")
    - Low time state announced via `aria-live="assertive"` when < 30 seconds
    - **Debounce clock announcements** - don't announce every second, only on state change (low time threshold)
    - Time format readable by screen readers
    - **Acceptance:** Screen reader reads clock values and announces low time

13. **Fix History page accessibility**
    - Game list as accessible table or list
    - Sort controls with `aria-sort`
    - Filter controls with `aria-label`
    - Status badges with text (not color only)
    - Verify color-coded UI has text/icon alternatives (difficulty badges, clock warning)
    - **Acceptance:** Game history navigable by screen reader

14. **ARIA live region coordination**
    - Only one `aria-live="assertive"` active at a time
    - Move announcements: `aria-live="polite"` (not assertive)
    - Clock warnings: debounced, not every second
    - Engine thinking: `aria-live="polite"`
    - Game over: `aria-live="assertive"` (most important)
    - **Acceptance:** No competing live region announcements overwhelming screen readers

### Phase 3: Chess Board Accessibility (Effort: XL)

15. **Add board description for screen readers**
    - Hidden description of current board state
    - Piece positions announced (e.g., "White King on e1")
    - Board summary (material count, whose turn)
    - **Acceptance:** Screen reader user understands board state

16. **Add move announcements**
    - ARIA live region (`polite`) announces each move in algebraic notation
    - Announces check, checkmate, draw conditions
    - Announces captures and special moves
    - **Acceptance:** Each game event is announced

17. **Add keyboard move input** (stretch goal - consider splitting to separate PR)
    - Text input for algebraic notation (e.g., "e2e4" or "Nf3")
    - Validate input against legal moves
    - Show error for illegal moves
    - Tab to input, type move, Enter to submit
    - **Acceptance:** Moves can be made via keyboard input only

### Phase 4: Testing & Verification (Effort: M-L)

18. **Add axe-core to CI pipeline**
    - Add `@axe-core/playwright` to Playwright tests
    - Run accessibility scan on each page
    - Zero violations for Level A and AA
    - Integrate into CI to prevent regressions
    - **Acceptance:** All pages pass axe-core scan, CI blocks on new violations

19. **Manual testing with screen readers**
    - Test with NVDA (Windows) and VoiceOver (macOS)
    - Complete game flow: login -> new game -> play -> game over
    - Verify all announcements and navigation
    - Document testing matrix (browser + screen reader combinations)
    - **Acceptance:** Complete game flow usable with screen reader

20. **Color contrast fix implementation**
    - Fix any issues found in Phase 1 audit
    - Verify all text meets 4.5:1 ratio (normal text) and 3:1 (large text)
    - Check both light and dark modes
    - **Acceptance:** All text passes contrast check

21. **Content reflow at 400% zoom**
    - Verify no horizontal scrolling at 400% zoom (WCAG 1.4.10)
    - Fix any reflow issues
    - **Acceptance:** All pages usable at 400% zoom without horizontal scroll

22. **Color-only information audit**
    - Verify all color-coded UI has text/icon alternatives
    - Difficulty badges, clock warning states, check indicator, game status
    - Use color blindness simulation to verify
    - **Acceptance:** No information conveyed by color alone

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| react-chessboard limited a11y API | High | High | Spike in Phase 1, use hidden description layer, don't fight the library |
| Chess-specific a11y is complex | High | Medium | Start with announcements, keyboard input is stretch/separate PR |
| Breaking existing UI with a11y changes | Medium | Medium | Incremental changes, visual regression testing |
| Screen reader testing complexity | Medium | Low | Use axe-core for automated, manual for key flows |
| ARIA live region overuse | Medium | Medium | Coordinate: one assertive at a time, debounce clocks |
| eslint-plugin-jsx-a11y flood of warnings | High | Low | Install as `warn` first, upgrade to `error` after Phase 2 |
| Color contrast failures require design changes | Medium | Medium | Audit early in Phase 1, not Phase 4 |

## Success Metrics

- Zero axe-core violations (Level A + AA) on all pages
- All interactive elements keyboard accessible
- All modals have focus traps and escape handling
- Dynamic content announced via ARIA live regions (coordinated)
- Color contrast 4.5:1 for all normal text
- Complete game playable with keyboard + screen reader
- Animations respect `prefers-reduced-motion`
- Content reflows at 400% zoom
- axe-core in CI prevents regressions

## Dependencies

- `eslint-plugin-jsx-a11y` (new dev dependency)
- `@axe-core/playwright` (new test dependency)
- react-chessboard v5 accessibility limitations (investigate in Phase 1 spike)

## Pre-Implementation Checklist

- [ ] Run Phase 1 color contrast audit before committing to design
- [ ] Complete react-chessboard v5 a11y spike before Phase 3 planning
- [ ] Review `dev/design-guidelines.md` for focus indicator patterns
- [ ] Review error page `role="img"` usage (semantically incorrect?)
