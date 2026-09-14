@AGENTS.md

# Café Maw — Project Rules & Conventions Reference

Carry this into new chats so Claude keeps following the same architecture. Based on Turing Advanced SE Batch 7 principles (Clean Code, OOP, Design Patterns, Functional Programming, TDD) applied to a real Next.js + Prisma + NextAuth project.

---

## 1. Layered Architecture

```
Browser (Client Component)
    │
    ▼
action.ts  ("use server" — Controller layer)
    │  validates input, calls Service, flattens result
    ▼
services/*.ts  (Service layer — business logic, throws AppError)
    │
    ▼
Prisma (Database)
```

- **Controller (`action.ts`)**: thin. Validates with Zod, calls a Service function, converts the Result to a plain object for the client. No business logic, no direct Prisma calls.
- **Service (`services/*.ts`)**: owns business logic and Prisma calls. Throws `AppError` subclasses on failure. Never imports NextAuth types or other framework-specific types (Boundaries — Service layer must not depend on a third-party library's type).
- **Framework callbacks** (e.g. NextAuth's `authorize()` in `authOptions.ts`) are a _different_ kind of server entry point — not a Server Action. They don't get `"use server"`, and they must stay thin too (delegate the real logic to a Service method).

## 2. `"use server"` vs Server Component — do not confuse these

- **`"use server"`** = directive for marking **Server Action functions** that a Client Component can call directly (e.g. `export async function createMenuAction(...)`).
- **Server Component** = the _default_ for any component/page/layout in the App Router. No directive needed. Only add `"use client"` when the file needs hooks, state, or event handlers.
- Never put `"use server"` at the top of a `layout.tsx`/`page.tsx` file to "make it a Server Component" — that's not what the directive does, and it's invalid there.

## 3. Colocation over global folders

Server Actions live **next to the route that uses them**, not in one global `actions/` folder:

```
app/backoffice/menus/action.ts   ← used by menus/page.tsx and menus/[id]/page.tsx
app/auth/signUp/action.ts        ← used by signUp/page.tsx
app/backoffice/action.ts         ← backoffice-wide concerns (e.g. location switching)
```

Shared helpers that every `action.ts` reuses (validation → safe-call → flatten pipeline) go in `lib/actionHelpers.ts` — that's DRY, not a violation of colocation.

## 4. Static method binding rule — critical, recurring bug source

**Always call other methods in a service class via `ClassName.method()`, never `this.method()`.**

```typescript
// ❌ Breaks when the method is passed by reference, e.g. toSafeResult(AppService.registerUser)
static async registerUser(input) {
  const user = await this.getUserByEmail(input.email); // `this` is undefined once detached
}

// ✅ Always works, regardless of how the function is called later
static async registerUser(input) {
  const user = await AppService.getUserByEmail(input.email);
}
```

Reason: `toSafeResult(AppService.someMethod)` detaches the method from its class context. Any internal `this.x()` call inside that method then crashes (`Cannot read properties of undefined`). This bit `registerUser`, `getMenus`, `getAddonCategories`, `getTables`, and `getOrderAppMenuCategories` — all fixed by search-and-replacing `this.` → `AppService.`.

## 5. Zod (boundary) + neverthrow (internal flow) — different jobs, both needed

- **Zod** validates the _shape_ of data crossing a boundary (client → server). Lives at the very start of an `action.ts` function or a NextAuth `authorize()` callback.
- **neverthrow** (`ok`/`err`/`ResultAsync`/`.andThen`/`.match`) replaces try/catch for _business logic_ failures inside the Controller→Service call chain. A Service method still `throw`s (that's normal OOP); `toSafeResult()` converts that throw into a `Result` at the Controller boundary.
- Pipeline: `validateWith(schema, input) → .asyncAndThen(safeServiceCall) → toActionResult(result)`.
- A raw `Result`/`Either` can never cross the Server Action → Client Component boundary (it has methods on it, not serializable) — always flatten with `.match()`/`toActionResult()` before returning.
- We evaluated hand-rolling `Either`/`Left`/`Right` (good for learning FP concepts) vs the `neverthrow` library (better for production — proper generics, `ResultAsync`, less to maintain). **Decision: use `neverthrow` in this project.**
- We evaluated a `MayBe` monad for optional lookups and decided **against** it — TypeScript's native `T | null` + optional chaining (`?.`) already solves what `MayBe` solves. `MayBe` earns its keep in languages without built-in null-checking (Java, Haskell); not needed here.

## 6. Error classes (`lib/errors.ts`)

- `AppError` — base class, has `.message` + `.code`. Anything that's an `AppError` is _safe to show the client_.
- `NotFoundError`, `ValidationError` — subclasses with a consistent, contextual message (`"${entity} not found (id: ${id})"`).
- Anything NOT an `AppError` (Prisma errors, network errors, bugs) → logged server-side in full, client only sees a generic `"Something went wrong"` message. This is "Define Exception Classes in Terms of a Caller's Needs" from the Clean Code notes.
- Rule for `null` vs `throw` inside a Service method:
  - **Optional lookup** (absence is a normal state, e.g. `getUserByEmail`) → return `null`.
  - **Chain lookup** (absence makes the rest of the operation impossible, e.g. `getCompanyByTableId`) → `throw new NotFoundError(...)` (fail fast, avoid repeated null-checks by every caller).

## 7. Transactions — when `$transaction` is required

Ask: _"If this operation fails halfway through, would the database be left in a broken/inconsistent state?"_

- **Yes** → wrap in `prisma.$transaction(async (tx) => {...})`. Example: creating a Menu + its category links — a Menu with no category is a broken state.
- **No** (a single independent write) → plain `prisma.x.create()`/`.update()`. Wrapping a single write in a transaction adds needless overhead.

## 8. Naming — follow library/framework conventions, don't fight them

- `tx` (Prisma transaction client) and `prisma` (client instance) are **official Prisma convention**, not abbreviations we invented. Keep them — matching the wider Prisma ecosystem's naming makes code more readable to any Prisma-experienced developer, not less.
- Apply Clean Code naming rules (full words, no invented abbreviations) to _our own_ variables/functions — not to established library idioms.

## 10. Theming — no hardcoded hex colors in components

- All color tokens live in **one file**: `lib/theme/theme.ts` (`getTheme(mode)` returns a light/dark MUI theme built from the design's palette table).
- Components use theme-relative `sx` values (`"primary.main"`, `"background.paper"`, `"divider"`, `"text.primary"`) — never a literal hex string.
- `ThemeModeProvider` (Context + `ThemeProvider` + `CssBaseline`) wraps the whole app inside the existing `Providers.tsx`, not inside a single feature folder.
