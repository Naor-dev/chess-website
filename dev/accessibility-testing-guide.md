# Accessibility Testing Guide

This guide documents how to test WCAG 2.1 AA compliance for the chess website. It covers automated testing, manual screen reader testing, keyboard navigation, zoom testing, and common triage patterns.

## 1. Automated Testing (axe-core)

### Running Tests

```bash
# Run all accessibility tests
cd apps/frontend && npx playwright test accessibility.spec.ts

# Run a specific test
cd apps/frontend && npx playwright test accessibility.spec.ts -g "Home page"
```

### How It Works

- `e2e/accessibility.spec.ts` runs axe-core against every page with WCAG 2.1 AA tags
- Pages requiring auth use mocked `/api/auth/me` responses
- Pages requiring data (history, stats) use mocked API responses
- The `KNOWN_ISSUES` array baselines pre-existing violations (currently empty)

### Reading axe-core Output

When a test fails, the output shows:

```
[impact] rule-id: Short description
    - <html snippet of the offending element>
```

**Impact levels** (most to least severe): `critical` > `serious` > `moderate` > `minor`

### Common False Positives

| Rule | Why It Triggers | Resolution |
|------|----------------|------------|
| `color-contrast` | Dynamic themes or transparent backgrounds | Verify manually with browser DevTools color picker |
| `region` | Content outside landmarks | Usually a real issue — wrap in `<main>`, `<nav>`, etc. |
| `heading-order` | Skipped heading levels (h1 to h3) | Fix heading hierarchy or add hidden intermediate headings |

### Triaging New Violations

1. **Check if it's a real issue** — read the rule's [deque documentation](https://dequeuniversity.com/rules/axe/)
2. **Check affected elements** — is it our code or a third-party library?
3. **Fix or baseline** — fix immediately if possible; add to `KNOWN_ISSUES` only for third-party issues or complex fixes planned for a later phase
4. **Never suppress without a tracking issue**

### Adding New Page Tests

```typescript
test('My Page has no new a11y violations', async ({ page }) => {
  await mockAuthenticated(page);
  // Mock any required API responses
  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');

  const { newViolations } = await runAxeAnalysis(page);
  expect(
    newViolations,
    `New accessibility violations found:\n${formatViolations(newViolations)}`
  ).toHaveLength(0);
});
```

## 2. Screen Reader Testing

### Setup

- **NVDA** (Windows): Free, download from nvaccess.org
- **VoiceOver** (macOS): Built-in, toggle with Cmd+F5
- **Orca** (Linux): `sudo apt install orca`, toggle with Super+Alt+S

### Per-Page Checklist

#### Home Page (`/`)
- [ ] Page title announced: "Chess Website"
- [ ] Skip-to-content link works (Tab, Enter)
- [ ] Main heading (h1) announced
- [ ] Sign in button announced with role
- [ ] Navigation landmarks present (nav, main)

#### New Game (`/game/new`)
- [ ] Page title announced: "New Game"
- [ ] Difficulty radio group announced: "Difficulty Level"
- [ ] Each difficulty option reads level name and number
- [ ] Time control radio group announced: "Time Control"
- [ ] Each time option reads duration and category
- [ ] Start Game button announced

#### Game Board (`/game/[id]`)
- [ ] Page title announced: "Game"
- [ ] Board region announced: "Chess board"
- [ ] Board description read when focusing board region (piece positions, material, turn)
- [ ] Chess clocks announced with `role="timer"` and descriptive labels
- [ ] "Low" indicator announced when clock is under 30 seconds
- [ ] Engine thinking overlay announced via aria-live
- [ ] Keyboard move input: label read, error messages announced as alerts
- [ ] Game over modal: focus trapped, result announced, buttons accessible
- [ ] Move announcements via aria-live (e.g., "White plays e4")

#### History (`/history`)
- [ ] Page title announced: "Game History"
- [ ] Filter controls announced as radio groups
- [ ] Game cards have descriptive aria-labels (status, difficulty, time control, date)
- [ ] Empty state message announced
- [ ] Pagination controls accessible

#### Stats (`/stats`)
- [ ] Page title announced: "Your Statistics"
- [ ] Overview cards readable (Total Games, Win Rate, etc.)
- [ ] Results bar has aria-label with counts
- [ ] SR-only data tables present for all charts
- [ ] Empty state CTA link accessible

### Testing Flow

1. Navigate to page with screen reader on
2. Press `H` to cycle through headings — verify hierarchy (h1 > h2 > h3)
3. Press `D` (NVDA) or use rotor (VoiceOver) to list landmarks
4. Tab through interactive elements — verify each is announced with role and state
5. Trigger dynamic content (make a move, open modal) — verify announcements

## 3. Keyboard Navigation

### Global Flows

| Action | Keys | Expected |
|--------|------|----------|
| Skip to content | Tab (first element), Enter | Focus moves to main content |
| Navigate links | Tab / Shift+Tab | All interactive elements reachable |
| Activate button | Enter or Space | Button action triggers |
| Radio selection | Arrow keys | Selection moves within group |
| Close modal | Escape | Modal closes, focus returns |

### Game Page Keyboard Flows

| Action | Keys | Expected |
|--------|------|----------|
| Type a move | Focus input, type "e4", Enter | Move submitted, board updates |
| Invalid move | Type "Ke3", Enter | Error shown with "is not a legal move" |
| Coordinate move | Type "e2e4", Enter | Move submitted |
| Navigate board | Tab to board, use dnd-kit keyboard controls | Piece selection and placement |

### Testing Protocol

1. Unplug mouse / disable trackpad
2. Start from browser URL bar
3. Tab through entire page — every interactive element must be reachable
4. Verify visible focus indicator on every focused element
5. Verify no focus traps (except modals, which should trap focus)
6. Verify logical tab order (top-to-bottom, left-to-right)

## 4. Zoom Testing (400%)

### Protocol

WCAG 2.1 SC 1.4.10 requires content to reflow at 400% zoom (equivalent to 320px viewport width at 1280px base).

**Using Playwright:**

```typescript
// Simulate 400% zoom at 1280x1024 base resolution
await page.setViewportSize({ width: 320, height: 256 });
await page.goto('/page-to-test');
```

**Manual browser testing:**

1. Set browser to 1280px wide (or use responsive design mode)
2. Zoom to 400% (Ctrl/Cmd + several times)
3. Verify: no horizontal scrollbar, all content reflows to single column

### Pass Criteria

- [ ] No horizontal scrolling required
- [ ] All text readable without clipping
- [ ] Buttons and inputs still usable (min 44x44px touch targets)
- [ ] Navigation menu collapses to mobile layout
- [ ] Modals fit within viewport

### Pages Tested (Phase 4 Results)

All pages pass at 320x256 viewport:
- `/` (home) — single column, full-width buttons
- `/game/new` — radio cards stack vertically
- `/game/[id]` — board scales down, clocks stack
- `/history` — cards stack, filters wrap
- `/stats` — charts stack, bars scale
- `/auth/error` — simple layout, no issues

## 5. Color-Only Information (SC 1.4.1)

### Principle

Color must not be the **only** means of conveying information. Every color-coded element needs a text label, icon, pattern, or shape alternative.

### Audit Results (Phase 4)

All components pass. Key patterns:

| Component | Color Use | Non-Color Alternative |
|-----------|-----------|----------------------|
| DifficultyBadge | Level colors | Text: "Level 1 - Beginner" |
| ChessClock | Red for low time | Text: "Low" label + pulse animation |
| GameInfo | Green/red/amber for outcomes | Icons + descriptive text ("Checkmate! You win!") |
| Results bar (stats) | Green/gray/red segments | Text counts: "14 Wins", "2 Draws", "7 Losses" |
| Time control labels | Category colors | Text: "Bullet", "Blitz", "Rapid", "Classical" |
| History status | Color-coded badges | Text: "Won by checkmate", "Draw", etc. |
| KeyboardMoveInput | Red border on error | Error message text + `aria-invalid` + `role="alert"` |

### How to Audit New Components

1. Identify every use of color that conveys meaning
2. For each, verify a non-color alternative exists
3. Test with grayscale mode (Chrome DevTools > Rendering > Emulate vision deficiencies > Achromatopsia)
4. Verify information is still distinguishable

## 6. ARIA Patterns Used

| Pattern | Where | Implementation |
|---------|-------|---------------|
| `aria-live="polite"` | Move announcements, engine status | `AriaLiveProvider` + `useAriaLiveAnnouncer` |
| `role="timer"` | Chess clocks | ChessClock component |
| `role="alert"` | Move input errors | KeyboardMoveInput error message |
| `role="region"` | Chess board wrapper | Game page board div |
| `role="radio"` + `aria-checked` | Difficulty/time selection, history filters | New game page, history page |
| `aria-describedby` | Board → description, input → error/help | Board wrapper, KeyboardMoveInput |
| `aria-hidden="true"` | Decorative SVGs, star icons | Throughout app |
| Native `<dialog>` | Game over modal | GameOverModal component |
| `sr-only` class | Skip link, board description, data tables | Throughout app |

## 7. CI Integration

The `accessibility.spec.ts` tests run as part of the Playwright e2e suite in CI. Any new axe-core violation will fail the build.

To add a new page to CI coverage:
1. Add a test in `e2e/accessibility.spec.ts` following the existing pattern
2. Mock auth and any required API responses
3. Run locally first: `npx playwright test accessibility.spec.ts`

## 8. Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rule Descriptions](https://dequeuniversity.com/rules/axe/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
