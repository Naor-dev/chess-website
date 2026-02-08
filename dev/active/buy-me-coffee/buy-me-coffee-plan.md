# Buy Me a Coffee (PayPal) - Implementation Plan

**Last Updated:** 2026-02-08

## Executive Summary

Add a simple "Buy Me a Coffee" donation button powered by PayPal. No user data is stored - clicking the button opens PayPal's payment page directly. This is a stateless, frontend-only feature with zero backend changes.

## Current State Analysis

- No payment or donation infrastructure exists
- No PayPal SDK or payment libraries installed
- No donation UI components
- No database models for payments (and none needed - no data stored)

## Proposed Future State

- "Buy Me a Coffee" button visible on the site (footer or dedicated section)
- Clicking opens PayPal donation link (PayPal.me or PayPal Donate button)
- No user data collected or stored
- No backend changes needed
- Clean, themed UI matching the site's emerald design
- WCAG 2.1 AA compliant

## Implementation Approach

**PayPal Donate Button (No SDK needed)**

Use PayPal's hosted donation link approach:
- Option A: PayPal.me link (simplest - just a URL)
- Option B: PayPal Donate Button (HTML form POST to PayPal)

Both require zero backend code and store zero user data on our side.

## Implementation Phases

### Phase 1: PayPal Configuration (Effort: S)

1. **Set up PayPal donation target**
   - Create PayPal.me link OR configure PayPal Donate Button in PayPal dashboard
   - Decide on suggested amounts (e.g., $3, $5, $10 - "coffee" theme)
   - Get the donation URL or button code
   - **Acceptance:** Working PayPal link that accepts donations

2. **Add environment variable**
   - `NEXT_PUBLIC_PAYPAL_DONATE_URL` in frontend env
   - No backend env needed
   - **Acceptance:** URL configurable without code changes

### Phase 2: UI Component (Effort: M)

3. **Create `BuyMeCoffee` component** in `apps/frontend/src/components/`
   - Coffee cup icon + "Buy Me a Coffee" text
   - Opens PayPal in new tab (`target="_blank"`, `rel="noopener noreferrer"`)
   - Themed with emerald accent colors
   - Subtle animation on hover (steam rising from cup, or gentle pulse)
   - **Acceptance:** Button renders, opens PayPal link on click

4. **Create amount selection** (optional enhancement)
   - Quick-select buttons: $3 (Coffee), $5 (Latte), $10 (Meal)
   - Each links to PayPal with pre-filled amount
   - Or single button with PayPal handling amount selection
   - **Acceptance:** Users can choose donation amount

5. **Place component on site**
   - Option A: Footer on all pages (subtle, always visible)
   - Option B: Dedicated `/support` page linked from footer
   - Option C: Both (small footer link + full page)
   - Include brief thank-you message: "Support the project - every coffee helps!"
   - **Acceptance:** Donation option accessible from any page

6. **Mobile design**
   - Touch-friendly button (min 44x44px)
   - Responsive layout
   - Doesn't interfere with game UI
   - **Acceptance:** Usable on 320px+ screens

### Phase 3: Accessibility & Testing (Effort: S)

7. **WCAG 2.1 AA compliance**
   - Button has `aria-label="Donate via PayPal - opens in new tab"`
   - External link indicator (icon + screen reader text for "opens in new tab")
   - Color contrast 4.5:1 for all text
   - Keyboard accessible (focusable, Enter/Space activates)
   - No flashing animations
   - **Acceptance:** Component passes axe-core scan

8. **Testing**
   - Component renders with correct PayPal link
   - Link opens in new tab
   - Button keyboard accessible
   - Playwright: verify button visible and clickable
   - Test with missing env var (graceful fallback - hide component)
   - **Acceptance:** All tests pass, graceful degradation

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PayPal link changes | Low | Low | Use env var, easy to update |
| PayPal.me unavailable in some regions | Low | Low | Use Donate Button as fallback |
| Users confused by leaving site | Medium | Low | Clear "opens in new tab" indicator |
| Donation button feels intrusive | Medium | Medium | Keep subtle, in footer only, never overlay game |

## Success Metrics

- Donation button visible and functional
- Opens PayPal correctly in new tab
- Zero user data stored on our side
- Fully keyboard accessible
- Doesn't interfere with core game experience

## Dependencies

- PayPal account with donation capability
- `NEXT_PUBLIC_PAYPAL_DONATE_URL` environment variable
- No npm packages needed (just an external link)
- No backend changes
- No database changes
