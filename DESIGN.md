# Design Rules — Animation + General UI/UX

This file exists so design/UX decisions in this codebase don't need to be
re-explained every time. It is imported by `CLAUDE.md` (via `@DESIGN.md`),
so Claude Code loads it automatically. It applies to both `orderUI`
(customer-facing, `getOdTheme()`) and Backoffice (staff-facing,
`getBoTheme()`) components. `CLAUDE.md` covers code structure; this file
covers what the user *sees and feels*.

Source: Part 1 adapts Emil Kowalski's animation-engineering skill
(emilkowal.ski/skill). Parts 2–3 are standard mobile/web UI-UX practice
plus decisions made for this project (Next.js App Router, MUI v9 +
Emotion `sx`, a phone-first ordering flow and a tablet/desktop Backoffice).

---

# Part 1 — Animation

## 1. The Four-Question Gate — ask before animating anything

If you can't answer all four, don't animate.

1. **Frequency** — Seen many times per session? Keep it short and subtle.
   Anything that updates every few seconds (counts, badges, polled data)
   gets no animation at all.
2. **Purpose** — Can you state in one sentence what it communicates
   ("this item was added", "a new order arrived")? If not, cut it.
3. **Speed** — Discrete feedback (buttons, toggles, chips) never makes the
   user wait.
4. **Function** — Does it explain a state change, spatial relationship, or
   cause → effect? Decoration-only animation is the first thing to cut.

## 2. Animate `transform` and `opacity`

These are compositor-only and stay smooth on low-end phones. Never animate
`width`, `height`, `top`, `left`, `margin`, `padding`, `border-width`.
To fake a resize, `transform: scale()` a wrapper.

**Exception:** small discrete controls (buttons, icon buttons, chips) may
also transition `background-color` and `box-shadow` at ≤200ms. They repaint
but don't trigger layout, and the cost on elements this small is negligible.

A one-time highlight on a larger surface (e.g. a card that just received a
new order) is done with an `opacity` fade on a pseudo-element overlay tinted
from the theme — never by animating the card's background/border/shadow.

## 3. Hard blocks — never allowed

- **`transition: "all ..."`** — always list explicit properties.
- **Bare `ease-in` on UI elements** — it starts slow and feels sluggish.
  Use `ease-out` (see Rule 5).
- **`scale(0)`** as a start/end state — use `scale(0.9–0.97)` + `opacity: 0`.
- **Looping / pulsing animations** for status (e.g. "needs approval") —
  use a static badge + text instead.

## 4. Duration budget

| Element type                          | Duration     |
|----------------------------------------|--------------|
| Button / icon button (hover, active)   | 100–160ms    |
| Tooltip                                | 125–200ms    |
| Dropdown / menu / popover              | 150–250ms    |
| Modal / dialog / drawer / sheet        | 200–500ms    |
| One-time "new item" highlight          | 250–600ms    |

Anything discrete (a click, a hover) stays under 300ms.

## 5. Easing

- **`ease-out`** — entrances AND exits.
- **`ease-in-out`** — movement between two already-visible states.
- **`ease`** — plain hover feedback.
- **`linear`** — only constant mechanical motion (progress bar, spinner).

## 6. `prefers-reduced-motion`

The global block lives in `src/app/globals.css` — don't remove it:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

For framer-motion use `useReducedMotion()`. Any motion-based cue must also
have a static cue (badge, text) so nothing is lost with motion off.

## 7. Gate hover effects

Every appearance-changing `&:hover` goes behind the shared constant
`hoverCapableMedia` from `src/app/lib/theme/sharedThemeTokens.ts`
(`"@media (hover: hover) and (pointer: fine)"`), or it sticks on touch.

```tsx
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

sx={{ [hoverCapableMedia]: { "&:hover": { backgroundColor: "primary.dark" } } }}
```

- Preserve conditionals: `[hoverCapableMedia]: { "&:hover": cond ? {...} : undefined }`.
- Never put two `[hoverCapableMedia]` keys in one sx object (the second
  silently overwrites the first) — merge them.
- `:active` and `:focus-visible` are NOT gated.

## 8. Fluid motion (dialogs, sheets, screen transitions)

- **Interruptibility** — a mid-animation tap responds immediately.
- **Velocity handoff / momentum** — for drag-to-dismiss, carry gesture
  velocity (framer-motion springs), not a fixed CSS duration.
- Otherwise, MUI's own Dialog/Drawer transitions are enough — don't stack
  extra animation on top.

## 9. Animation self-check

- [ ] Only `transform`/`opacity` (or the small-control exception)
- [ ] No `transition: all`, no bare `ease-in`, no `scale(0)`, no loops
- [ ] Duration within budget; easing matches Rule 5
- [ ] Hover gated with `hoverCapableMedia`
- [ ] Works (with a static cue) under reduced motion
- [ ] You can say in one sentence what it communicates

---

# Part 2 — General UI/UX

## 10. Touch targets and interactive elements

- Every tappable element: minimum **44×44px** hit area (48px preferred on
  Android). Keep **≥8px** between separate tappable elements.
- **Never nest interactive elements** (a button inside a link, a button
  inside a `CardActionArea`). Put secondary actions (Paid, Print) *outside*
  the card's link area.
- **Whole-card pattern:** when the entire card is the action (menu cards,
  history rows), the card is ONE semantic button/link. Any icon inside it
  (e.g. the round "+" on menu cards) is a visual affordance only:
  `aria-hidden`, no own `onClick`, not focusable.
- An element hidden per layout must be `display: none` (not just visually
  hidden) so it leaves the tab order.

## 11. Spacing — 8px grid

MUI's default spacing unit is **8px** (`theme.spacing(1)` = 8px, `0.5` = 4px).
Use theme spacing steps for padding/margin/gap; never hand-pick values like
`13px` or `0.8`.

## 12. Typography

- Use the theme's typography variants (`h5`, `subtitle2`, `body2`,
  `caption`, …). No one-off `fontSize`/`fontWeight` in components.
- If a variant needs tuning, change it in the theme (`sharedThemeTokens.ts`)
  after checking where it's already used (it's shared by the customer app).
- At most 3–4 text sizes per screen.

## 13. Color

- **All colors come from theme palette roles** — `primary`, `secondary`,
  `success`, `warning`, `error`, `info`, `text.primary/secondary`,
  `background.default/paper`, `divider`. No hex/rgb in components.
- Every role is declared explicitly in `src/app/lib/theme/theme.ts`
  (Backoffice) / `odTheme.ts` (customer), so changing a brand color means
  editing ONE line there.
- **Pale tints are derived**, never hardcoded:
  `alpha(theme.palette.warning.main, 0.12)`. They follow the role when it
  changes.
- **Role meanings:** `primary` = the main action on a view (one per view);
  `warning` = needs attention / awaiting approval; `success` = accepted /
  paid; `error` = destructive or failed. Don't reuse status colors for
  categories (e.g. Table vs Counter uses icon + label, not error/warning).
- **Money is never red.** Prices and totals use `text.primary`; emphasize
  totals with size/weight only.
- Contrast: body text ≥ 4.5:1; large text and UI borders/icons ≥ 3:1.
- Never convey state by color alone — pair it with an icon, label, or text.
- Print output is always `common.black` on `common.white`, regardless of
  light/dark mode.

## 14. Loading, empty, and error states

Design all three for every list/data view.

- **Loading:** skeletons shaped like the real content for anything that
  takes >300–400ms; no spinner for faster loads. Quick actions (add to
  cart) update optimistically.
- **Empty:** muted icon + one line + (where useful) a helper line or action.
  Current wording: "No orders yet" + "New orders appear here
  automatically." (Order List sections), "No paid bills on this day" /
  "No cancelled orders on this day" (History).
- **Never hide page controls in an empty state.** Headers, filters, and the
  sound/volume controls stay visible when a list is empty.
- **Error:** plain language + Retry, inline where possible ("Couldn't load
  more" + Retry).

## 15. Feedback for every action

Visible response within ~100ms: pressed state (`:active` →
`scale(0.98)`), disabled + in-flight state while submitting (also prevents
double-taps), or an optimistic update. A disabled control shows WHY
("Accept or reject order #1047 first", "Nothing to print yet").

## 16. Forms and inputs

- Real labels, not placeholder-only.
- Validate on blur, not on every keystroke.
- Right input mode (`inputMode="numeric"`, `type="tel"`).
- Auto-focus the first field when a form/sheet opens.
- Search inputs: debounce ~300ms, include a clear (×) button.

## 17. Navigation and information architecture

- Keep flows to 2–3 taps where possible.
- A predictable back action on every screen.
- Dialogs/sheets/drawers always have a visible close (×), close on
  Escape/outside tap, and — when opened from a list — close with the
  browser Back button.
- **View state lives in the URL** for anything a user might return to or
  share (e.g. History: `?day=…&tab=…&bill=…`). Section switches like
  [Open] [History] are links, not local state.

## 18. Responsive layout — mobile-first

- Build for **320px** first, then add breakpoints. Test at 320px before
  calling a screen done.
- Breakpoints: `sm` 600 · `md` 900 · `lg` 1200 (theme defaults — don't
  change them app-wide; use `theme.breakpoints.up(n)` locally if needed).
- **Customer menu grid:** 2 columns <600 · 3 at ≥600 · 4 at ≥900 (max 4),
  grid capped at ~1400px and centered, equal-height rows.
- **Menu card:** ONE layout at every width — image (1.45/1) → name (1 line)
  → description (1 line, ellipsis) + "See more" (never truncated) → price +
  round "+" affordance.
- **Master-detail (Backoffice order detail, History):** side panel at `lg`
  and up; below `lg`, a bottom bar (total + action) that opens a right
  Drawer on tablets and a bottom sheet / full-screen Dialog on phones.
- Remember the permanent Backoffice sidebar when judging available width.

## 19. Safe areas (iOS / PWA)

Fixed bottom elements (bars, sheets, floating buttons) use:

```ts
pb: "calc(12px + env(safe-area-inset-bottom, 0px))"
```

Sticky/fixed top elements use `env(safe-area-inset-top, 0px)`.

## 20. Perceived performance

- Reserve image space (fixed `aspectRatio`) to avoid layout shift.
- Lazy-load below-the-fold images.
- Prefetch the next page before the user reaches the end (Rule 23).

## 21. Confirm destructive actions only

Confirm what's hard to undo (Mark as paid, cancel a submitted order,
delete a menu item). Don't confirm cheap, reversible actions (quantity +/-,
toggling an add-on). Printing never blocks or changes payment.

## 22. Accessibility basics

- Icon-only buttons need `aria-label`; toggles use `aria-pressed`.
- Semantic components (`<Button>`, `CardActionArea`) instead of clickable
  `<div>`s.
- Decorative elements (timeline lines, overlays, affordance icons) get
  `aria-hidden`.
- Meaningful images get real `alt` text (item name).
- Counts shown as badges are included in the accessible name
  ("Orders, 2 need approval").
- A disabled button inside a Tooltip is wrapped in a `<span>` so the
  tooltip still works.
- Live status regions (e.g. the new-order banner) use `role="status"` /
  `aria-live="polite"`.

---

# Part 3 — Patterns decided for this project

## 23. Long lists and pagination

- **Page scroll, not nested scroll boxes.** The list is the page content;
  keep ONE scroll container (nested boxes fight touch scrolling on phones).
- Keep headers/filters visible with **sticky** positioning instead.
- **Cursor-based** pagination (e.g. by `(paidAt, id)`), never offset — new
  rows arriving mid-scroll must not cause duplicates or skips.
- Request the next page when ~2–3 rows remain (IntersectionObserver
  sentinel with `rootMargin`), one request at a time (in-flight guard).
- Bottom states: skeleton rows while loading · "Couldn't load more" +
  Retry · "That's all" at the end · a "Load more" button as a
  keyboard/fallback path.
- A "Back to top" button after ~2 screens of scrolling.
- Refresh reloads only the list data (reset cursor, scroll to top) — not
  the whole page.

## 24. Dates and time

- Day boundaries ("Today", "Yesterday", a selected day) are computed in the
  **shop timezone (Asia/Yangon)** from config — never UTC days.
- Labels: "Today" / "Yesterday" / weekday, plus "Fri, Sep 25".
- Date picking uses MUI X `DateCalendar` (dayjs adapter) in a Popover, with
  `minDate` = the location's first order day and `maxDate` = today.

## 25. New-order alerts (Backoffice)

- Alerts work on every Backoffice page (owned by the layout-level provider).
- A persistent banner "New order waiting — N need approval" on every page
  except the Order List; the whole banner is one link to the Order List; it
  disappears on its own when nothing is pending.
- Sound is **off by default**, enabled by a user gesture (browsers never
  show a sound permission prompt). Turning it on plays a test beep. At most
  one beep per poll. Volume uses a perceived-loudness (squared) curve.
- The tab title is prefixed with the pending count, e.g. "(2) Orders".
- A card that receives a new round gets a one-time highlight (Rule 2), never
  a looping animation.

## 26. Orders, bills, and money on screen

- Order List: "Needs approval" first (oldest-waiting first, with a
  countdown), then Tables and Counter sections (side by side on `md+`).
- Order detail: a timeline of rounds (pending first, then newest), no price
  column on round cards; money lives only in the Bill (accepted rounds only;
  pending rounds shown as "Waiting approval +X").
- Identical items in the same cart are shown as one line with a quantity;
  lines with different notes or prices stay separate.

---

# Self-check before merging any UI change

- [ ] Touch targets ≥44px, ≥8px apart, no nested interactive elements
- [ ] Theme spacing, typography variants, palette roles only (tints via `alpha()`)
- [ ] Money not in red; state never color-only
- [ ] Loading, empty, and error states designed; controls stay visible when empty
- [ ] Feedback within ~100ms; disabled controls say why
- [ ] Tested at 320px and at each breakpoint in use
- [ ] Fixed bottom/top elements respect safe-area insets
- [ ] Images reserve space; long lists follow Rule 23
- [ ] Destructive actions confirmed; trivial ones not
- [ ] Accessible names for icon buttons and badges; decorative items `aria-hidden`
- [ ] Animation self-check (Rule 9) passes

---

*Last synced 2026-09-26: small-control transition exception, shared
`hoverCapableMedia`, global reduced-motion block, 8px spacing fix, explicit
Backoffice palette + derived tints, money-not-red rule, whole-card and
no-nesting rules, one-layout menu card and 2/3/4 grid, master-detail
breakpoints, safe-area pattern, list/pagination, shop-timezone dates, and
new-order alert rules.*
