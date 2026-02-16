# WCAG 2.1 AA Compliance - Implementation Plan

**Last Updated:** 2026-02-16 (v4 - addresses Opus/Sonnet review feedback)

## Executive Summary

Perform a comprehensive accessibility audit and remediation across the entire chess website to achieve WCAG 2.1 AA compliance. This includes semantic HTML, keyboard navigation, screen reader support, color contrast, focus management, and chess-specific accessibility features.

## Current State Analysis

### What's Already in Place
- `lang="en"` set on root HTML element in `layout.tsx`
- Replay controls have `aria-label` attributes
- Error pages use `role="img"` with `aria-label` (semantically questionable - review needed)
- Keyboard shortcuts for replay mode (Arrow keys, Home, End)
- **Global `*:focus-visible` rule exists** in `globals.css:222-225` (emerald outline on all elements). Error page buttons override with `:focus` (fires on mouse click too — should use `:focus-visible`)
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
- **Focus indicators:** Global rule exists but some components override it — need verification pass
- **Heading hierarchy** not audited (`<h1>` -> `<h2>` -> `<h3>`). **Known issue:** Home page jumps `<h1>` → `<h3>` (skips `<h2>`, violates WCAG 1.3.1)
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

### Phase 1: Foundation & Tooling (Effort: M)

1. **Run comprehensive color contrast audit**
   - Use axe DevTools or similar to scan all pages for contrast failures
   - Document systemic issues early (may require design changes that affect later phases)
   - **Expanded scope:** Check static text, hover/focus states, disabled states, gradient backgrounds (clock warnings), transparent overlays (GameOverModal, EngineThinkingOverlay)
   - Check both light and dark modes
   - Document exceptions (disabled elements, decorative content)
   - **If >5 systemic failures found:** Escalate fixes to Phase 2a (don't defer all to Phase 2c)
   - **Acceptance:** Contrast issues documented with scope (static, interactive, overlay), design fixes planned

2. **Investigate react-chessboard v5 accessibility API** (timebox: 2 days)
   - Review library source code for built-in a11y props
   - Check `options` prop for any accessibility-related configuration
   - Identify technical constraints (e.g., canvas/SVG rendering blocking screen readers)
   - Define minimum viable keyboard nav (algebraic input only? piece selection?)
   - **Plan B if library is a blocker:** Hidden screen-reader-only description layer overlaid on board (doesn't require library changes)
   - **Decision gate after spike:** Proceed with library + workarounds OR evaluate alternatives
   - **Acceptance:** Written summary of capabilities, gaps, and chosen approach (with or without Plan B)

3. **Configure `eslint-plugin-jsx-a11y` with per-rule severity** in frontend ESLint config
   - **Note:** `eslint-config-next/core-web-vitals` already bundles `eslint-plugin-jsx-a11y` — may not need explicit installation, just configuration
   - Add explicit plugin config to `apps/frontend/eslint.config.mjs` for custom severity control
   - **Per-rule severity (not blanket warn):** Set critical rules as `error` immediately (prevents new violations), set rules with existing violations as `warn` (fix gradually):
     ```
     error (prevent new violations): alt-text, aria-props, aria-role, anchor-is-valid
     warn (existing debt to fix): click-events-have-key-events, no-static-element-interactions
     ```
   - Document baseline violation count for each `warn` rule
   - Convert warnings to errors **incrementally** (1-2 rules at a time after fixing violations, not all at once)
   - **Acceptance:** Per-rule severity configured, baseline violation counts documented

4. **Add skip-to-content link**
   - Hidden link at top of page, visible on focus
   - Targets main content area with `id="main-content"`
   - **Acceptance:** Tab to page -> first focusable element is skip link -> activates to skip nav

5. **Audit heading hierarchy and landmarks**
   - Verify `<h1>` -> `<h2>` -> `<h3>` hierarchy on each page
   - **Known issues:**
     - Game page (`/game/[id]`) has no `<h1>` heading — add one
     - Home page jumps from `<h1>` directly to `<h3>` (feature cards) — skips `<h2>`, violates WCAG 1.3.1
   - **All pages already have `<main>`** landmark (home, new game, game, history) - no work needed for `<main>` tags
   - Add `<aside>`, `<header>` landmark regions where missing
   - **Acceptance:** Heading hierarchy is sequential on all pages, no skipped levels

6. **Add unique, descriptive page titles** (WCAG 2.4.2 - separate quick win)
   - `layout.tsx` currently sets static `title: 'Chess Website'` for all pages
   - Add per-page `metadata` exports: "New Game | Chess Website", "Game History | Chess Website", etc.
   - Dynamic routes like `game/[id]` need `generateMetadata` function
   - **Acceptance:** Each page has unique, descriptive `<title>`

7. **Add `prefers-reduced-motion` support**
   - Wrap existing animations with `prefers-reduced-motion` media query
   - Respect user preference globally
   - **Acceptance:** Animations disabled when OS setting is "reduce motion"

7b. **Set up Playwright infrastructure** (moved from Phase 2c — prerequisite for axe-core CI gate)
   - Install `@playwright/test` + `@axe-core/playwright`
   - Create `playwright.config.ts` (browsers, baseURL, CI env detection)
   - Write first smoke test (verify app loads)
   - Add to CI pipeline (new job or extend existing workflow)
   - Document testing patterns
   - **Effort:** M (not S — this is net-new infrastructure)
   - **Acceptance:** Playwright configured, smoke test passes in CI

### Phase 2a: High-Impact Components (Effort: M-L)

8. **Document focus management strategy** (before implementing focus traps)
   - Define where focus goes after: making a move, resign/save, game over, page navigation
   - **Verify global `*:focus-visible` rule** works on all interactive elements (some CSS may override it)
   - **Fix error pages:** Change `:focus` overrides to `:focus-visible` (currently fires on mouse click via `focus:outline-none focus:ring-2` — should be `focus-visible:ring-2`)
   - Audit for any other components that suppress the global focus ring
   - **Note:** Strategy may need revision after Phase 3 react-chessboard spike
   - **Acceptance:** Focus strategy documented, global rule verified working, error pages fixed

9. **Add `aria-hidden="true"` to all decorative SVG icons**
   - Systematic issue: DifficultyStars, ResultIcon, navigation arrows, inline SVGs throughout codebase all read by screen readers
   - Add `aria-hidden="true"` to decorative SVGs, proper `<title>` to meaningful ones
   - **Acceptance:** Decorative SVGs hidden from screen readers, meaningful SVGs labeled

10. **Add loading state accessibility**
    - Spinner on new game page (line ~88-95) and "Creating Game..." state (line ~286-289) have no `role="status"` or `aria-live`
    - Add `role="status"` and `aria-live="polite"` to all loading/spinner elements across all pages
    - **Acceptance:** Screen readers announce loading states

11. **Fix GameOverModal accessibility**
    - **Recommended approach:** Convert to native `<dialog>` element (built-in focus trap, Escape handling, `aria-modal`) — avoids new dependency
    - **Caveat:** Native `<dialog>` has known inconsistencies with click-outside-to-close across browsers. Current modal uses `onClick={onGoHome}` on backdrop — this will need explicit implementation (listen for clicks on `::backdrop` or coordinate checking on dialog element itself)
    - Alternative: `focus-trap-react` or hand-rolled `document.addEventListener` (if using, pin exact version, verify no `innerHTML` usage)
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

13a. **Button-to-Link migration** (Effort: M — systemic refactor, split from nav task)
    - 12+ instances of `<button onClick={router.push}>` across home, game, new game, history pages
    - Replace all with `<Link>` for correct semantics (right-click, open-in-new-tab, screen reader announces as links)
    - Update styling (buttons vs links have different default styles)
    - Test navigation (back button, right-click, keyboard)
    - Verify no regressions in mobile layout
    - Search pattern: `grep -r "onClick.*router.push\|onClick.*navigate" apps/frontend/src`
    - **Acceptance:** All navigation uses actual `<a>` elements, no `router.push` in `onClick` for navigation

13b. **Fix navigation landmarks & ARIA** (Effort: S)
    - Add `<nav>` landmark with `aria-label`
    - Active page indicated with `aria-current="page"`
    - **Note:** No hamburger/mobile menu component exists in codebase — navigation is inline header buttons. Remove phantom mobile menu sub-task (was incorrectly assumed)
    - **Acceptance:** Navigation landmarks present, active page indicated

### Phase 2b: Game-Specific Components (Effort: M)

14. **Fix EngineThinkingOverlay accessibility**
    - Add `role="status"` and `aria-live="polite"`
    - Screen reader announces "Engine is thinking"
    - **Acceptance:** Screen reader announces thinking state

15. **Fix ChessClock accessibility**
    - Add `role="timer"` (WAI-ARIA semantic role). **Note:** Screen reader support is inconsistent (NVDA/JAWS don't treat it specially) — practical benefit comes from `aria-label` and `aria-live`, not the role itself. Don't depend on role for specific behavior.
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

17a. **Design ARIA live region coordinator** (architecture spike — before implementing)
    - Design a centralized `useAriaLiveAnnouncer` hook that manages a priority queue
    - Single pair of live regions in root layout (one `polite`, one `assertive`)
    - Priority rules:
      - **Assertive (interrupts):** Game over (checkmate, timeout, resignation), critical errors
      - **Polite (queued):** Moves, check announcements, engine thinking
      - **Debounced:** Clock updates only at thresholds (:30s, :10s)
    - **Security:** Validate move notation before announcing (`/^[a-h][1-8][a-h][1-8][qrbn]?$/` or SAN pattern) — never render unvalidated content in live regions
    - **Acceptance:** Architecture documented, hook interface defined

17b. **Implement ARIA live region coordination**
    - Implement `useAriaLiveAnnouncer` hook per design
    - Integrate into game page components
    - Only one `aria-live="assertive"` active at a time
    - **Acceptance:** No competing live region announcements overwhelming screen readers

### Phase 2c: Axe-core CI Gate (Effort: S — Playwright already set up in Phase 1)

18. **Add axe-core accessibility tests to CI pipeline** (before Phase 3, catches regressions during board work)
    - **Prerequisite:** Playwright infrastructure from task 7b (already set up in Phase 1)
    - Add axe-core page scans using `@axe-core/playwright`
    - **Baseline strategy:** Known issues (to be fixed in Phase 3) tracked in `knownIssues` array — CI fails on **new** violations only, not existing baseline
    - Zero new violations for Level A and AA
    - Remove items from `knownIssues` as they are fixed (tracks progress)
    - **Acceptance:** CI runs axe-core, blocks on new violations, known issues baselined

19. **Fix color contrast issues from Phase 1 audit**
    - Fix any issues found in Phase 1 audit (don't defer to Phase 4)
    - Verify all text meets 4.5:1 ratio (normal text) and 3:1 (large text)
    - Check both light and dark modes
    - **Acceptance:** All text passes contrast check

### Phase 3: Chess Board Accessibility (Effort: XL)

20. **Add board description for screen readers**
    - Hidden description of current board state linked via `aria-describedby` on board container
    - Piece positions announced (e.g., "White King on e1")
    - Board summary (material count, whose turn)
    - **Performance:** Board description updates must not block move rendering (<16ms). Consider lazy generation (only when SR focuses board). Profile with React DevTools for unnecessary re-renders in 100+ move games.
    - **Acceptance:** Screen reader user understands board state, no performance degradation

21. **Add move announcements**
    - ARIA live region (`polite`) announces each move in algebraic notation
    - Announces check, checkmate, draw conditions
    - Announces captures and special moves
    - **Acceptance:** Each game event is announced

22. **Add keyboard move input** (stretch goal - consider splitting to separate PR)
    - Text input for algebraic notation — **primary format: SAN** (standard for chess players, e.g., "Nf3", "e4", "O-O"). Accept coordinate notation ("e2e4") as secondary.
    - Validate input against legal moves
    - Show error for illegal moves
    - Tab to input, type move, Enter to submit
    - **Acceptance:** Moves can be made via keyboard input only

### Phase 4: Final Verification (Effort: M-L)

23. **Manual testing with screen readers**
    - Test with NVDA (Windows) and VoiceOver (macOS)
    - **Add mobile testing:** VoiceOver on iOS Safari, TalkBack on Android Chrome
    - Complete game flow: login -> new game -> play -> game over
    - Verify all announcements and navigation
    - Document testing matrix (browser + screen reader + device combinations)
    - **Acceptance:** Complete game flow usable with screen reader on desktop and mobile

24. **Content reflow at 400% zoom**
    - **Testing protocol:** Chrome + Firefox (both required per WCAG), viewport 1280x1024, browser zoom to 400%
    - Test pages: Home, New Game, Game (board may allow horizontal scroll as exception), History
    - Verify: all interactive elements >= 44x44px, text doesn't overflow, modals stay on screen
    - Pass criteria: no horizontal scroll (except chess board), button groups reflow to single column, clocks stack vertically
    - **Acceptance:** All pages usable at 400% zoom, documented exceptions

25. **Color-only information audit**
    - Verify all color-coded UI has text/icon alternatives
    - Difficulty badges, clock warning states, check indicator, game status
    - Use color blindness simulation to verify
    - **Acceptance:** No information conveyed by color alone

26. **Create accessibility testing guide** (knowledge capture — prevents knowledge loss)
    - Screen reader testing checklist (per page)
    - Keyboard navigation test flows
    - Axe-core interpretation guide (how to triage violations, common false positives)
    - Document the 400% zoom testing protocol
    - **Acceptance:** Guide documented, usable by future developers

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| react-chessboard limited a11y API | High | High | Spike in Phase 1 (timeboxed 2 days), Plan B: hidden SR-only description layer |
| Chess-specific a11y is complex | High | Medium | Start with announcements, keyboard input is stretch/separate PR |
| Breaking existing UI with a11y changes | Medium | Medium | Incremental changes, visual regression testing |
| Screen reader testing complexity | Medium | Low | Use axe-core for automated, manual for key flows |
| ARIA live region overuse | Medium | Medium | Coordinate: one assertive at a time, debounce clocks |
| eslint-plugin-jsx-a11y flood of warnings | High | Low | Per-rule severity: errors for critical rules, warn for existing debt |
| Color contrast failures require design changes | Medium | Medium | Audit early in Phase 1, escalate to Phase 2a if >5 systemic failures |
| Playwright setup effort underestimated | Medium | Medium | Moved to Phase 1 with M effort estimate (not S) |
| Native `<dialog>` click-outside inconsistency | Medium | Low | Explicit backdrop click handler implementation needed |
| ARIA live region XSS via unvalidated content | Low | High | Validate move notation before announcing, never render raw user input |
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

- `eslint-plugin-jsx-a11y` (may already be installed transitively via `eslint-config-next` — verify before adding explicitly)
- `@playwright/test` (new dev dependency — Playwright test runner)
- `@axe-core/playwright` (new test dependency)
- react-chessboard v5 accessibility limitations (investigate in Phase 1 spike)

## Ignored Low-Priority Items

- Language attribute for algebraic notation (test during implementation)
- Timeout adjustments WCAG 2.2.1 (already satisfied by time control selection)
- Privacy mode for future multiplayer (future feature)
- Pause feature for single-player games (future feature)
- Internationalization planning (future scope)
- Focus order verification WCAG 2.4.3 (verify during implementation)
- WCAG 2.2 stretch goal (2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size) — low incremental effort, consider post-MVP
- Announcement verbosity user preference (power users may find every-move announcements slow) — post-MVP

## Pre-Implementation Checklist

- [ ] Run Phase 1 color contrast audit (expanded scope: hover, focus, overlays) before committing to design
- [ ] Complete react-chessboard v5 a11y spike (timeboxed 2 days) with Plan B before Phase 3
- [x] ~~Audit which pages have `<main>` landmark~~ - all pages already have `<main>`
- [x] ~~Review error page `role="img"` usage~~ - correct WCAG pattern for emoji characters
- [ ] Set up Playwright infrastructure in Phase 1 (moved from Phase 2c dependency)
- [ ] Verify touch targets >= 44x44px on mobile for all interactive elements
- [ ] Fix home page heading hierarchy (`<h1>` → `<h3>` skips `<h2>`)
- [ ] Design ARIA live region coordinator architecture before Phase 2b
- [ ] Define `<dialog>` click-outside implementation strategy

## Review Feedback Addressed (v4)

Changes from Opus/Sonnet review on PR #153:

**From Opus:**
1. **[CRITICAL] Fixed focus indicator description** — Global `*:focus-visible` rule exists, was understated. Task 8 now verifies global rule + fixes error page `:focus` overrides
2. **[CRITICAL] Added home page heading gap** — `<h1>` → `<h3>` skips `<h2>`, added to task 5
3. **[HIGH] Increased Phase 2c effort** — Playwright setup moved to Phase 1 task 7b (Effort: M)
4. **[HIGH] Added `<dialog>` click-outside caveat** — Backdrop click handler needs explicit implementation
5. **[HIGH] Added `@playwright/test` dependency** — Was missing from dependencies list
6. **[MEDIUM] Removed phantom mobile menu task** — No hamburger menu exists, clarified in task 13b
7. **[MEDIUM] Added `role="timer"` caveat** — Limited SR support noted in task 15
8. **[MEDIUM] Fixed contrast fix timing** — Escalate to Phase 2a if >5 systemic failures
9. **[MEDIUM] Added `aria-describedby` for board** — Board description linked to container in task 20
10. **[LOW] Clarified keyboard notation** — Primary: SAN, secondary: coordinate notation
11. **[LOW] Clarified eslint-plugin-jsx-a11y installation** — May be transitive, verify before adding

**From Sonnet:**
12. **[CRITICAL] Moved Playwright to Phase 1** — New task 7b, prerequisite for Phase 2c
13. **[CRITICAL] Added react-chessboard Plan B** — Hidden SR-only description layer as fallback
14. **[CRITICAL] Changed eslint to per-rule severity** — Not blanket warn; errors for critical, warn for existing debt
15. **[CRITICAL] Split button-to-link migration** — Task 13a (M effort) separate from nav landmarks (13b, S effort)
16. **[CRITICAL] Added ARIA live region architecture design** — New task 17a (spike) before 17b (implementation)
17. **Added mobile testing** — VoiceOver iOS + TalkBack Android in task 23
18. **Added board description performance criteria** — <16ms, lazy generation, profiling
19. **Added 400% zoom testing protocol** — Browser, viewport, test cases, pass criteria
20. **Added accessibility testing guide** — New task 26 for knowledge capture
21. **Added ARIA XSS security** — Validate move notation before announcing
22. **Updated effort estimates** — Phase 1: M (was S-M), Phase 2c: S (Playwright done), Phase 4: M-L (was M)
23. **Estimated total: 3-4 weeks** (was 2-3 weeks)
