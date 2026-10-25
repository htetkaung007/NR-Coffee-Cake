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

In components, never write the query out: sx keys use `reducedMotionMedia`
(`{ [reducedMotionMedia]: { animation: "none" } }`) and JS uses
`reducedMotionQuery` (`useMediaQuery` / `window.matchMedia`) — both from
`src/app/lib/theme/sharedThemeTokens.ts`, next to `hoverCapableMedia`.
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
  (e.g. the Add square on menu cards) is a visual affordance only:
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
- **Customer text sizes** — ONE place, `lib/theme/customerTypography.ts`
  (`CUSTOMER_TEXT_PX`, px, tune ±1px there), applied by odTheme's second
  pass; the Backoffice keeps the shared scale. Phone (xs) sizes; from
  `sm` / `md` up a variant keeps the shared size when already bigger,
  else it's raised to the phone size:

  | Variant   | Phone | Wider screens            |
  |-----------|-------|--------------------------|
  | caption   | 13px  | 13px                     |
  | body2     | 15px  | 15px                     |
  | body1     | 16px  | 16px                     |
  | subtitle2 | 15px  | 15px                     |
  | subtitle1 | 16px  | 19.2px from `md`         |
  | button    | 15px  | 15px                     |
  | inputs    | ≥ 16px (§16)                     |

  h5 / h6 keep the shared sizes. No customer component sets a font size
  (the menu detail sheet uses the same variants as the dialog).
- **Boxes grow with their text.** On customer screens a box that holds
  text never has a fixed `height` / `width`: chips, the Add square,
  badges, tiles, pills, buttons and rows use `minHeight` / `minWidth` +
  theme padding (the customer theme makes MUI Chip's height a minimum
  too), so a bigger size or Myanmar's taller lines never spill out. Tap
  targets stay ≥ 44px; images keep their fixed aspect ratios.
- **Myanmar Backoffice** (BO_LOCALE "my"): the same `:lang(my)` rules
  (myanmarTypography also covers h1–h4, overline, menu rows, table
  cells and toggle buttons, and drops letter-spacing). Noto Sans Myanmar
  for body, buttons, sidebar, chips, tables, forms; Noto Serif Myanmar
  only where the theme already uses the display face (page titles and
  large headings — h1/h2/h6). Myanmar words are longer and taller: boxes
  grow (minHeight, never a fixed height), labels that can't wrap get
  noWrap + ellipsis with minWidth 0 on the flex parent, buttons may wrap
  to two lines. Digits stay 0–9 (money and dates). The 260px sidebar and
  the rail tooltips fit the Myanmar names.
- **Myanmar text** is drawn a little smaller (`MYANMAR_FONT_SCALE` =
  0.96) with taller minimum lines —
  `lib/theme/myanmarTypography.ts` (`MYANMAR_FONT_SCALE`, the one knob),
  applied to `:lang(my)` text by BOTH themes' CssBaseline. Myanmar parts
  carry `lang="my"` (`langAttr`; a portalled dialog on itself); never set
  Myanmar sizes in a component.

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
- **Money is neutral by default and never red.** Prices and totals use
  `text.primary`; emphasize totals with size/weight only. The first
  exception is **Reports**, where money *received* (sales, avg. bill,
  daily sales, channel and item/add-on sales) uses the **income** tone —
  the success role's text shade, `palette.successText` (≥ 4.5:1 on paper
  and page in both modes). Cancelled / "Not charged" amounts, counts,
  percentages and deltas stay neutral. **Menu-card prices** in the
  Backoffice (the menus list) may use the **price** tone —
  `primary.main`, the brand brown / dark-mode caramel (≥ 4.5:1 on paper
  and page in both modes). All other money stays neutral; never red, and
  never green outside Reports' income. Pick the tone with
  `moneyToneSx(tone)` / `moneyColor(tone)` (`backoffice/order/orderTypography.ts`)
  — never write a money color out in a component. These are the
  Backoffice rules.
- **Customer side (owner's decision):** prices use the menu card's
  **price tone**, `palette.decor.price` (the customer theme's red) —
  the menu card, and in the menu detail the item price, each option's
  "+500 Kyats" and the footer total ("Free" uses the success text
  shade), and the History list's "Total amount" (HistoryTotalCard).
  The same parts under the Backoffice theme (staff New Order)
  get `decor.price` = text.primary, so staff money stays neutral.
- Contrast: body text ≥ 4.5:1; large text and UI borders/icons ≥ 3:1.
- Never convey state by color alone — pair it with an icon, label, or text.
- **Table occupancy** (New Order's "Order for"): In use = error dot +
  word, Free = success dot + word (dot and word only — never the row,
  the name or the money). The word uses `palette.errorText` /
  `palette.successText` (≥ 4.5:1 on paper and page, both modes).
- Print output is always `common.black` on `common.white`, regardless of
  light/dark mode. **Receipts / bills** print in the voucher language:
  the Backoffice language by default; the screen-only bar above the
  paper (Back · EN | မြန်မာ · Print, `displayPrint: none`) switches the
  voucher's labels, money words and the shop's Myanmar names, remembered
  per device ("printVoucherLang:v1"); the page height is re-measured.
  The printed report sheet follows the Backoffice language, no toggle.
- **Online menu status chip** (Backoffice top bar, selected location):
  on = success dot + "Online menu" (`palette.successText`), off = neutral
  dot (`text.secondary`) + "Online menu off" — never red (off is the
  normal default); below `sm`, dot + globe icon with an aria-label. It
  sits on the right of the top bar, just before the account menu.

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

- A submit button locks on the first tap (useSubmitLock — a ref, not
  only state) and stays locked until the page leaves after success; it
  unlocks only on an error.
- Busy buttons show MUI's `loading` spinner + a '…ing' label, then
  '✓ done' until the page leaves (`components/SubmitButton`): "Create
  Menu" → "Creating menu…" → "Created ✓" — never back to the idle label
  during the success toast; an error brings the idle label back with
  the error shown as before. Words come from the surface's own messages
  (Backoffice `bo.*`, customers' storefront keys). Under reduced motion
  the spinner slows down; the "…ing" label is the static cue.

## 16. Forms and inputs

- Real labels, not placeholder-only.
- **Character limits are visible**: every name / description field
  shows "12/50 characters" (`components/CharacterCount`, in the staff's
  language), and its Myanmar twin shows the SAME counter (beside its
  "Shown to customers who choose Myanmar…" hint) — menu name /
  description, category name, add-on group title and option names. ONE
  number per field pair, exported next to the Zod schema
  (`MENU_NAME_MAX`, `MENU_DESCRIPTION_MAX`, `CATEGORY_NAME_MAX`,
  `ADDON_GROUP_NAME_MAX`, `ADDON_OPTION_NAME_MAX`) and used by the schema,
  the input's maxLength and the counter (string length, as Zod counts).
- Validate on blur, not on every keystroke.
- Right input mode (`inputMode="numeric"`, `type="tel"`).
- Auto-focus the first field when a form/sheet opens.
- Search inputs: debounce ~300ms, include a clear (×) button.
- **Field text is ≥ 16px on phones** (below `sm` and on any touch-only
  screen — a phone in landscape is wider than `sm`): iOS Safari zooms the
  whole page when a focused field's text is smaller. Set once in the
  theme (MuiInputBase / MuiInputLabel, `lib/theme/inputFontSize.ts`) for
  both themes — the input, textarea, select, placeholder and the resting
  label; the Myanmar scale never targets fields. Components never set a
  field's font size. **Never disable pinch zoom** (no `maximum-scale` /
  `user-scalable` in the viewport) — people must still be able to zoom.

## 17. Navigation and information architecture

- Keep flows to 2–3 taps where possible.
- A predictable back action on every screen.
- Dialogs/sheets/drawers always have a visible close (×), close on
  Escape/outside tap, and — when opened from a list — close with the
  browser Back button.
- **View state lives in the URL** for anything a user might return to or
  share (e.g. History: `?day=…&tab=…&bill=…`). Section switches like
  [Open] [History] are links, not local state.
- Backoffice create/edit pages start with PageHeader: a back link to the
  section's list page (a link, never history back) + the page title (h1).
- Account menu (top-bar avatar): name + role, **Language** (EN | မြန်မာ —
  the NameLanguageToggle look, 44px, accessible name "Backoffice
  language"; the staff's BO_LOCALE cookie, saved on the server, the page
  refreshes in the new language), Dark mode (per device), Sign out — for
  every role. Language sits right above Dark mode.

## 18. Responsive layout — mobile-first

- **The page minimum is 375px**, set ONCE on `<body>` (`globals.css`,
  shared by the customer pages and the Backoffice). Build for 375px
  first, then add breakpoints; test at 375px before calling a screen
  done. Narrower phones (320–360px) get the 375px page scaled down evenly
  — a slight uniform zoom-out (owner's decision); the page is exactly
  375px wide, so there's never an empty strip.
- Breakpoints: `sm` 600 · `md` 900 · `lg` 1200 (theme defaults — don't
  change them app-wide; use `theme.breakpoints.up(n)` locally if needed).
- **Touch tablets are a device, not a width.** Tablet and laptop widths
  overlap (iPad Air landscape 1180px, laptops 1280–1440px), so every
  tablet-only layout goes through ONE query, `touchTabletMedia`
  (`sharedThemeTokens.ts`, next to `hoverCapableMedia`): a touch-only
  screen ≥ `sm` wide (hover: none, pointer: coarse) — tablets in either
  orientation, and a phone held sideways. Laptops (touch laptops with a
  touchpad / mouse too) and desktops never match and keep the layouts
  below at every width — exactly as before the tablet work; phones in
  portrait are below `sm`. Never a width breakpoint for "tablet".
  `touchTabletPortraitMedia` / `touchTabletLandscapeMedia` add the
  orientation (no ad-hoc orientation queries). **Touch-tablet grids are
  flexible, never a fixed column count:** `repeat(auto-fill,
  minmax(MIN, 1fr))` with ONE named MIN (and gap) per grid, so the
  columns follow the space actually available — the orientation, the
  sidebar (full or rail) and New Order's side panel.
- **Menu grid order** (customer /menu and staff New Order): filtered by
  category and search first, then orderable menus before the
  not-orderable ones (sold out — stock 0 — or switched off), each group
  keeping its usual order (stable) — `lib/menu/orderableFirst`, the same
  "orderable" rule MenuCard dims by. Nothing is hidden.
- **Centred Backoffice pages**: New / Edit Location and Table and
  Settings share ONE column — `components/CenteredPage` (max 480px,
  centred, page padding); a PageHeader's back link stays on its left.
  Settings: fluid up to 960px, centred; inner forms 2 columns from md
  (CenteredPage's `maxWidth` = `SETTINGS_PAGE_MAX_WIDTH`; the company
  name field ≤ 480px beside Save; Add a manager: Email | Password,
  Location | —, the permission checklist in 2 columns; one column below
  md).
- **Customer menu grid:** 2 columns <600 · 3 at ≥600 · 4 at ≥900 (max 4),
  grid capped at ~1400px and centered, equal-height rows. **Touch
  tablets:** compact cards, MIN 212px (`TOUCH_CARD_MIN_PX`) with 16px
  gaps / 8px grid padding — 4 at 1180px and 5 at 1280px landscape (MIN
  stays above 210 so 1180 keeps 4); in PORTRAIT (`touchTabletPortraitMedia`)
  at most 3 columns, each ≥ 150px (`TOUCH_PORTRAIT_CARD_MIN_PX`; the
  track is `max(150px, (100% − 2 gaps) / 3)`), still auto-fill — 2 only
  below a 482px grid — with 16px page sides instead of 24px. Widths are
  CSS px, never the spec sheet's: an "800×1280" Android tablet at device
  pixel ratio ~1.33 is ~600px wide → 3 × ~173px; 640px → ~187px; 768px →
  ~229px; 820px → ~247px. On the narrowest, the Myanmar "ထည့်မယ်" square
  wraps under the price (by design; the price never wraps). And
  tighter spacing above the grid (page top 16px, OrderPlaceHeader's gap
  8px, the filter row's bottom margin 8px): two full rows above the
  bottom bar on load at 1180×740 and 1280×670, with the place chip
  showing. **Search + categories:** phones —
  search full width, the category row under it, and ONLY the search is
  sticky (the row scrolls away with the menu); laptops / desktops (≥ `sm`)
  — the same two rows, sticky together; touch tablets — ONE sticky row
  (search on the left — 340px in landscape, 45% (≥ 200px) in portrait —
  the scrollable tabs fill the rest). Picking
  a category while scrolled down brings the grid's top back just under
  the pinned part.
- **Menu card:** ONE layout on phones — image (1.45/1) → name (1 line)
  → description (1 line, ellipsis) + "See more" (never truncated) → price +
  the Add affordance: a ROUNDED SQUARE (32px tall, min 32px wide, theme
  radius, primary fill, contrastText, no shadow) — the + icon in English
  and on the staff New Order page, the words "ထည့်မယ်" for Myanmar
  customers. It's decoration only (aria-hidden, the whole card is the
  button). Price + Add wrap: when they don't fit, the Add square moves
  under the price. **Prices never wrap** (whiteSpace nowrap). Customer
  prices read "4,500 Kyats" / "4,500 ကျပ်"; staff screens keep "MMK".
  **Compact on touch tablets** (MenuCard's `compact` prop — the customer
  menu and staff New Order pass it; MenuForm's preview never; it changes
  nothing outside `touchTabletMedia`): the photo is 16:9, the description
  + "See more" row is not rendered (display none; the detail shows the
  description) and the name / price padding is 4px (price row 32px).
  Everything else — one-line name, unwrapped price, Add square wrapping
  under it, whole-card button — stays the same.
  **"Popular" badge** (customer /menu only — staff New Order and the
  menu form's preview never show it): the location's 3 best-selling
  menus of the last 7 shop days, each with at least 5 sold (ties → the
  lower menu id; fewer qualify → fewer badges) — `lib/menu/popularMenus`,
  counted by Reports' item sales rule. Words only, never a number. A
  small solid chip on the image's TOP-LEFT (the stock chips sit
  elsewhere): `secondary` fill + contrastText (≥ 4.5:1 in both modes;
  never the price tone or error), a star icon (aria-hidden) + "Popular"
  / "လူကြိုက်များ" in caption 600, minHeight + padding (no fixed size).
  The word is part of the card's accessible name ("Popular, Latte, …").
  Not drawn on a card that can't be ordered (sold out / switched off);
  the same on the compact card.
- **Master-detail (Backoffice order detail, History):** side panel at `lg`
  and up; below `lg`, a bottom bar (total + action) that opens a right
  Drawer on tablets and a bottom sheet / full-screen Dialog on phones.
- **New Order:** "Order for" picker above the menus below `lg` (its own
  card above Current order from `lg`); Current order (lg+) keeps to its
  content, capped at the viewport; only its lines scroll (Total + Send
  to kitchen stay pinned at its bottom; the empty state is icon + "No
  items yet" + "Tap a menu to add it", 24px above and below). Current
  order is a bottom sheet
  below `lg` on all sizes (centred, max ~640px from `sm`), opened from
  the bottom bar ("<target> · N items" + View order) — PINNED to the
  screen's bottom edge whatever the content height (OrderBottomBar
  `pinned`: position fixed, from the sidebar's (or rail's) edge at `sm`; an in-flow
  spacer of its height keeps the last cards clear; under the sheet it
  opens and dialogs); switching
  table with items asks first; the order stays on this device until
  Send. A "New order | Add to open bill (N)" toggle sits above "Order
  for": New order lists "Counter · New takeaway" and the FREE tables;
  Add to open bill lists the open counter bills and the tables IN USE
  (open rounds or a customer draft). The toggle follows the selected
  target (a table that becomes in use moves it); with N = 0 the second
  segment is disabled, "No open bills". On a LANDSCAPE touch tablet
  below `lg` the toggle (its natural width) and "Order for" (the rest)
  share ONE row; portrait tablets, phones and laptops stack them. An order's "Add items" opens New Order for that same bill (a new
  round — sent rounds are never edited) and comes back to it after Send.
  An **EN | မြန်မာ toggle** (NameLanguageToggle, beside the title)
  switches the menu side only — menu names, chips, search results (both
  names always match), the detail sheet and the Current order lines'
  names and prices ("3,500 ကျပ်", "ထည့်မယ်", "Sweet: Low" localized);
  staff controls (Order for, the mode toggle, Send to kitchen, line
  notices, errors) follow the Backoffice language. Remembered per device
  (localStorage "staffMenuLang:v1"; until the device has a choice, the
  Backoffice language); the menu holds placeholders until it's read, so
  the other language never flashes (shaped like the card).
  Menu grid: 2 columns on phones, from `sm` as many 150–200px cards as
  fit (laptops / desktops). Touch tablets: compact cards, MIN 176px, 12px
  gaps — 4 at 1180px landscape with the full sidebar (5 with the rail),
  2 at 800–820px portrait (3 with the rail), 2–3 at 1280px beside the
  400px panel; the price is never cut.
- Remember the permanent Backoffice sidebar when judging available width.
- **Backoffice page top on touch screens:** `<main>`'s gap above a
  page's first line is 16px on phones and touch tablets
  (`backofficePageTopTouch`, BackofficeShell — StickyPageHeader mirrors
  it), 16px / 24px (sm+) on laptops. A page's own padding adds to it.
- **Backoffice page height — ONE owner:** BackofficeShell's root is
  `minHeight: 100dvh`; the layout's page wrapper and pages add no
  min-height of their own (a second one double-counted the top bar and `<main>`'s padding, so
  every page scrolled). Heights tied to the screen use `dvh`, never `vh`
  (on phones / tablets `vh` counts the browser's hideable toolbar). No
  Backoffice page may be wider than its 375px minimum / the screen at any
  width (375–1400px,
  touch and non-touch, sidebar full and rail) — check a change with an
  overflow sweep (`scrollWidth − clientWidth` = 0, and nothing's right
  edge past the viewport).
- **Backoffice sidebar on touch tablets** (`lib/backofficeSidebar`): a
  toggle at the LEFT of the top bar (Menu / MenuOpen icon, 44px,
  "Collapse sidebar" / "Expand sidebar", aria-expanded) collapses it to a
  72px icon rail — icons only (the selected one keeps its fill), each
  named by its label (aria-label + a Tooltip on the right), no section
  headings or badges — and back to the full 260px. The width switches
  plainly (no animation); the content's left edge and New Order's pinned
  bar follow, and the flexible grids reflow. Default until tapped: the
  rail in portrait, the full sidebar in landscape (pure CSS, so the
  first paint is right); then the choice is remembered per device
  (localStorage "boSidebar:v1", copied onto `<body data-bo-sidebar>` by
  an inline script before the first paint — never a flash). Laptops: no
  toggle, the sidebar as always; phones: the temporary drawer.
- **Reports → Items: the view funnel.** Every item row (top and slow
  sellers) ends with one more line at every width — "Viewers 40 ·
  Ordered 12 · Viewed, not ordered 28 · Rate 30%" (ကြည့်သူ · မှာသူ ·
  ကြည့်ပြီး မမှာ · မှာနှုန်း): each value named in words, body2, label
  text.secondary + value text.primary 600, wrapping inside the row
  (never a sideways scroll at 375px; no extra columns). Neutral —
  counts and percentages, never the income tone. Rate shows from 10
  viewers ("—" below); a period with no view data shows "—" everywhere,
  never 0. Above the list, one caption: "Counts customers who opened
  the menu on their phone (QR) — one per customer per day." The sold
  quantity, money, share and change stay as they were; it follows the
  Week | Month navigator; CSV unchanged.
- **Reports header on phones:** Export (the download icon below `md`,
  "Export" from `md`, accessible name "Export", ≥ 44px) sits at the right
  end of the "Reports" title's row at every width (OrdersPageHeader's
  `inlineActions`; the Orders pages keep theirs). Below `sm` only the
  period navigator's row is sticky — Week | Month and Overview | Items sit
  above it and scroll away with the title; from `sm` the three are ONE
  sticky row. One set of controls (no copies), all links.
- **Backoffice Menus grid:** 2 columns on phones, from `sm` as many
  ≥ 220px columns as fit, the 16:10 photo capped at 140px from `md`
  (laptops / desktops). Touch tablets: MIN 170px with 16px gaps (the
  cards never touch) — 4 at 1180–1280px landscape with the full sidebar
  (5 with the rail), 2 in portrait even with the full sidebar (3 with
  the rail on an 800px screen); the photo capped at
  112px, page top / header gap 16px / 16px. On those cards the price
  wraps under the name when the name would get < 80px.
- **Backoffice Menus status chips**: one row under the page header,
  above the grid — [All (12)] [Sold out (3)] [Off (1)] — links that keep
  the filter in the URL (`?status=soldOut | unavailable`, no param =
  All; anything else reads as All). The selected chip is filled primary
  with aria-current="page", the others outlined; the count is part of
  the label (and its name) and shows at 0 too; ≥ 44px tall, 8px apart;
  the row scrolls sideways inside itself when it's wider than the
  screen. Filtering never reorders: the cards keep their usual order
  (`lib/menu/menuStatusFilter`, by menuCardStatus — a switched-off menu
  with no stock is "Off" only). An empty filter keeps the chips plus one
  muted line ("No sold-out menus" / "No menus are switched off"); a
  company with no menus at all shows only "No menu items yet." (no
  chips). After an on/off switch the refresh updates the counts, and a
  card that no longer matches leaves the filtered list.
- **Backoffice menu card states** (one status rule,
  `lib/menu/menuCardStatus.ts`; stock words from `lib/menu/stockLevel.ts`, shared
  with the customer card's "low" threshold):
  - **Unavailable** — switched off on purpose: neutral "Unavailable"
    pill centred on the image, image greyed and dimmed; the rest of the
    card stays full contrast.
  - **Hidden here** — not shown at this location: neutral chip,
    bottom-left of the image; not dimmed.
  - Stock badge, **bottom-right of the image**, always shown (solid,
    ≥ 4.5:1): **"Sold out"** (stock 0, error role), **"N left"** (1–4,
    warning role), **"N in stock"** (5+, neutral).
- **Online menu = the /menu page** (`lib/storefront/menuAccess`): with
  the owner's switch ON, anyone sees the menu as it is today; OFF, a
  visitor who hasn't scanned the QR (and any missing or closed location)
  gets ONE simple screen instead — "The shop is unavailable now" + "Scan
  the QR code at your table or the counter to order." (customer theme,
  `role="status"`, no menu data). The /cart page follows the same rule.
  Ordering always needs the QR, ON or OFF.
- **Landing page `/`** (customer side, storefront layout — customer
  theme, language card, EN | မြန်မာ switch top-right): centred, max
  480px — the shop's initials badge (56px, primary) + name (h5), then
  one row per location whose online menu is on and that isn't archived
  (paper, 1px divider, radius × 2; name body1 + a contained "View menu"
  button → `/menu?locationId=<id>`, its accessible name includes the
  location), and always the hint "To order, scan the QR code on your
  table or at the counter." with a scan icon (body2, text.secondary).
  No location online → only the name and the hint. No bottom bar, no
  Backoffice / sign-in link.
- **Customer pages: never a sideways scroll** above the 375px page
  minimum (the `<body>` rule above — no page wrapper or component has a
  min-width of its own). Nothing may be wider than the page at 375 / 412
  / 600px in either language — text that can't wrap gets `noWrap` +
  ellipsis (with `minWidth: 0` on its flex parent) or `overflowWrap:
  "anywhere"`. Never give a component a min-width to hide an overflow:
  ONE element sticking out makes the browser zoom out unevenly (cut-off
  search, cart off-screen, an empty strip on the right). Heights use
  `dvh`, never `vh`.
- **Customer category row** (MenuBrowser): MUI `Tabs`
  variant="scrollable" (touch-scrolls; arrows from `sm` only when it
  overflows; the selected tab scrolls into view) with the indicator
  hidden, each Tab styled as a bordered pill — body2 600, never wraps,
  16px side padding, a 36px pill (its ::before) in a 44px tap area,
  radius 999, 8px gap (`.MuiTabs-list` — MUI v9 has no
  `.MuiTabs-flexContainer`). Unselected: paper + 1px `inputBorder`
  (≥ 3:1 on the page) + text.primary; selected: the customer
  `primary.main` fill + contrastText, same 1px border (no jump). The row
  lines up with the search field above (same padding). role="tab",
  aria-selected and the arrow keys come from Tabs.
- **"Scanned ✓" note** (Counter menu after a QR scan): shows, then after
  ~4s fades out (opacity, ease-out) and only then leaves the layout (no
  height animation); × closes it; reduced motion just removes it. The
  `scanned` URL marker is dropped, so a refresh never shows it again.
- **Add-ons panel** (Backoffice): beside the group list from `md`
  (sticky); below `md` — phones AND tablets — a bottom sheet
  (SidePanelDrawer `placement="sheet"`, centred, 640px cap from `sm`)
  that can be dragged down to close (`swipeToClose`: only once its
  scrolling content is at the top) and keeps Edit away from the ×: a
  full-width outlined Edit in a footer that stays in view while the
  options scroll (the inline panel keeps Edit in its header). On touch
  screens (phones, touch tablets — `touchScreenMedia`; never laptops)
  the panel's text is one variant step bigger — title h6 → h5, names /
  prices / descriptions body2 → body1, section labels and chips →
  body2 (medium chips) — so Myanmar names scale with it.
  An EN | မြန်မာ toggle (under the title, beside Required / Optional)
  switches the shop data names only (group + options); labels stay
  English. Myanmar view: a name with no Myanmar name shows the English
  one with a dotted warning underline (`components/LocalizedName`,
  shared with the add-on form's preview) + "Dotted names have no Myanmar
  name yet." မြန်မာ also shows the customer's money words — "1,000 ကျပ်",
  "အခမဲ့" (`lib/i18n/customerWords`, from messages/my.json); EN keeps
  "MMK" / "Free".
- **Customer top bar:** [shop icon + name][language switch][cart] — the
  cart and the switch never shrink; the shop name truncates first. The
  switch shows a globe + the OTHER language's short label ("EN" /
  "မြန်မာ") at every width (the page is never narrower than 375px).
- **Customer bottom bar** (Menu / Cart / History) is a **floating pill**,
  mounted ONCE in the storefront layout (`OrderBotBar`) so it stays put
  between tabs: fixed 12px from the sides (16px from `sm`) and from the
  bottom + safe area, max 480px centred, paper + 1px divider, radius 999,
  a soft theme shadow, above the page but below drawers and dialogs.
  Three items (20px icon + caption, 44px — the bar is 54px): the selected one in primary.main
  on an alpha(primary.main, 0.12) pill with aria-current="page"; the cart
  badge (primary, hidden at 0) is part of the link's name ("Cart, 2
  items"). Shown on /menu, /cart and /history; hidden on the receipt
  (/history/<id> — it has its own Back and Order more, and the lines need
  the room), the QR scan / continue screens and ShopUnavailable
  (`lib/storefront/bottomBarVisibility`). The order outcome screens
  (confirmed / rejected, on /cart) KEEP the bar: OutcomeScreenShell keeps
  `BOTTOM_BAR_CLEARANCE` free, so its two buttons sit above it. **While the on-screen keyboard
  is open** (a text field has focus, confirmed by the visual viewport —
  `useOnScreenKeyboardOpen`, used only by the bar) it fades out (opacity,
  150ms ease-out; no taps, out of the tab order once faded) and comes back
  when the keyboard closes; reduced motion just hides / shows it. Pages
  keep `BOTTOM_BAR_CLEARANCE` (`lib/storefront/bottomBarLayout`) free at the
  bottom — never their own numbers; a page's own bottom action (/cart's
  Send) sits 8px ABOVE the bar, both visible.
- **History totals are compact.** The list's total is ONE card at the
  END of the list, after the last order (`HistoryTotalCard`), scrolling
  with it — never a fixed block above the bar. Row 1: Counter — the bill
  number (body1 700) · "3 rounds"; Table — "Table total" · "N orders",
  then the customer's own part (caption, text.secondary). Row 2 (above a
  1px divider): "Total amount" / "စုစုပေါင်း ကျသင့်ငွေ" on the left, the
  amount on the right in the price tone (`decor.price`, subtitle1 700,
  never wraps). The receipt's footer is ONE compact
  row at the bottom edge (+ safe area): the total on the left, Order more
  on the right. Receipt lines: name body1 600, add-ons "Group: Option"
  body2, qty body2, price body1 600.
- **Language card** (first visit on a device, NEXT_LOCALE not set yet;
  /menu, /cart, /history only, never the QR scan routes): a compact
  floating card at the bottom over the dimmed page — 12–16px from the
  sides and bottom (+ safe area), max 400px centred, radius × 2, soft
  shadow, × top-right (44px). Top: a 40px primary badge with the shop's
  initials (shop data), "ဘာသာစကား ရွေးပါ" (subtitle1 bold) and "Choose
  your language" (caption). Two radio rows (≥ 56px, 8px apart): a 36px
  tinted tile ("က" / "A"), the language in itself (body1 600) and its
  name in the other language (caption), a filled primary check on the
  selected row (2px primary edge), an empty circle otherwise —
  role="radiogroup" / "radio" + aria-checked, each label with its own
  lang. Tapping a row applies it and closes; ×, Escape or a tap outside
  keeps Myanmar — either way it never asks again. Footer: globe +
  "နောက်မှ ပြောင်းလို့ရပါတယ် · Change anytime". Fits 375×667 without
  scrolling; fades in with translateY(8px → 0), 220ms ease-out.
- **/menu starts with OrderPlaceHeader — a compact chip**, one ~48px row
  (ONE button): [32px icon tile][place, subtitle2 bold][short helper,
  caption, ellipsis][chevron]. Table (primary tile, "Table 5", "Orders go
  to this table"), Counter (primary tile, "Order #A024" — or "Counter"
  before a number; while waiting for approval a warning tint, warning
  border and a warning dot + "Waiting for the counter" — words, never
  colour alone), Online (neutral tile, DASHED border, transparent,
  "Online", "Scan a QR at the café to order"). Never the internal session
  id. Tapping it opens a details card BELOW it, over the content (it
  never pushes the search bar down); it closes on the chevron, a tap
  outside, Escape or a scroll; the chevron turns 180° (160ms ease-out).
  Only subtitle2 / body2 / caption on it.
- **Add-on group form** (the add-on group page and the menu form's
  "Connect Add-On Group" dialog share `components/addonForm/`): every
  name field carries a language tag in its start adornment ("EN" /
  "မြန်မာ" / "Price" — a tinted block, never a restyled input) and its
  own aria-label; the Options card shows "N of M have a Myanmar name".
  Options are stacked blocks below `md`, one grid row [EN | မြန်မာ |
  Extra price | ×] under column headers from `md`. The page (not the
  dialog) has a live, inert "Customer sees" preview — the customer's
  own add-on section under the customer theme, EN | မြန်မာ toggle,
  dotted names = no Myanmar name yet: a sticky right column from `lg`,
  after the Options card below `lg`.
- **Menu detail** (customer and staff New Order): from `sm` a
  **two-column dialog**, centred, sized from MUI's dialog box (never
  100vw): desktop (md+) min(880px, 100% − 64px) with columns 360px |
  1fr; tablet (sm–md) min(720px, 100% − 32px) with 280px | 1fr; height
  min 480px, max min(640px, 90dvh), both columns stretched; radius × 2.
  The close button (round, 40px on a 44px tap area, paper + divider
  edge) sits on the dialog's top-right corner; the right column's first
  block keeps clear of it. **The photo is never cropped** (sheet and
  dialog): `object-fit: contain` in its fixed box (4:3 in the dialog, the
  sheet's 160px band) on a faint alpha(text.primary, 0.04) tint
  (MenuThumb `fit="contain"`); menu cards keep `cover` (equal card
  heights). The name and the price sit 8–12px apart (sheet 8px, dialog
  12px). LEFT (background.default, never scrolls) —
  the photo in a 4:3 box (letter tile centred when none), then name
  (h5), description, price, "Your choice: …" (8px apart, 24px padding;
  extra height is plain space below); RIGHT (24px padding, no divider
  above the first group — only between groups and above the note) —
  add-on groups (title + "Choose 1" / "Choose any",
  a Required → ✓ Done / Optional chip) with the options as tiles (2
  columns once the column is ≥ 420px, one control per tile, selected =
  2px primary edge without a size change), the note, and a pinned
  footer: stepper · total (price tone) · the Add button with its usual
  label. The **phone sheet keeps its layout**. On both, while a required
  group is unanswered the Add button is disabled AND a warning-text
  line above it names them — "Please choose: Size, Spicy level"
  (role="status"); tapping it scrolls to (and focuses) the first one.
  The line keeps its space, so the button never jumps.
- **Dialog vs page:** a **dialog** for short tasks — about 1–3 fields,
  confirmations, and quick creates that must not lose the form behind
  them (e.g. "New category" from the menu form). A **page** for long
  forms (menu, add-on group) and anything that needs its own URL.

## 19. Safe areas (iOS / PWA)

Fixed bottom elements (bars, sheets, floating buttons) use:

```ts
pb: "calc(12px + env(safe-area-inset-bottom, 0px))"
```

Sticky/fixed top elements use `env(safe-area-inset-top, 0px)`.

Customer pages use `viewport-fit=cover` (the storefront layout's
`viewport`) — without it iOS reports every inset as 0 and bottom
elements end up under the home indicator; the body's side padding takes
the landscape notch (customer theme CssBaseline).

The customer bottom bar floats at `calc(12px + env(safe-area-inset-bottom,
0px))`; pages under it reserve `BOTTOM_BAR_CLEARANCE` (bar + offset +
8px + safe area) instead of their own safe-area padding.

## 20. Perceived performance

- Reserve image space (fixed `aspectRatio`) to avoid layout shift.
- Lazy-load below-the-fold images.
- Prefetch the next page before the user reaches the end (Rule 23).

## 21. Confirm destructive actions only

Confirm what's hard to undo (Mark as paid, cancel a submitted order,
delete a menu item). Don't confirm cheap, reversible actions (quantity +/-,
toggling an add-on). Printing never blocks or changes payment.

**"Delete menu"** (the menu edit page — an outlined error-colour button
at the bottom, under a rule, away from Save) asks first: Delete
"<name>"? — "If this menu was never ordered, it is deleted for good. If
it was ordered before, it is hidden everywhere, but old orders, History
and Reports keep showing it." [Cancel] [Delete] (destructive, focus on
Cancel; both disabled while it runs; an error shows inside the dialog).
Then back to Menus with "Menu deleted" / "Menu hidden — kept for order
history". The edit form's English name field says "Change the name only
to fix a typo. A different item → create a new menu." beside its
character counter (old orders show the menu's current name).

**"New QR code"** (Backoffice table cards — every table and the Counter,
in the card's ⋯ menu) rotates the table's access key and renders a new
QR image: use it when a QR is misused or the shop's address / IP
changes. It asks first — "Make a new QR code for <name>? The old QR —
printed or photographed — stops working at once. Print and put up the
new one." [Cancel] [Make new QR] (destructive, focus on Cancel). Open
bills and table sessions are untouched; only new scans need the new QR.

## 22. Accessibility basics

- Icon-only buttons need `aria-label`; toggles use `aria-pressed`.
- Semantic components (`<Button>`, `CardActionArea`) instead of clickable
  `<div>`s.
- Decorative elements (timeline lines, overlays, affordance icons) get
  `aria-hidden`.
- **Visually hidden text** (screen readers only — live status regions,
  a label hidden on a narrow card) always uses the shared
  `visuallyHiddenSx` (`lib/theme/sharedThemeTokens.ts`), never a
  hand-written copy: in MUI `sx`, `width: 1` / `height: 1` mean 100%, not
  1px — a "1×1" hidden box became as wide as the screen and made phones
  and tablets zoom the whole Backoffice page out.
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
- The banner and the toast use the solid warning fill (`warning.main` +
  `warning.contrastText`) — the same colour as "Needs approval"
  everywhere.

## 26. Orders, bills, and money on screen

- Order List: "Needs approval" first (oldest-waiting first, with a
  countdown), then Tables and Counter sections (side by side on `md+`).
- Order detail: a timeline of rounds (pending first, then newest), no price
  column on round cards; money lives only in the Bill (accepted rounds only;
  pending rounds shown as "Waiting approval +X").
- **Add-on lines read "Group: Option"** everywhere a line is shown —
  "Temperature: Hot · Sweet: Low · Toppings: Pearl, Jelly" (one helper,
  `lib/order/addonLabel` formatAddonSelections): Backoffice round cards,
  bills and print (English), staff New Order, and the customer cart,
  table draft and History (both names localized). A bill's per-add-on
  row reads "+ Sweet: Low".
- **Customer menu detail:** each add-on group's title is subtitle1 / 600
  (bigger than its body2 option rows), chip on the right, 16px above a
  group and 8px below its title.
- Identical items in the same cart are shown as one line with a quantity;
  lines with different notes or prices stay separate.
- **The waiting panel is ONE tappable row** (`ApprovalWaitingPanel`, cart
  and table cart): a status icon (warning text shade) + the short status
  ("Waiting for the counter" / "Waiting for our staff") + the time left
  (or "Sent … ago" past a Table round's target) + a chevron. Tapping it
  opens the full explanation (title, order number, the countdown bar,
  the deadline, the hint) and Change / Cancel below it; tapping again
  closes it — aria-expanded / aria-controls, the chevron turns 180°
  (transform, 160ms ease-out), no height animation. Closed by default,
  so the ordered lines right under it stay on screen (all of 2–3 lines
  at 390×844).
- **While a round waits for approval** the customer can "Change order"
  (it comes back to the cart / the table's draft) or "Cancel order"
  (asks first; Table: for everyone at the table). Once the counter has
  decided, they're told to ask the staff.
- **Voided lines stay visible**, dimmed and struck through, with the
  words saying why (staff: "Voided · 12:20 · Aye · Wrong item", the note
  too; customers: "Removed by staff · Wrong item" only) — and are left
  out of every total, count and report. A partly voided line shows what's
  left ("2 × Latte (1 voided)"). Bill and printed bill show only what is
  payable — voided units are left out; the round card keeps them, struck
  through, for staff.

---

# Self-check before merging any UI change

- [ ] Touch targets ≥44px, ≥8px apart, no nested interactive elements
- [ ] Theme spacing, typography variants, palette roles only (tints via `alpha()`)
- [ ] Money not in red; state never color-only
- [ ] Loading, empty, and error states designed; controls stay visible when empty
- [ ] Feedback within ~100ms; disabled controls say why
- [ ] Tested at 375px (the page minimum) and at each breakpoint in use
- [ ] Fixed bottom/top elements respect safe-area insets
- [ ] Images reserve space; long lists follow Rule 23
- [ ] Destructive actions confirmed; trivial ones not
- [ ] Accessible names for icon buttons and badges; decorative items `aria-hidden`
- [ ] Animation self-check (Rule 9) passes

---

*Last synced 2026-10-22 (#106b): Reports → Items' view funnel line (Viewers · Ordered · Viewed, not ordered · Rate). Earlier (#105): the customer menu card's "Popular" badge (top-left, secondary, words only). Earlier (#103): New Order's Current order keeps to its content (capped at the viewport); Settings fluid up to 960px with 2-column forms from md. Earlier (#102): submit buttons lock on the first tap (useSubmitLock) and show busy / done labels (SubmitButton). Earlier (#101): the Backoffice Menus status chips. Earlier (#100): the Delete menu dialog and the rename hint. Earlier (#99): Myanmar fields show the same character counter as their English twins; Settings in the shared centred column; sold-out menus last in both menu grids. Earlier (#98): the Backoffice in Myanmar (#98) — the account menu's Language row (BO_LOCALE), the print voucher's EN | မြန်မာ, Myanmar Backoffice layout rules. Earlier (2026-10-19): reducedMotionMedia / reducedMotionQuery, the language switch label at every width (#97k); one 375px page minimum on <body> for both surfaces (#97j); visually hidden text only via visuallyHiddenSx (#97i); Backoffice height owner = the shell (100dvh, #97h); touch tablets (#97–#97g) — `touchTabletMedia`
(+ `touchScreenMedia` for phones too): smaller grid MINs (customer 212px,
max 3 × ≥ 150px in portrait (CSS px — an "800px" tablet is ~600px),
Backoffice Menus 170px), the Add-ons bottom sheet (drag to close, Edit
in its footer, bigger text on touch), the 16px page top on touch;
flexible auto-fill grids with one MIN per grid, compact cards (MenuCard
`compact`) and one filter row on touch tablets only, laptops / desktops
exactly as before; the collapsible sidebar rail on touch tablets;
New Order's one-row picker on landscape tablets;
only the search sticky on phones; New Order's bottom bar pinned to the
screen's edge below lg; the bottom bar on the outcome screens, the History total at the end in the price tone, and the
phone Reports header (Export beside the title, only the period row
sticky).
Earlier (2026-09-26): small-control transition exception, shared
`hoverCapableMedia`, global reduced-motion block, 8px spacing fix, explicit
Backoffice palette + derived tints, money-not-red rule, whole-card and
no-nesting rules, one-layout menu card and 2/3/4 grid, master-detail
breakpoints, safe-area pattern, list/pagination, shop-timezone dates, and
new-order alert rules.*
