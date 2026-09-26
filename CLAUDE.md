# Café Maw (NR Coffee Cake) — Project Rules for Claude Code

This file is the standing reference for how this codebase is organized
and why. Read this before making changes — it captures decisions made
deliberately, not accidents to "clean up."

@DESIGN.md covers what the user *sees and feels* (animation, UI/UX,
accessibility, responsive layout) — read it before any UI change. This
file covers code structure/architecture only.

---

## 1. Layered Architecture

```
Browser (Client Component)
    │
    ▼
action.ts  ("use server" — Controller layer)
    │  validates input (Zod), calls a Service, flattens the result
    ▼
services/*.ts  (Service layer — business logic, throws AppError)
    │
    ▼
Prisma (Database)
```

- **Controller (`action.ts`)**: thin. Validates with Zod, calls a
  Service function, converts the Result to a plain object for the
  client. No business logic, no direct Prisma calls, no orchestration
  logic beyond "validate → call Service → flatten."
- **Service (`services/*.ts`)**: owns business logic and Prisma calls.
  Throws `AppError` subclasses on failure. Never imports NextAuth types
  or other framework-specific types — a Service must not depend on a
  third-party library's type.
- **Framework callbacks** (e.g. NextAuth's `authorize()` in
  `authOptions.ts`) are a _different_ kind of server entry point, not a
  Server Action. They don't get `"use server"`, and they stay thin too
  (delegate to a Service method).

**Example violation to avoid**: business logic (e.g. QR code
generation/upload orchestration) living inside an `action.ts` file
instead of the matching domain Service. If you find business logic in
a Controller, move it to the Service that owns that domain's data.

## 2. "use server" vs Server Component — do not confuse these

- **"use server"** = directive for **Server Action functions** a
  Client Component can call directly.
- **Server Component** = the _default_ for any component/page/layout
  in the App Router. No directive needed. Add "use client" only when
  the file needs hooks, state, or event handlers.
- Never put "use server" at the top of a layout.tsx/page.tsx to
  "make it a Server Component" — invalid there, and not what the
  directive does.

## 3. Colocation over global folders

Server Actions live **next to the route that uses them**, not in one
global `actions/` folder (e.g. `app/backoffice/menus/action.ts`,
`app/(storefront)/counter/action.ts`). Shared helpers every `action.ts`
reuses go in `lib/actionHelper.ts` and `lib/actionResult.ts` — that's
DRY, not a colocation violation.

**`lib/actionHelper.ts` (not `actionHelpers.ts`) is canonical.** Check
this file exists before creating a new one — a duplicate
`actionHelpers.ts` was mistakenly created once already. The pipeline:
`validateWith(schema, input) → .asyncAndThen(toSafeResult(serviceFn))
→ toActionResult(result)`.

## 4. Static method binding — call via ClassName.method(), never this.method()

```typescript
// Breaks when the method is detached, e.g. toSafeResult(AppService.someMethod)
static async registerUser(input) {
  const user = await this.getUserByEmail(input.email); // `this` is undefined once detached
}

// Always works
static async registerUser(input) {
  const user = await AppService.getUserByEmail(input.email);
}
```

`toSafeResult(AppService.someMethod)` detaches the method from its
class context — any internal `this.x()` call then crashes.

## 5. Zod (boundary) + neverthrow (internal flow)

- **Zod** validates the _shape_ of data crossing the client-to-server
  boundary. Lives at the start of an `action.ts` function.
- **neverthrow** (ok/err/ResultAsync/.andThen/.match) replaces
  try/catch for business-logic failures in the Controller-to-Service
  chain. A Service method still throws; toSafeResult() converts
  that throw into a Result at the Controller boundary.
- A raw Result can never cross the Server Action to Client Component
  boundary — always flatten with toActionResult() first.
- Decided **against** hand-rolled Either and against a MayBe
  monad — neverthrow for the former, native `T | null` + `?.` for the
  latter (TypeScript already solves what MayBe solves).

## 6. Error classes (lib/errors.ts)

- `AppError` — base class (.message + .code). Anything that's an
  AppError is safe to show the client.
- `NotFoundError`, `ValidationError` — subclasses with a consistent,
  contextual message.
- Anything NOT an AppError (Prisma errors, bugs) logs server-side
  in full; client sees a generic "Something went wrong" message.
- **null vs throw** inside a Service method:
  - **Optional lookup** (absence is normal, e.g. a menu's stock at a
    location it's never been stocked at) returns null / gets filtered
    out, and does not throw.
  - **Chain lookup** (absence makes the rest of the operation
    impossible) throws NotFoundError — fail fast rather
    than making every caller null-check.

## 7. Transactions — when $transaction is required

Ask: "If this operation fails halfway through, would the database be
left in a broken/inconsistent state?"

- **Yes** — wrap in `prisma.$transaction(async (tx) => {...})`.
  Example: creating a Menu plus its category links plus its initial
  MenuStock row — a Menu with no category, or no stock row at all, is
  a broken state.
- **No** (a single independent write) — plain prisma.x.create()/
  .update().
- **Image/file uploads are deliberately NOT part of a DB transaction**
  even when they conceptually belong with a create/update — an
  object-store PUT can't be rolled back by a DB transaction, and the
  object key often needs an ID (e.g. menuId) that doesn't exist until
  after the DB row is created. Sequence: DB write, then external
  upload, then a second separate DB write to store the resulting URL.

## 8. Naming — follow library/framework conventions, don't fight them

`tx` (Prisma transaction client) and `prisma` (client instance) are
official Prisma convention, not invented abbreviations — keep them.
Apply Clean Code naming rules (full words, no invented abbreviations)
to our own variables/functions, not established library idioms.

## 9. Auth-specific gotchas

- **Google OAuth's user.id is Google's own account ID, not our
  Prisma User.id.** Never look anything up by user.id from a
  NextAuth callback. Always resolve via email (works identically for
  Google and Credentials).
- Session cookie creation is internal to NextAuth — a custom Server
  Action cannot establish a session. A custom flow (e.g. registration)
  that needs the user logged in afterward must still call the
  client-side signIn().
- authorize() should be thin: Zod-validate the credentials shape,
  delegate to a Service method.
- Cache session-derived lookups (companyId, userId, role) in the
  JWT during the jwt callback — see lib/session.ts's
  getSessionContext(), the single place that reads
  companyId/userId/role from the session. Use it instead of
  repeating getServerSession(authOptions) plus manual field
  extraction in every page/action.
- The jwt callback runs identically for both the Credentials and
  Google OAuth sign-up paths (same user.email shape either way) — a
  fix made there covers both without a provider check.
- `src/app/backoffice/layout.tsx` is an allowed exception that calls
  getServerSession directly instead of getSessionContext() — it needs
  the session's email to load the company and redirect unauthenticated
  users, and getSessionContext() doesn't return email.

## 10. Theming — no hardcoded hex colors, no hardcoded breakpoint objects

- **Two separate themes**: getBoTheme() (Backoffice, theme.ts) and
  getOdTheme() (Order-app/customer-facing, odTheme.ts). Shared font
  family, typography scale, and shape live in sharedThemeTokens.ts —
  a font change only ever happens in one place.
- **Which theme a component should use is decided by audience, not
  folder path.** "Customer-facing" means anything under
  (storefront)/, anything under components/orderUI/, AND any other
  component serving the customer-facing order flow even outside those
  folders (the clearest signal is an "Od"-prefixed name, e.g.
  OdMenuCard.tsx — trace actual usage, don't assume by directory).
  Backoffice-only code uses getBoTheme().
- Components read colors via MUI's useTheme() / the sx callback's
  theme argument — never a literal hex string, and never
  var(--color-brand-\*) CSS custom properties from globals.css.
  globals.css's @theme block is for Tailwind utility use only, not
  a second source of truth for brand colors — if a component needs a
  brand color, it comes from the MUI theme.
- **Responsive typography**: MUI's typography variant object does
  not reliably resolve raw "@media (...)" keys written directly
  inside it — that's not a documented/guaranteed pattern. The correct
  approach: build the theme once with base (mobile) typography values,
  then call createTheme(baseTheme, { typography: { ... } }) a second
  time using baseTheme.breakpoints.up("sm"/"md") as computed object
  keys for the responsive overrides. See theme.ts's two-pass
  getBoTheme() for the working pattern — copy it, don't reintroduce
  the single-pass version.
- Non-Typography components that need a font size matching a
  Typography variant (e.g. a Chip, which has no variant prop for
  typography) get it by wrapping the label in
  `<Typography variant="..." component="span">`, not by duplicating
  the size in sx.
- A few form-specific input/button sizes don't map to any Typography
  variant (label font size, button min-height, image-action-button
  sizing) — **planned pattern, not yet built**: no formTokens.ts exists
  in src/ as of now. The intended design is a theme.formTokens custom
  `declare module "@mui/material/styles"` augmentation in
  formTokens.ts, read via `sx={(theme) => ({ fontSize:
theme.formTokens.xxx })}`. Until it lands, these sizes are set ad hoc
  in each component's own sx.

## 11. Standing instruction for Claude

Before adding a new library, pattern, or tool to this project, give
advice first (trade-offs, simpler alternatives) — don't write the
implementation until there's explicit go-ahead, unless the person
has already explicitly asked for the code in that message.

Apply the same "advice first" instinct to naming/architecture
decisions with real trade-offs (e.g. "should Location deletion be soft
or hard delete") — lay out the options before picking one.

## 12. File-storage abstraction

Image uploads (menu photos, etc.) go through a swappable
FileStorageService interface (lib/storage/FileStorageService.ts).
Current implementation: S3CompatibleStorageService, targeting a local
MinIO instance for offline/dev use — chosen specifically because MinIO,
AWS S3, and DigitalOcean Spaces all speak the same S3 API, so moving to
a real cloud provider later is a config change (.env's
MINIO_ENDPOINT/keys), not a code change. All config values are read
through the centralized config object in utils/config/index.tsx —
never process.env.X directly in a Service or component; add new env
vars to the Config interface and object there first.

Two exceptions read `process.env` directly, outside that object:
`process.env.NODE_ENV` checks (e.g. cookie `secure` flags), and
`src/app/utils/prisma.ts` (the Prisma client bootstrap runs before/
independently of the app config). Everything else still goes through
`utils/config`.

## 13. Known project gaps / TODOs

- Login rate limiting / account lockout.
- Forgot-password flow.
- Order-app closure enforcement: when a Location is archived, the
  customer-facing order flow should show "We are closed" and block new
  orders server-side (check location.isArchived in the order-creation
  Server Action, not just hide UI client-side) — not yet wired up.
- Menu hard-delete (soft-delete via isArchived exists; permanent
  delete with a grace period, mirroring Location's 60-day countdown,
  is not yet built).

## 14. Service imports — always via the barrel file, never the concrete path

```typescript
// Correct — barrel file, one stable address
import { MenuService, LocationService } from "@/app/services";

// Wrong — concrete file path, breaks on every future split
import { MenuService } from "@/app/services/menu.service";
```

**Why**: when a Service file later gets split, only services/index.ts
needs a one-line change. Every action.ts importing from
@/app/services keeps working untouched.

This applies only to **Services** (shared business logic). It does not
apply to Rule 3's colocation guidance for action.ts files.

**When to split a Service file — use "reason to change" (SRP), not a
method-count threshold.** A method count (8-10 was used as a rough
early signal) is a symptom, not the actual test. The real question:
"Does this group of methods only ever change together, for one
business reason?"

- Methods that share one reason to change stay together **even if
  that makes the file large** — e.g. all of a company's onboarding/
  default-setup bootstrap logic (createDefaultSetup and its private
  createDefault\* helpers) stays in app.service.ts as one cohesive
  unit, regardless of method count, because "the sign-up flow changed"
  is the only thing that ever touches it.
- Methods with **distinct, unrelated reasons to change** get split out
  **even if there are only two or three of them** — e.g.
  setSelectedLocation/getSelectedLocation (a User's active-location
  pointer — Location-domain data) and getDisabledLocationMenus (menu
  visibility — a different concern) don't belong in the same file just
  because both mention "location."
- "Frequently called together in one workflow" is **not** a reason to
  put two Services' logic in the same file — that's what the
  Controller (action.ts) is for: it orchestrates calls across
  multiple Services in one workflow. The barrel file already gives
  callers single-import convenience, so there's no usability cost
  to keeping Services split by domain.
- Before adding a new method to an existing Service, check whether an
  equivalent already exists in another Service file first (e.g.
  table.service.ts before adding a Table-related method to
  app.service.ts) — duplicate logic across two files has happened
  before in this project and is a correctness risk, not just
  untidiness.

## Coding conventions to just follow, not re-litigate

- Filenames: PascalCase for components (MenuCategoryCard.tsx), no
  spaces, no invented abbreviation-style prefixes for new files (avoid
  new Bo-/Od-prefixed names going forward — prefer a clear full word,
  or put the file in a folder that already signals the surface).
  Existing Od-/Bo-prefixed files keep their names; for new files, the
  surface is signaled by folder (e.g. `components/orderUI/`) instead
  of a prefix.
- No file should have a trailing space or other stray whitespace in its
  name — this has caused a real fragile-import bug once already.
- Don't leave empty/dead scratch files in the repo — delete them once
  done, don't commit them.
- Before creating a new file with the same apparent purpose as an
  existing one (e.g. a second polling hook), search for an existing
  implementation first — a duplicate hook with two different
  implementations existed in this project until it was caught.
