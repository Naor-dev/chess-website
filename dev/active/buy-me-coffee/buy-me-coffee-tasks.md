# Buy Me a Coffee (PayPal) - Task Checklist

**Last Updated:** 2026-02-08

## Phase 1: PayPal Configuration

- [ ] Set up PayPal.me link or PayPal Donate Button
- [ ] Decide on suggested amounts ($3, $5, $10)
- [ ] Add `NEXT_PUBLIC_PAYPAL_DONATE_URL` to `.env.local`
- [ ] Add env var to Vercel deployment settings
- [ ] Add env var documentation to CLAUDE.md

## Phase 2: UI Component

- [ ] Create `BuyMeCoffee.tsx` in `apps/frontend/src/components/`
- [ ] Add coffee cup icon (SVG or emoji)
- [ ] Style with emerald theme + dark mode
- [ ] Open PayPal link in new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- [ ] Add hover animation (subtle, no flashing)
- [ ] Add amount quick-select buttons (optional)
- [ ] Place component in site footer (layout.tsx)
- [ ] Add "opens in new tab" visual indicator
- [ ] Handle missing env var gracefully (hide component)
- [ ] Responsive design (44x44px min touch target)

## Phase 3: Accessibility & Testing

- [ ] Add `aria-label` to donation button
- [ ] Add screen reader text for "opens in new tab"
- [ ] Verify keyboard accessibility (focus, enter/space)
- [ ] Verify 4.5:1 color contrast
- [ ] Test component renders correctly
- [ ] Test link opens in new tab
- [ ] Test graceful fallback when env var missing
- [ ] Playwright: verify button visible and clickable
