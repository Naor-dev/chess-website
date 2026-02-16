# WCAG 2.1 AA Compliance - Context

**Last Updated:** 2026-02-08

## Key Files

| File | Purpose |
|------|---------|
| `apps/frontend/src/app/layout.tsx` | Root layout - add `lang`, skip link |
| `apps/frontend/src/app/game/[id]/page.tsx` | Game page - board a11y, move announcements |
| `apps/frontend/src/app/game/[id]/components/GameOverModal.tsx` | Modal - needs dialog role, focus trap |
| `apps/frontend/src/app/game/[id]/components/ChessClock.tsx` | Clock - needs aria-label, live region |
| `apps/frontend/src/app/game/[id]/components/EngineThinkingOverlay.tsx` | Overlay - needs status role |
| `apps/frontend/src/app/game/[id]/components/MoveReplayControls.tsx` | Already has aria-labels (good) |
| `apps/frontend/src/app/game/new/page.tsx` | New game form - label associations |
| `apps/frontend/src/app/history/page.tsx` | History - table/list a11y |
| `apps/frontend/eslint.config.mjs` | ESLint config - add jsx-a11y plugin |
| `dev/design-guidelines.md` | Design guidelines (mentions WCAG AA) |

## Key Decisions

1. **Board a11y approach**: Hidden description layer + ARIA live announcements (don't modify react-chessboard internals)
2. **Keyboard move input**: Stretch goal - algebraic notation text input as alternative to drag/click
3. **Testing**: axe-core automated + manual screen reader for key flows
4. **Incremental rollout**: Foundation → Components → Board → Testing

## WCAG 2.1 AA Criteria Reference

### Level A (Must Have)
- 1.1.1 Non-text content has text alternatives
- 1.3.1 Info and relationships conveyed through structure
- 1.3.2 Meaningful reading sequence
- 2.1.1 All functionality keyboard accessible
- 2.1.2 No keyboard traps
- 2.4.1 Skip navigation mechanism
- 2.4.2 Page titles
- 3.1.1 Language of page
- 4.1.1 Parsing (valid HTML)
- 4.1.2 Name, role, value for all UI components

### Level AA (Must Have)
- 1.4.3 Contrast minimum 4.5:1 (normal text), 3:1 (large text)
- 1.4.4 Text resizable to 200%
- 1.4.11 Non-text contrast 3:1
- 2.4.7 Focus visible
- 3.3.1 Error identification
- 3.3.2 Labels or instructions

## Current Accessibility Inventory

### Good (Keep)
- Focus rings on buttons
- Replay keyboard shortcuts
- Responsive design
- Dark mode

### Fix Required
- No `lang` attribute
- No skip-to-content
- No dialog roles on modals
- No focus traps
- No ARIA live regions for dynamic content
- No board description for screen readers
- No move announcements
- No eslint-plugin-jsx-a11y
- Form label associations unverified
