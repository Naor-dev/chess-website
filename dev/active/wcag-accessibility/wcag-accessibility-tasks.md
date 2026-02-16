# WCAG 2.1 AA Compliance - Task Checklist

**Last Updated:** 2026-02-08

## Phase 1: Foundation & Tooling

- [ ] Install `eslint-plugin-jsx-a11y` in frontend
- [ ] Add jsx-a11y plugin to `apps/frontend/eslint.config.mjs`
- [ ] Fix all a11y lint errors found
- [ ] Add `lang="en"` to root `<html>` in layout.tsx
- [ ] Create skip-to-content link component
- [ ] Add `id="main-content"` to main content areas
- [ ] Verify page `<title>` on all routes

## Phase 2: Component Accessibility

### GameOverModal
- [ ] Add `role="dialog"` and `aria-modal="true"`
- [ ] Add `aria-labelledby` pointing to modal title
- [ ] Implement focus trap (tab cycles within modal)
- [ ] Escape key closes modal
- [ ] Focus returns to trigger element on close
- [ ] Announce result via `aria-live`

### EngineThinkingOverlay
- [ ] Add `role="status"` and `aria-live="polite"`
- [ ] Screen reader announces "Engine is thinking"

### ChessClock
- [ ] Add `aria-label` to each clock element
- [ ] Add `aria-live="assertive"` for low time (< 30s)
- [ ] Ensure time format is screen reader friendly

### New Game Form
- [ ] Verify all inputs have `<label htmlFor>`
- [ ] Wrap radio groups in `<fieldset>` with `<legend>`
- [ ] Add `aria-describedby` for help text
- [ ] Link error messages with `aria-errormessage`

### Navigation
- [ ] Add `<nav>` landmark with `aria-label`
- [ ] Add `aria-current="page"` to active link
- [ ] Ensure mobile menu is keyboard accessible

### History Page
- [ ] Use proper table markup with `<th>`, `scope`
- [ ] Add `aria-sort` to sort controls
- [ ] Add `aria-label` to filter controls
- [ ] Ensure status badges have text (not color only)

## Phase 3: Chess Board Accessibility

- [ ] Add hidden board state description for screen readers
- [ ] Create ARIA live region for move announcements
- [ ] Announce player moves in algebraic notation
- [ ] Announce engine moves
- [ ] Announce check, checkmate, draw conditions
- [ ] Announce captures and special moves
- [ ] (Stretch) Add keyboard move input via algebraic notation

## Phase 4: Testing & Verification

- [ ] Install `@axe-core/playwright` for automated testing
- [ ] Add axe-core scan to Playwright tests for each page
- [ ] Achieve zero Level A violations
- [ ] Achieve zero Level AA violations
- [ ] Color contrast audit (both light and dark mode)
- [ ] Manual screen reader test of complete game flow
- [ ] Verify text resizable to 200% without loss of content
