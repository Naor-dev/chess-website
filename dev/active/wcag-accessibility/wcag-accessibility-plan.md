# WCAG 2.1 AA Compliance - Implementation Plan

**Last Updated:** 2026-02-09 (v3)

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

3. **Configure `eslint-plugin-jsx-a11y` severity** in frontend ESLint config
   - **Note:** `eslint-config-next/core-web-vitals` already bundles `eslint-plugin-jsx-a11y` - existing a11y lint rules are already active
   - Add explicit plugin config to `apps/frontend/eslint.config.mjs` for custom severity control
   - Set to **`warn` severity initially** (not `error`) to avoid blocking Phase 1 on Phase 2 work
   - Upgrade to `error` after Phase 2 is complete
   - **Acceptance:** Custom severity configured, warnings visible for all a11y rules

4. **Add skip-to-content link**
   - Hidden link at top of page, visible on focus
   - Targets main content area with `id="main-content"`
   - **Acceptance:** Tab to page -> first focusable element is skip link -> activates to skip nav

5. **Audit heading hierarchy and landmarks**
   - Verify `<h1>` -> `<h2>` -> `<h3>` hierarchy on each page
   - **Known issue:** Game page (`/game/[id]`) has no `<h1>` heading - add one
   - **All pages already have `<main>`** landmark (home, new game, game, history) - no work needed for `<main>` tags
   - Add `<aside>`, `<header>` landmark regions where missing
   - **Acceptance:** Heading hierarchy is sequential on all pages, game page has `<h1>`

6. **Add unique, descriptive page titles** (WCAG 2.4.2 - separate quick win)
   - `layout.tsx` currently sets static `title: 'Chess Website'` for all pages
   - Add per-page `metadata` exports: "New Game | Chess Website", "Game History | Chess Website", etc.
   - Dynamic routes like `game/[id]` need `generateMetadata` function
   - **Acceptance:** Each page has unique, descriptive `<title>`

7. **Add `prefers-reduced-motion` support**
   - Wrap existing animations with `prefers-reduced-motion` media query
   - Respect user preference globally
   - **Acceptance:** Animations disabled when OS setting is "reduce motion"

### Phase 2a: High-Impact Components (Effort: M-L)

8. **Document focus management strategy** (before implementing focus traps)
   - Define where focus goes after: making a move, resign/save, game over, page navigation
   - Audit focus indicator visibility on all interactive elements (WCAG 2.4.7)
   - Add consistent `focus-visible` ring styles where missing
   - **Note:** Strategy may need revision after Phase 3 react-chessboard spike
   - **Acceptance:** Focus strategy documented, indicators visible on all interactive elements

9. **Add `aria-hidden="true"` to all decorative SVG icons**
   - Systematic issue: DifficultyStars, ResultIcon, navigation arrows, inline SVGs throughout codebase all read by screen readers
   - Add `aria-hidden="true"` to decorative SVGs, proper `<title>` to meaningful ones
   - **Acceptance:** Decorative SVGs hidden from screen readers, meaningful SVGs labeled

10. **Add loading state accessibility**
    - Spinner on new game page (line ~88-95) and "Creating Game..." state (line ~286-289) have no `role="status"` or `aria-live`
    - Add `role="status"` and `aria-live="polite"` to all loading/spinner elements across all pages
    - **Acceptance:** Screen readers announce loading states

11. **Fix GameOverModal accessibility**
    - **Recommended approach:** Convert to native `<dialog>` element (built-in focus trap, Escape handling, `aria-modal`) - avoids new dependency
    - Alternative: `focus-trap-react` or hand-rolled `document.addEventListener`
    - Add `aria-labelledby` pointing to title
    - Focus returns to board/trigger after close
    - Announce result to screen reader via `aria-live`
    - **Acceptance:** Modal navigable by keyboard, announced by screen reader

12. **Fix New Game page accessibility**
    - **Note:** Page uses **button groups**, not `<input>` elements - no `<label>`/`htmlFor` needed
    - Add `role="radiogroup"` to button group containers (difficulty, time control)
    - Add `role="radio"` and `aria-checked` to individual option buttons
    - Add `aria-label` or `aria-labelledby` to each radiogroup
    - Error `<div>` (line ~273) needs `id` and `role="alert"` for screen reader announcement
    - Selected state currently conveyed by border color only (emerald vs zinc) - add `aria-checked="true"`
    - **Acceptance:** Button groups function as radio groups for screen readers, errors announced

13. **Fix navigation accessibility** (larger scope than it appears - systemic issue)
    - Add `<nav>` landmark with `aria-label`
    - Active page indicated with `aria-current="page"`
    - **Button-to-Link migration:** 12+ instances of `<button onClick={router.push}>` across home page, game page, new game page, and history page. All should be `<Link>` for correct semantics (right-click, open-in-new-tab, screen reader announces as links)
    - Mobile menu: hamburger has accessible name, uses `aria-expanded` disclosure pattern, focus trapped in open menu, Escape closes, focus returns to hamburger
    - **Acceptance:** All navigation links are actual `<a>` elements, mobile menu fully keyboard accessible

### Phase 2b: Game-Specific Components (Effort: M)

14. **Fix EngineThinkingOverlay accessibility**
    - Add `role="status"` and `aria-live="polite"`
    - Screen reader announces "Engine is thinking"
    - **Acceptance:** Screen reader announces thinking state

15. **Fix ChessClock accessibility**
    - Add `role="timer"` (WAI-ARIA semantic role for countdown/countup timers)
    - Add `aria-label` to each clock ("Your time remaining", "Engine time remaining")
    - **Time format:** Screen reader should announce "5 minutes 30 seconds" not "5:30" - use hidden screen reader text or `aria-label`
    - Low time state announced via `aria-live="assertive"` when < 30 seconds
    - **Debounce clock announcements** - don't announce every second, only on state change (low time threshold)
    - Add text/icon alternatives for color-coded low time state (red border/text) - not just color
    - **Acceptance:** Screen reader reads clock values correctly, announces low time, non-color indicators present

16. **Fix History page accessibility**
    - Game list as accessible table or list
    - Sort controls with `aria-sort`
    - Filter controls with `aria-label`
    - Status badges with text (not color only)
    - Verify color-coded UI has text/icon alternatives (difficulty badges, clock warning)
    - **Acceptance:** Game history navigable by screen reader

17. **ARIA live region coordination**
    - Only one `aria-live="assertive"` active at a time
    - Move announcements: `aria-live="polite"` (not assertive)
    - Clock warnings: debounced, not every second
    - Engine thinking: `aria-live="polite"`
    - Game over: `aria-live="assertive"` (most important)
    - **Acceptance:** No competing live region announcements overwhelming screen readers

### Phase 2c: Axe-core CI Gate (Effort: S)

18. **Add axe-core to CI pipeline** (before Phase 3, catches regressions during board work)
    - **Prerequisite:** No Playwright infrastructure exists yet - must set up Playwright config, test runner, and CI integration first. This is non-trivial scope
    - Add `@axe-core/playwright` to Playwright tests
    - Run accessibility scan on each page
    - Baseline existing violations as acknowledged (don't block on Phase 3 items)
    - Zero new violations for Level A and AA
    - **Acceptance:** Playwright configured, CI runs axe-core, blocks on new violations

19. **Fix color contrast issues from Phase 1 audit**
    - Fix any issues found in Phase 1 audit (don't defer to Phase 4)
    - Verify all text meets 4.5:1 ratio (normal text) and 3:1 (large text)
    - Check both light and dark modes
    - **Acceptance:** All text passes contrast check

### Phase 3: Chess Board Accessibility (Effort: XL)

20. **Add board description for screen readers**
    - Hidden description of current board state
    - Piece positions announced (e.g., "White King on e1")
    - Board summary (material count, whose turn)
    - **Acceptance:** Screen reader user understands board state

21. **Add move announcements**
    - ARIA live region (`polite`) announces each move in algebraic notation
    - Announces check, checkmate, draw conditions
    - Announces captures and special moves
    - **Acceptance:** Each game event is announced

22. **Add keyboard move input** (stretch goal - consider splitting to separate PR)
    - Text input for algebraic notation (e.g., "e2e4" or "Nf3")
    - Validate input against legal moves
    - Show error for illegal moves
    - Tab to input, type move, Enter to submit
    - **Acceptance:** Moves can be made via keyboard input only

### Phase 4: Final Verification (Effort: M)

23. **Manual testing with screen readers**
    - Test with NVDA (Windows) and VoiceOver (macOS)
    - Complete game flow: login -> new game -> play -> game over
    - Verify all announcements and navigation
    - Document testing matrix (browser + screen reader combinations)
    - **Acceptance:** Complete game flow usable with screen reader

24. **Content reflow at 400% zoom**
    - Verify no horizontal scrolling at 400% zoom (WCAG 1.4.10)
    - Fix any reflow issues
    - **Acceptance:** All pages usable at 400% zoom without horizontal scroll

25. **Color-only information audit**
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
| Color contrast failures require design changes | Medium | Medium | Audit early in Phase 1, fix in Phase 2c (not Phase 4) |
| SVG accessibility across all components | High | Medium | Systematic pass in Phase 2a - dozens of inline SVGs without aria-hidden |
| Button-as-link pattern throughout app | Medium | Medium | `<button onClick={router.push}>` used for navigation in multiple places - needs `<Link>` |
| Next.js per-page metadata for titles | Low | Low | Straightforward but easy to forget for dynamic routes like `game/[id]` - need `generateMetadata` |

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

## Ignored Low-Priority Items

- Security review of ARIA live regions (single-player game, no privacy concerns)
- Language attribute for algebraic notation (test during implementation)
- Timeout adjustments WCAG 2.2.1 (already satisfied by time control selection)
- Performance of board descriptions (test during implementation)
- Privacy mode for future multiplayer (future feature)
- Pause feature for single-player games (future feature)
- Internationalization planning (future scope)
- Focus order verification WCAG 2.4.3 (verify during implementation)

## Pre-Implementation Checklist

- [ ] Run Phase 1 color contrast audit before committing to design
- [ ] Complete react-chessboard v5 a11y spike before Phase 3 planning
- [x] ~~Audit which pages have `<main>` landmark~~ - all pages already have `<main>`
- [x] ~~Review error page `role="img"` usage~~ - correct WCAG pattern for emoji characters
- [ ] Set up Playwright infrastructure (config, test runner) before Phase 2c axe-core gate
- [ ] Verify touch targets >= 44x44px on mobile for all interactive elements
