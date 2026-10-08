import { cookies } from "next/headers";
import { CONTRIBUTOR_TOKEN_COOKIE } from "./orderSessionCookie";

export type ContributorTokenMap = Record<string, string>;

/** Cap on how many different tables' tokens one browser's cookie
 *  keeps at once — trimmed oldest-first so a customer who's visited
 *  many tables over time (different days, different tables at the
 *  same restaurant) can't grow this cookie unbounded. Large enough
 *  that no real customer hits it in normal use. Exported so the QR
 *  scan Route Handler (table/route.ts) trims the same way — it can't
 *  reuse the functions below directly (see their own comments on why
 *  Route Handlers here use NextResponse.cookies instead of
 *  next/headers's cookies()), but the trim RULE must still match. */
export const MAX_TABLES_REMEMBERED = 20;

/** Exported so table/route.ts can parse the incoming request cookie
 *  the same way — kept as the one parsing implementation either
 *  context calls into, rather than two copies that could drift. */
export function parseContributorTokenMap(
  raw: string | undefined,
): ContributorTokenMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Read-only lookup — used from Server Actions/Server Components,
 *  anywhere a MISSING token should be treated as "this browser was
 *  never let into this table's draft" rather than silently minting
 *  one. Only the QR scan Route Handler (table/route.ts, after its own
 *  key check) is allowed to mint a fresh token — so a client can't
 *  just invent a tableId it was never scanned into. That handler
 *  reads/writes the cookie itself via request.cookies/response.cookies
 *  (see its own comment for why), not this function, so there's no
 *  risk of minting happening from the wrong place.
 *
 * NOTE: a token returned here being present doesn't by itself mean
 * it's still CURRENT — see getTokenEpoch below and
 * Table.contributorEpoch's own comment. Every call site that acts on
 * a token (not just checks whether one exists) also needs to compare
 * its epoch against the table's current one — see
 * TableDraftService.isTokenCurrentForTable. */
export async function getContributorToken(tableId: number) {
  const store = await cookies();
  const map = parseContributorTokenMap(
    store.get(CONTRIBUTOR_TOKEN_COOKIE)?.value,
  );
  return map[String(tableId)] ?? null;
}

/** Embeds the table's epoch at mint time (format: "<epoch>:<uuid>") —
 *  see Table.contributorEpoch's own comment for why. Exported so
 *  table/route.ts (which can't reuse the cookie read/write helpers
 *  above — see their own comments) still mints in this exact shape;
 *  getTokenEpoch below is the one place that has to agree with it. */
export function mintContributorToken(epoch: number) {
  return `${epoch}:${crypto.randomUUID()}`;
}

/** The other half of mintContributorToken — pulled out into its own
 *  function (rather than inlined at each of the few call sites that
 *  need it) so the "<epoch>:<uuid>" format is parsed in exactly one
 *  place. Returns null for anything that doesn't look like a token
 *  this app minted (missing colon, non-numeric epoch) — treated the
 *  same as "stale" by every caller, since there's no valid epoch to
 *  compare against either way. */
export function getTokenEpoch(rawToken: string): number | null {
  const [epochPart] = rawToken.split(":");
  if (epochPart === undefined) return null;
  const epoch = Number(epochPart);
  return Number.isInteger(epoch) ? epoch : null;
}
