# Buy Me a Coffee (PayPal) - Context

**Last Updated:** 2026-02-08

## Key Files

| File | Purpose |
|------|---------|
| `apps/frontend/src/app/layout.tsx` | Root layout - footer placement |
| `apps/frontend/src/app/page.tsx` | Home page - optional placement |
| `apps/frontend/src/components/` | Shared components (create BuyMeCoffee here) |
| `apps/frontend/.env.local` | Environment variables (add PayPal URL) |

## Key Decisions

1. **No SDK**: Use simple PayPal.me or Donate Button link (no PayPal JS SDK)
2. **No data stored**: Zero backend involvement, no database changes
3. **External link approach**: Opens PayPal in new tab, user handles payment there
4. **Placement**: Footer (subtle, non-intrusive) + optional dedicated page
5. **No receipt/tracking**: We don't track who donated or how much

## PayPal Integration Options

### Option A: PayPal.me Link (Simplest)
```
https://paypal.me/YourUsername/5  (pre-filled $5)
https://paypal.me/YourUsername     (user chooses amount)
```
- Pros: Simplest possible, just a URL
- Cons: Less customizable, requires PayPal.me setup

### Option B: PayPal Donate Button
```html
<form action="https://www.paypal.com/donate" method="post" target="_blank">
  <input type="hidden" name="hosted_button_id" value="YOUR_BUTTON_ID" />
  <button type="submit">Donate</button>
</form>
```
- Pros: More professional, customizable amounts
- Cons: Requires PayPal dashboard button creation

### Recommendation: Option A for MVP (simplest, zero config)

## Environment Variable

```
NEXT_PUBLIC_PAYPAL_DONATE_URL=https://paypal.me/YourUsername
```

## WCAG 2.1 AA Requirements

- Link has `aria-label` describing destination and behavior
- External link indicator (visual icon + `sr-only` text "opens in new tab")
- `rel="noopener noreferrer"` on external link
- Touch target 44x44px minimum
- Color contrast 4.5:1
- Keyboard focusable and activatable

## Design Notes

- Use coffee cup emoji or SVG icon
- Emerald accent to match site theme
- Subtle placement in footer (never block game UI)
- Warm, friendly tone: "Enjoying the game? Buy me a coffee!"
- Dark mode compatible
